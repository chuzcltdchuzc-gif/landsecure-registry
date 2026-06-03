/**
 * tenantContext — Multi-tenant query scoping utilities.
 *
 * Usage:
 *   import { getTenantId, scopeQuery, PILOT_TENANT } from '@/lib/tenantContext';
 *
 * The current pilot uses tenant_id = 'EHM-001' (Ehime Mbano Local Government).
 * For multi-LGA rollout, tenant_id is derived from the authenticated user's
 * assigned LGA or from the URL subdomain/path.
 *
 * Environment detection:
 *   - hostname contains 'localhost' or '127.0.0.1' → development
 *   - hostname contains 'staging' → staging
 *   - otherwise → production
 */

export const PILOT_TENANT = 'EHM-001';

export const ENV = (() => {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) return 'development';
  if (host.includes('staging')) return 'staging';
  return 'production';
})();

/**
 * Returns the tenant_id for the current user.
 * Falls back to PILOT_TENANT for the Ehime Mbano LGA pilot.
 * In a multi-LGA deployment, this reads from user.tenant_id.
 */
export function getTenantId(user) {
  if (!user) return PILOT_TENANT;
  // If user has an explicit tenant_id attribute, use it
  if (user.tenant_id) return user.tenant_id;
  // Derive from LGA assignment if present
  if (user.lga_code) return user.lga_code;
  // Pilot default
  return PILOT_TENANT;
}

/**
 * Adds tenant_id scoping to an entity filter object.
 * Use this when calling base44.entities.X.filter({...}) to ensure
 * cross-tenant data cannot be accessed.
 *
 * @param {object} filters - Existing filter object
 * @param {string} tenantId - Tenant ID to scope to
 * @returns {object} Filter with tenant_id added
 */
export function scopeQuery(filters = {}, tenantId) {
  if (!tenantId) return filters;
  return { ...filters, tenant_id: tenantId };
}

/**
 * Returns default create payload fields that should be set on every entity.
 * Ensures tenant_id is always stamped on new records.
 */
export function tenantDefaults(user) {
  return {
    tenant_id: getTenantId(user),
  };
}

/**
 * Validates that a record belongs to the expected tenant.
 * Use in backend functions to prevent cross-tenant access.
 */
export function assertTenantAccess(record, expectedTenantId) {
  if (!record) throw new Error('Record not found');
  // Super admins can access any tenant
  // For regular access: enforce tenant match
  if (record.tenant_id && record.tenant_id !== expectedTenantId) {
    throw new Error(`Cross-tenant access denied: record belongs to tenant ${record.tenant_id}`);
  }
}

/**
 * Environment-specific configuration values.
 */
export const ENV_CONFIG = {
  development: {
    apiBaseUrl: 'http://localhost:5173',
    debugLogging: true,
    cacheStaleTime: 30_000,         // 30s — fast refresh in dev
    rateLimitEnabled: false,         // relaxed in dev
  },
  staging: {
    apiBaseUrl: 'https://staging.landsecure.gov.ng',
    debugLogging: true,
    cacheStaleTime: 2 * 60_000,     // 2 min
    rateLimitEnabled: true,
  },
  production: {
    apiBaseUrl: 'https://landsecure.gov.ng',
    debugLogging: false,
    cacheStaleTime: 5 * 60_000,     // 5 min
    rateLimitEnabled: true,
  },
};

export const currentEnvConfig = ENV_CONFIG[ENV] || ENV_CONFIG.production;