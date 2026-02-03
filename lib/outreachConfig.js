// lib/outreachConfig.js
// Client-side constants for Outreach UI (modules, permissions, role templates).
// Keep in sync with backend outreach/constants.py

export const OUTREACH_MODULES = {
  vitals: { key: "vitals", label: "Vitals", description: "Record vitals & triage" },
  encounter: { key: "encounter", label: "Clinic / Encounter", description: "Document consultations" },
  lab: { key: "lab", label: "Lab", description: "Orders, catalog & results" },
  pharmacy: { key: "pharmacy", label: "Pharmacy", description: "Dispense log & drug catalog" },
  immunization: { key: "immunization", label: "Immunization", description: "Vaccinations & doses" },
  blood_donation: { key: "blood_donation", label: "Blood Donation", description: "Eligibility & outcomes" },
  counseling: { key: "counseling", label: "Counseling", description: "Counseling sessions (sensitive)" },
  maternal: { key: "maternal", label: "Maternal", description: "ANC screening & maternal notes" },
  referral: { key: "referral", label: "Referral", description: "Referrals & destinations" },
  surgicals: { key: "surgicals", label: "Surgicals", description: "Minor/major procedures & wound care" },
  eye_checks: { key: "eye_checks", label: "Eye checks", description: "Eye screening & findings" },
  dental_checks: { key: "dental_checks", label: "Dental checks", description: "Oral exam & dental procedures" },
};

export const OUTREACH_STATUS = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  CLOSED: "CLOSED",
};

// Permission keys
export const OUTREACH_PERMS = {
  // Patients
  PATIENTS_VIEW: "patients.view",
  PATIENTS_CREATE: "patients.create",
  PATIENTS_EDIT: "patients.edit",

  // Vitals
  VITALS_CREATE: "vitals.create",
  VITALS_EDIT: "vitals.edit",

  // Encounter
  ENCOUNTER_CREATE: "encounter.create",
  ENCOUNTER_EDIT: "encounter.edit",

  // Lab
  LAB_CATALOG_VIEW: "lab.catalog.view",
  LAB_CATALOG_MANAGE: "lab.catalog.manage",
  LAB_ORDER_CREATE: "lab.order.create",
  LAB_ORDER_EDIT: "lab.order.edit",
  LAB_RESULT_CREATE: "lab.result.create",
  LAB_RESULT_EDIT: "lab.result.edit",

  // Pharmacy
  PHARMACY_CATALOG_VIEW: "pharmacy.catalog.view",
  PHARMACY_CATALOG_MANAGE: "pharmacy.catalog.manage",
  PHARMACY_DISPENSE_CREATE: "pharmacy.dispense.create",
  PHARMACY_DISPENSE_EDIT: "pharmacy.dispense.edit",

  // Immunization
  IMMUNIZATION_CREATE: "immunization.create",
  IMMUNIZATION_EDIT: "immunization.edit",

  // Blood donation
  BLOOD_CREATE: "blood_donation.create",
  BLOOD_EDIT: "blood_donation.edit",

  // Counseling
  COUNSELING_CREATE: "counseling.create",
  COUNSELING_EDIT: "counseling.edit",
  COUNSELING_VIEW_SENSITIVE: "counseling.view_sensitive",

  // Maternal
  MATERNAL_CREATE: "maternal.create",
  MATERNAL_EDIT: "maternal.edit",

  // Referral
  REFERRAL_CREATE: "referral.create",
  REFERRAL_EDIT: "referral.edit",

  // Surgicals
  SURGICALS_CREATE: "surgicals.create",
  SURGICALS_EDIT: "surgicals.edit",

  // Eye checks
  EYE_CHECKS_CREATE: "eye_checks.create",
  EYE_CHECKS_EDIT: "eye_checks.edit",

  // Dental checks
  DENTAL_CHECKS_CREATE: "dental_checks.create",
  DENTAL_CHECKS_EDIT: "dental_checks.edit",

  // Reports
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
};

