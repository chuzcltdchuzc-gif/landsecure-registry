/**
 * Spatial Validation Engine — Priority 2
 * Validates GeoJSON polygon integrity and detects conflicts between parcels.
 */

/** Degrees to radians */
const toRad = (d) => (d * Math.PI) / 180;

/** Haversine distance in meters between two [lat, lng] points */
export function haversineDistance([lat1, lng1], [lat2, lng2]) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Shoelace formula — returns signed area in sq-degrees.
 * Multiply by ~(111320^2 * cos(lat)) for approx sq-meters.
 */
export function polygonSignedArea(coords) {
  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

/** Area in square meters using mid-latitude scaling */
export function polygonAreaSqm(coords) {
  const lats = coords.map(([, lat]) => lat);
  const midLat = lats.reduce((s, l) => s + l, 0) / lats.length;
  const metersPerDegLng = 111320 * Math.cos(toRad(midLat));
  const metersPerDegLat = 111320;
  const scaled = coords.map(([lng, lat]) => [lng * metersPerDegLng, lat * metersPerDegLat]);
  return Math.abs(polygonSignedArea(scaled));
}

/** Perimeter in meters — sum of segment haversine distances (lng, lat format from GeoJSON) */
export function polygonPerimeterMeters(coords) {
  let perim = 0;
  for (let i = 0; i < coords.length; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[(i + 1) % coords.length];
    perim += haversineDistance([lat1, lng1], [lat2, lng2]);
  }
  return perim;
}

/** Check for self-intersection using brute-force segment pair check */
export function hasSelfIntersection(coords) {
  const n = coords.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 2; j < n - 1; j++) {
      if (i === 0 && j === n - 2) continue; // adjacent closing
      if (segmentsIntersect(coords[i], coords[i + 1], coords[j], coords[j + 1])) return true;
    }
  }
  return false;
}

function ccw(A, B, C) {
  return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0]);
}
function segmentsIntersect(A, B, C, D) {
  return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
}

/** Point-in-polygon (ray casting, coords in [lng, lat]) */
export function pointInPolygon([px, py], coords) {
  let inside = false;
  const n = coords.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = coords[i];
    const [xj, yj] = coords[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Parse GeoJSON string safely; returns null on error */
export function parseGeoJSON(str) {
  if (!str) return null;
  try {
    const g = typeof str === "string" ? JSON.parse(str) : str;
    // Accept Feature, FeatureCollection or raw Polygon
    if (g.type === "Polygon") return g;
    if (g.type === "Feature" && g.geometry?.type === "Polygon") return g.geometry;
    if (g.type === "FeatureCollection") {
      const f = g.features?.find((f) => f.geometry?.type === "Polygon");
      return f ? f.geometry : null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Extract outer ring coordinates [[lng,lat], ...] */
export function outerRing(geojsonPolygon) {
  return geojsonPolygon?.coordinates?.[0] ?? [];
}

/**
 * Full spatial validation against a list of other parcels.
 * Returns { status, issues: string[] }
 */
export function validateParcel(parcel, allParcels) {
  const issues = [];

  const geom = parseGeoJSON(parcel.parcel_boundary);

  // 1. Invalid / missing geometry
  if (!geom) {
    // If no polygon, only warn — don't hard-block; centroid parcel still valid
    return { status: "not_validated", issues: [] };
  }

  const ring = outerRing(geom);

  // 2. Minimum vertices
  if (ring.length < 4) {
    issues.push("Polygon has fewer than 3 vertices");
  }

  // 3. Invalid coordinates
  for (const [lng, lat] of ring) {
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      issues.push(`Invalid coordinate: [${lng}, ${lat}]`);
    }
  }

  // 4. Self-intersection
  if (ring.length >= 4 && hasSelfIntersection(ring)) {
    issues.push("Polygon has self-intersecting edges");
  }

  // 5. Overlap / containment against other parcels
  const others = allParcels.filter((p) => p.id !== parcel.id && p.parcel_boundary);
  let overlapCount = 0;
  let duplicateFound = false;

  for (const other of others) {
    const otherGeom = parseGeoJSON(other.parcel_boundary);
    if (!otherGeom) continue;
    const otherRing = outerRing(otherGeom);
    if (otherRing.length < 3) continue;

    // Duplicate geometry check — compare centroids and area within 1%
    const areaA = polygonAreaSqm(ring);
    const areaB = polygonAreaSqm(otherRing);
    if (areaA > 0 && Math.abs(areaA - areaB) / areaA < 0.01) {
      // Check centroid proximity < 10m
      const cA = centroid(ring);
      const cB = centroid(otherRing);
      if (haversineDistance([cA[1], cA[0]], [cB[1], cB[0]]) < 10) {
        issues.push(`Duplicate geometry detected — matches parcel ${other.parcel_number}`);
        duplicateFound = true;
      }
    }

    // Sample overlap: check if any vertex of A is inside B or vice-versa
    const sampleA = ring.slice(0, Math.min(ring.length, 6));
    const overlapVertices = sampleA.filter((pt) => pointInPolygon(pt, otherRing));
    if (overlapVertices.length > 0) {
      overlapCount++;
      issues.push(`Overlaps with parcel ${other.parcel_number}`);
    }

    // Containment: centroid of this parcel inside other
    const cA = centroid(ring);
    if (pointInPolygon(cA, otherRing)) {
      issues.push(`Parcel centroid is fully contained within ${other.parcel_number}`);
    }
  }

  // Determine status
  if (issues.length === 0) return { status: "valid", issues: [] };
  if (duplicateFound) return { status: "duplicate_warning", issues };
  if (overlapCount > 0) return { status: "overlap_warning", issues };
  const hasGeomError = issues.some((i) =>
    i.includes("Invalid coordinate") || i.includes("self-intersect") || i.includes("fewer than")
  );
  return { status: hasGeomError ? "invalid_geometry" : "conflict_blocked", issues };
}

function centroid(coords) {
  const n = coords.length;
  const sum = coords.reduce(([sx, sy], [x, y]) => [sx + x, sy + y], [0, 0]);
  return [sum[0] / n, sum[1] / n];
}