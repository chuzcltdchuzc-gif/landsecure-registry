/**
 * asyncGISValidation — Validates parcel boundary geometry for a given parcel.
 * Triggered by entity automation on LandParcel create/update when parcel_boundary changes.
 * Updates spatial_validation_status and spatial_conflict_notes on the parcel.
 *
 * Payload: { parcel_id: string } OR automation entity payload
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function parsePolygon(raw) {
  try {
    const geo = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!geo) return null;
    const coords = geo.type === 'Polygon' ? geo.coordinates?.[0]
      : geo.type === 'Feature' ? geo.geometry?.coordinates?.[0]
      : null;
    return coords?.length >= 3 ? coords : null;
  } catch { return null; }
}

function isClosed(coords) {
  if (!coords || coords.length < 4) return false;
  const f = coords[0], l = coords[coords.length - 1];
  return Math.abs(f[0] - l[0]) < 1e-9 && Math.abs(f[1] - l[1]) < 1e-9;
}

function hasInvalidCoords(coords) {
  return coords.some(([lng, lat]) =>
    isNaN(lng) || isNaN(lat) || Math.abs(lat) > 90 || Math.abs(lng) > 180
  );
}

function polyBounds(coords) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  coords.forEach(([x, y]) => {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  });
  return { minX, maxX, minY, maxY };
}

function boundsOverlap(a, b) {
  return !(a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Auth: allow automation (no session) or admin roles
    let user = null;
    try { user = await base44.auth.me(); } catch { /* automation context */ }
    if (user && !['super_admin', 'surveyor_general', 'compliance_officer', 'surveyor'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Support: direct call with parcel_id, OR automation entity payload
    const parcelId = body.parcel_id || body.event?.entity_id || body.data?.id;

    if (!parcelId) {
      return Response.json({ error: 'parcel_id required' }, { status: 400 });
    }

    // Fetch the target parcel
    const parcels = await base44.asServiceRole.entities.LandParcel.filter({ id: parcelId });
    if (!parcels.length) {
      return Response.json({ error: 'Parcel not found' }, { status: 404 });
    }

    const parcel = parcels[0];

    if (!parcel.parcel_boundary || parcel.parcel_boundary === 'null') {
      // No boundary to validate — set status to not_validated
      await base44.asServiceRole.entities.LandParcel.update(parcelId, {
        spatial_validation_status: 'not_validated',
        spatial_conflict_notes: 'No boundary data submitted.',
      });
      return Response.json({ status: 'not_validated', parcel_id: parcelId });
    }

    const coords = parsePolygon(parcel.parcel_boundary);
    const issues = [];

    if (!coords) {
      await base44.asServiceRole.entities.LandParcel.update(parcelId, {
        spatial_validation_status: 'invalid_geometry',
        spatial_conflict_notes: 'Boundary could not be parsed as valid GeoJSON Polygon.',
      });
      return Response.json({ status: 'invalid_geometry', parcel_id: parcelId });
    }

    if (hasInvalidCoords(coords)) {
      issues.push('Coordinates contain values outside valid lat/lng range.');
    }

    if (!isClosed(coords)) {
      issues.push('Polygon ring is not closed (first vertex ≠ last vertex).');
    }

    if (issues.length > 0) {
      await base44.asServiceRole.entities.LandParcel.update(parcelId, {
        spatial_validation_status: 'invalid_geometry',
        spatial_conflict_notes: issues.join(' '),
      });
      return Response.json({ status: 'invalid_geometry', issues, parcel_id: parcelId });
    }

    // Check for overlaps with other parcels using bounding box
    const allParcels = await base44.asServiceRole.entities.LandParcel.filter({
      spatial_validation_status: 'valid',
    }, '-created_date', 500);

    const targetBounds = polyBounds(coords);
    const conflicts = [];

    for (const other of allParcels) {
      if (other.id === parcelId) continue;
      if (!other.parcel_boundary) continue;
      const otherCoords = parsePolygon(other.parcel_boundary);
      if (!otherCoords) continue;
      const otherBounds = polyBounds(otherCoords);
      if (boundsOverlap(targetBounds, otherBounds)) {
        conflicts.push(other.parcel_number);
        if (conflicts.length >= 5) break;
      }
    }

    // Check for duplicate parcel number
    const dupCheck = await base44.asServiceRole.entities.LandParcel.filter({
      parcel_number: parcel.parcel_number,
    });
    const hasDuplicateNumber = dupCheck.filter(p => p.id !== parcelId).length > 0;

    let finalStatus = 'valid';
    let notes = '';

    if (hasDuplicateNumber) {
      finalStatus = 'duplicate_warning';
      notes = `Duplicate parcel number: ${parcel.parcel_number} exists in ${dupCheck.length - 1} other record(s).`;
    } else if (conflicts.length > 0) {
      finalStatus = conflicts.length >= 3 ? 'conflict_blocked' : 'overlap_warning';
      notes = `Bounding box overlap detected with: ${conflicts.join(', ')}.`;
    }

    await base44.asServiceRole.entities.LandParcel.update(parcelId, {
      spatial_validation_status: finalStatus,
      spatial_conflict_notes: notes || null,
    });

    return Response.json({
      status: finalStatus,
      parcel_id: parcelId,
      conflicts,
      duplicate_number: hasDuplicateNumber,
      notes,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});