export const OUTREACH_PERMISSION_GROUPS = [
  {
    key: "patients",
    label: "Patients",
    moduleKey: null, // always available
    perms: [
      { key: OUTREACH_PERMS.PATIENTS_VIEW, label: "View patients" },
      { key: OUTREACH_PERMS.PATIENTS_CREATE, label: "Register new patients" },
      { key: OUTREACH_PERMS.PATIENTS_EDIT, label: "Edit patient biodata" },
    ],
  },
  {
    key: "vitals",
    label: "Vitals",
    moduleKey: "vitals",
    perms: [
      { key: OUTREACH_PERMS.VITALS_CREATE, label: "Record vitals" },
      { key: OUTREACH_PERMS.VITALS_EDIT, label: "Edit vitals" },
    ],
  },
  {
    key: "encounter",
    label: "Clinic / Encounter",
    moduleKey: "encounter",
    perms: [
      { key: OUTREACH_PERMS.ENCOUNTER_CREATE, label: "Create encounter" },
      { key: OUTREACH_PERMS.ENCOUNTER_EDIT, label: "Edit encounter" },
    ],
  },
  {
    key: "lab",
    label: "Lab",
    moduleKey: "lab",
    perms: [
      { key: OUTREACH_PERMS.LAB_CATALOG_VIEW, label: "View lab catalog" },
      { key: OUTREACH_PERMS.LAB_CATALOG_MANAGE, label: "Manage lab catalog" },
      { key: OUTREACH_PERMS.LAB_ORDER_CREATE, label: "Create lab order" },
      { key: OUTREACH_PERMS.LAB_ORDER_EDIT, label: "Edit lab order / statuses" },
      { key: OUTREACH_PERMS.LAB_RESULT_CREATE, label: "Enter lab results" },
      { key: OUTREACH_PERMS.LAB_RESULT_EDIT, label: "Edit lab results" },
    ],
  },
  {
    key: "pharmacy",
    label: "Pharmacy",
    moduleKey: "pharmacy",
    perms: [
      { key: OUTREACH_PERMS.PHARMACY_CATALOG_VIEW, label: "View drug catalog" },
      { key: OUTREACH_PERMS.PHARMACY_CATALOG_MANAGE, label: "Manage drug catalog" },
      { key: OUTREACH_PERMS.PHARMACY_DISPENSE_CREATE, label: "Dispense drugs (log)" },
      { key: OUTREACH_PERMS.PHARMACY_DISPENSE_EDIT, label: "Edit dispense records" },
    ],
  },
  {
    key: "immunization",
    label: "Immunization",
    moduleKey: "immunization",
    perms: [
      { key: OUTREACH_PERMS.IMMUNIZATION_CREATE, label: "Record vaccinations" },
      { key: OUTREACH_PERMS.IMMUNIZATION_EDIT, label: "Edit vaccinations" },
    ],
  },
  {
    key: "blood_donation",
    label: "Blood Donation",
    moduleKey: "blood_donation",
    perms: [
      { key: OUTREACH_PERMS.BLOOD_CREATE, label: "Record blood donation" },
      { key: OUTREACH_PERMS.BLOOD_EDIT, label: "Edit blood donation" },
    ],
  },
  {
    key: "counseling",
    label: "Counseling",
    moduleKey: "counseling",
    perms: [
      { key: OUTREACH_PERMS.COUNSELING_CREATE, label: "Create counseling note" },
      { key: OUTREACH_PERMS.COUNSELING_EDIT, label: "Edit counseling note" },
      { key: OUTREACH_PERMS.COUNSELING_VIEW_SENSITIVE, label: "View sensitive notes" },
    ],
  },
  {
    key: "maternal",
    label: "Maternal",
    moduleKey: "maternal",
    perms: [
      { key: OUTREACH_PERMS.MATERNAL_CREATE, label: "Record maternal screening" },
      { key: OUTREACH_PERMS.MATERNAL_EDIT, label: "Edit maternal screening" },
    ],
  },
  {
    key: "referral",
    label: "Referral",
    moduleKey: "referral",
    perms: [
      { key: OUTREACH_PERMS.REFERRAL_CREATE, label: "Create referral" },
      { key: OUTREACH_PERMS.REFERRAL_EDIT, label: "Edit referral" },
    ],
  },
  {
    key: "surgicals",
    label: "Surgicals",
    moduleKey: "surgicals",
    perms: [
      { key: OUTREACH_PERMS.SURGICALS_CREATE, label: "Create surgical record" },
      { key: OUTREACH_PERMS.SURGICALS_EDIT, label: "Edit surgical record" },
    ],
  },
  {
    key: "eye_checks",
    label: "Eye checks",
    moduleKey: "eye_checks",
    perms: [
      { key: OUTREACH_PERMS.EYE_CHECKS_CREATE, label: "Create eye check" },
      { key: OUTREACH_PERMS.EYE_CHECKS_EDIT, label: "Edit eye check" },
    ],
  },
  {
    key: "dental_checks",
    label: "Dental checks",
    moduleKey: "dental_checks",
    perms: [
      { key: OUTREACH_PERMS.DENTAL_CHECKS_CREATE, label: "Create dental check" },
      { key: OUTREACH_PERMS.DENTAL_CHECKS_EDIT, label: "Edit dental check" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    moduleKey: null,
    perms: [
      { key: OUTREACH_PERMS.REPORTS_VIEW, label: "View reports" },
      { key: OUTREACH_PERMS.REPORTS_EXPORT, label: "Export reports" },
    ],
  },
];

export const OUTREACH_ROLE_TEMPLATES = [
  { key: "REGISTRATION", label: "Registration" },
  { key: "NURSE_VITALS", label: "Nurse (Vitals)" },
  { key: "CLINICIAN", label: "Clinician" },
  { key: "LAB", label: "Lab" },
  { key: "PHARMACY", label: "Pharmacy" },
  { key: "IMMUNIZATION", label: "Immunization" },
  { key: "BLOOD_DONATION", label: "Blood Donation" },
  { key: "COUNSELOR", label: "Counselor" },
  { key: "MATERNAL", label: "Maternal" },
  { key: "REFERRAL", label: "Referral" },
  { key: "SURGICALS", label: "Surgicals" },
  { key: "EYE_CHECKS", label: "Eye checks" },
  { key: "DENTAL_CHECKS", label: "Dental checks" },
  { key: "AUDITOR", label: "Auditor (read-only)" },
  { key: "CUSTOM", label: "Custom" },
];

export const OUTREACH_ROLE_DEFAULTS = {
  REGISTRATION: new Set([OUTREACH_PERMS.PATIENTS_VIEW, OUTREACH_PERMS.PATIENTS_CREATE, OUTREACH_PERMS.PATIENTS_EDIT]),
  NURSE_VITALS: new Set([OUTREACH_PERMS.PATIENTS_VIEW, OUTREACH_PERMS.PATIENTS_CREATE, OUTREACH_PERMS.VITALS_CREATE, OUTREACH_PERMS.VITALS_EDIT]),
  CLINICIAN: new Set([
    OUTREACH_PERMS.PATIENTS_VIEW,
    OUTREACH_PERMS.PATIENTS_CREATE,
    OUTREACH_PERMS.VITALS_CREATE, OUTREACH_PERMS.VITALS_EDIT,
    OUTREACH_PERMS.ENCOUNTER_CREATE, OUTREACH_PERMS.ENCOUNTER_EDIT,
    OUTREACH_PERMS.LAB_CATALOG_VIEW, OUTREACH_PERMS.LAB_ORDER_CREATE, OUTREACH_PERMS.LAB_RESULT_CREATE,
    OUTREACH_PERMS.PHARMACY_CATALOG_VIEW, OUTREACH_PERMS.PHARMACY_DISPENSE_CREATE,
    OUTREACH_PERMS.IMMUNIZATION_CREATE,
    OUTREACH_PERMS.MATERNAL_CREATE,
    OUTREACH_PERMS.REFERRAL_CREATE,
    OUTREACH_PERMS.SURGICALS_CREATE,
    OUTREACH_PERMS.EYE_CHECKS_CREATE,
    OUTREACH_PERMS.DENTAL_CHECKS_CREATE,
  ]),
  LAB: new Set([
    OUTREACH_PERMS.PATIENTS_VIEW,
    OUTREACH_PERMS.PATIENTS_CREATE,
    OUTREACH_PERMS.LAB_CATALOG_VIEW, OUTREACH_PERMS.LAB_CATALOG_MANAGE,
    OUTREACH_PERMS.LAB_ORDER_CREATE, OUTREACH_PERMS.LAB_ORDER_EDIT,
    OUTREACH_PERMS.LAB_RESULT_CREATE, OUTREACH_PERMS.LAB_RESULT_EDIT,
  ]),
  PHARMACY: new Set([
    OUTREACH_PERMS.PATIENTS_VIEW,
    OUTREACH_PERMS.PATIENTS_CREATE,
    OUTREACH_PERMS.PHARMACY_CATALOG_VIEW, OUTREACH_PERMS.PHARMACY_CATALOG_MANAGE,
    OUTREACH_PERMS.PHARMACY_DISPENSE_CREATE, OUTREACH_PERMS.PHARMACY_DISPENSE_EDIT,
  ]),
  IMMUNIZATION: new Set([OUTREACH_PERMS.PATIENTS_VIEW, OUTREACH_PERMS.PATIENTS_CREATE, OUTREACH_PERMS.VITALS_CREATE, OUTREACH_PERMS.IMMUNIZATION_CREATE, OUTREACH_PERMS.IMMUNIZATION_EDIT]),
  BLOOD_DONATION: new Set([OUTREACH_PERMS.PATIENTS_VIEW, OUTREACH_PERMS.PATIENTS_CREATE, OUTREACH_PERMS.BLOOD_CREATE, OUTREACH_PERMS.BLOOD_EDIT]),
  COUNSELOR: new Set([OUTREACH_PERMS.PATIENTS_VIEW, OUTREACH_PERMS.PATIENTS_CREATE, OUTREACH_PERMS.COUNSELING_CREATE, OUTREACH_PERMS.COUNSELING_EDIT, OUTREACH_PERMS.COUNSELING_VIEW_SENSITIVE]),
  MATERNAL: new Set([OUTREACH_PERMS.PATIENTS_VIEW, OUTREACH_PERMS.PATIENTS_CREATE, OUTREACH_PERMS.VITALS_CREATE, OUTREACH_PERMS.MATERNAL_CREATE, OUTREACH_PERMS.MATERNAL_EDIT]),
  REFERRAL: new Set([OUTREACH_PERMS.PATIENTS_VIEW, OUTREACH_PERMS.PATIENTS_CREATE, OUTREACH_PERMS.REFERRAL_CREATE, OUTREACH_PERMS.REFERRAL_EDIT]),
  SURGICALS: new Set([OUTREACH_PERMS.PATIENTS_VIEW, OUTREACH_PERMS.PATIENTS_CREATE, OUTREACH_PERMS.SURGICALS_CREATE, OUTREACH_PERMS.SURGICALS_EDIT]),
  EYE_CHECKS: new Set([OUTREACH_PERMS.PATIENTS_VIEW, OUTREACH_PERMS.PATIENTS_CREATE, OUTREACH_PERMS.EYE_CHECKS_CREATE, OUTREACH_PERMS.EYE_CHECKS_EDIT]),
  DENTAL_CHECKS: new Set([OUTREACH_PERMS.PATIENTS_VIEW, OUTREACH_PERMS.PATIENTS_CREATE, OUTREACH_PERMS.DENTAL_CHECKS_CREATE, OUTREACH_PERMS.DENTAL_CHECKS_EDIT]),
  AUDITOR: new Set([OUTREACH_PERMS.PATIENTS_VIEW, OUTREACH_PERMS.PATIENTS_CREATE, OUTREACH_PERMS.REPORTS_VIEW]),
  CUSTOM: new Set([OUTREACH_PERMS.PATIENTS_CREATE]),
};

export function isModuleEnabled(modulesEnabled, moduleKey) {
  if (!moduleKey) return true;
  return !!(modulesEnabled && modulesEnabled[moduleKey]);
}

export function filterPermissionGroupsByModules(modulesEnabled) {
  return OUTREACH_PERMISSION_GROUPS.filter((g) => !g.moduleKey || isModuleEnabled(modulesEnabled, g.moduleKey));
}

export function hasPerm(permissions, key) {
  if (!key) return true;
  const set = new Set(Array.isArray(permissions) ? permissions : []);
  return set.has(key);
}
