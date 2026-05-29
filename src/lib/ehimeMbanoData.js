/**
 * Ehime Mbano LGA — Static reference data.
 * State: Imo | LGA: Ehime Mbano
 */

export const STATE_CODE = 'IMO';
export const LGA_CODE = 'EHM';
export const STATE_NAME = 'Imo State';
export const LGA_NAME = 'Ehime Mbano LGA';

export const WARDS = [
  { name: 'Umunachi', code: 'UMN' },
  { name: 'Umuekwuleala', code: 'UME' },
  { name: 'Okporo', code: 'OKP' },
  { name: 'Ohosu', code: 'OHS' },
  { name: 'Ehime', code: 'EHI' },
  { name: 'Nzerem/Igbo', code: 'NZI' },
  { name: 'Atta', code: 'ATT' },
  { name: 'Oguta', code: 'OGT' },
  { name: 'Isiala', code: 'ISL' },
  { name: 'Oke-Ovoro', code: 'OKO' },
];

export const PROPERTY_TYPES = [
  { code: 'RES', label: 'Residential' },
  { code: 'COM', label: 'Commercial' },
  { code: 'FRM', label: 'Farm / Agricultural' },
  { code: 'MKT', label: 'Market' },
  { code: 'SHP', label: 'Shop' },
  { code: 'STL', label: 'Stall' },
  { code: 'KSK', label: 'Kiosk' },
  { code: 'GOV', label: 'Government' },
  { code: 'INS', label: 'Institutional' },
];

export const PROPERTY_TYPE_LABELS = Object.fromEntries(
  PROPERTY_TYPES.map(p => [p.code, p.label])
);

export const WARD_MAP = Object.fromEntries(
  WARDS.map(w => [w.code, w.name])
);

export const OWNERSHIP_TYPES = [
  { value: 'individual', label: 'Individual Ownership' },
  { value: 'family', label: 'Family Ownership' },
  { value: 'community', label: 'Community Ownership' },
  { value: 'government', label: 'Government Ownership' },
];

export const ENCUMBRANCE_LABELS = {
  none: 'None',
  mortgage: 'Mortgage',
  dispute: 'Under Dispute',
  lien: 'Lien',
  court_order: 'Court Order',
};

export const STATUS_LABELS = {
  pending: 'Pending Review',
  approved: 'Registered',
  approved_locked: 'Registered (Locked)',
  rejected: 'Rejected',
  disputed: 'Under Dispute',
  transferred: 'Transferred',
  frozen: 'Frozen',
  archived: 'Archived',
};

export const VERIFICATION_LABELS = {
  unverified: 'Unverified',
  field_verified: 'Field Verified',
  survey_verified: 'Survey Verified',
  fully_verified: 'Fully Verified',
};

// Ehime Mbano geographic center for map default
export const LGA_CENTER = { lat: 5.7564, lng: 7.2786 };