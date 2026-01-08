"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Shield,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Users,
  Pill,
  FlaskConical,
  Stethoscope,
  CalendarRange,
  UserRound,
  Activity,
  Receipt,
  Bed,
  DollarSign,
  Settings,
  Info,
  Loader2,
} from "lucide-react";

// Role definitions with icons and descriptions
const ROLES = [
  {
    value: "DOCTOR",
    label: "Doctor",
    icon: Stethoscope,
    color: "blue",
    description: "Medical practitioners providing clinical care",
  },
  {
    value: "NURSE",
    label: "Nurse",
    icon: Activity,
    color: "emerald",
    description: "Nursing staff providing patient care and assessments",
  },
  {
    value: "PHARMACY",
    label: "Pharmacy",
    icon: Pill,
    color: "violet",
    description: "Pharmacists managing medications and prescriptions",
  },
  {
    value: "LAB",
    label: "Laboratory",
    icon: FlaskConical,
    color: "amber",
    description: "Lab scientists conducting tests and reporting results",
  },
  {
    value: "FRONTDESK",
    label: "Front Desk",
    icon: Users,
    color: "indigo",
    description: "Reception staff managing appointments and check-ins",
  },
  {
    value: "ADMIN",
    label: "Admin",
    icon: Settings,
    color: "slate",
    description: "Administrative staff with broad operational access",
  },
];

// Permission categories with icons
const PERMISSION_CATEGORIES = [
  {
    id: "pharmacy",
    label: "Pharmacy",
    icon: Pill,
    color: "violet",
    permissions: [
      { key: "can_view_pharmacy_catalog", label: "View pharmacy catalog" },
      { key: "can_manage_pharmacy_catalog", label: "Manage pharmacy catalog" },
      { key: "can_view_pharmacy_stock", label: "View pharmacy stock" },
      { key: "can_manage_pharmacy_stock", label: "Manage pharmacy stock" },
      { key: "can_view_prescriptions", label: "View prescriptions" },
      { key: "can_create_prescriptions", label: "Create prescriptions" },
      { key: "can_dispense_prescriptions", label: "Dispense medications" },
      { key: "can_cancel_prescriptions", label: "Cancel prescriptions" },
    ],
  },
  {
    id: "lab",
    label: "Laboratory",
    icon: FlaskConical,
    color: "amber",
    permissions: [
      { key: "can_view_lab_catalog", label: "View lab catalog" },
      { key: "can_manage_lab_catalog", label: "Manage lab catalog" },
      { key: "can_view_lab_orders", label: "View lab orders" },
      { key: "can_create_lab_orders", label: "Create lab orders" },
      { key: "can_process_lab_orders", label: "Process lab orders (collect samples)" },
      { key: "can_enter_lab_results", label: "Enter lab results" },
      { key: "can_cancel_lab_orders", label: "Cancel lab orders" },
    ],
  },
  {
    id: "clinical",
    label: "Clinical",
    icon: Stethoscope,
    color: "blue",
    permissions: [
      { key: "can_view_encounters", label: "View encounters" },
      { key: "can_create_encounters", label: "Create encounters" },
      { key: "can_edit_encounters", label: "Edit encounters" },
      { key: "can_finalize_encounters", label: "Finalize encounters (lock SOAP notes)" },
      { key: "can_close_encounters", label: "Close encounters" },
    ],
  },
  {
    id: "appointments",
    label: "Appointments",
    icon: CalendarRange,
    color: "indigo",
    permissions: [
      { key: "can_view_appointments", label: "View appointments" },
      { key: "can_create_appointments", label: "Create appointments" },
      { key: "can_edit_appointments", label: "Edit appointments" },
      { key: "can_check_in_appointments", label: "Check in appointments" },
      { key: "can_cancel_appointments", label: "Cancel appointments" },
    ],
  },
  {
    id: "patients",
    label: "Patients",
    icon: UserRound,
    color: "emerald",
    permissions: [
      { key: "can_view_patients", label: "View patient records" },
      { key: "can_create_patients", label: "Create patient records" },
      { key: "can_edit_patients", label: "Edit patient records" },
      { key: "can_view_patient_documents", label: "View patient documents" },
      { key: "can_manage_patient_documents", label: "Manage patient documents" },
    ],
  },
  {
    id: "vitals",
    label: "Vitals & Assessments",
    icon: Activity,
    color: "rose",
    permissions: [
      { key: "can_record_vitals", label: "Record vital signs" },
      { key: "can_view_vitals", label: "View vital signs" },
      { key: "can_perform_nurse_assessment", label: "Perform nurse assessments" },
    ],
  },
  {
    id: "billing",
    label: "Billing",
    icon: Receipt,
    color: "cyan",
    permissions: [
      { key: "can_view_charges", label: "View charges" },
      { key: "can_create_charges", label: "Create charges" },
      { key: "can_edit_charges", label: "Edit charges" },
      { key: "can_void_charges", label: "Void charges" },
      { key: "can_view_payments", label: "View payments" },
      { key: "can_record_payments", label: "Record payments" },
    ],
  },
  {
    id: "wards",
    label: "Ward Management",
    icon: Bed,
    color: "purple",
    permissions: [
      { key: "can_view_wards", label: "View wards" },
      { key: "can_manage_wards", label: "Manage ward structure" },
      { key: "can_admit_patients", label: "Admit patients to wards" },
      { key: "can_discharge_patients", label: "Discharge patients from wards" },
      { key: "can_transfer_patients", label: "Transfer patients between wards" },
    ],
  },
  {
    id: "hmo",
    label: "HMO & Pricing",
    icon: DollarSign,
    color: "teal",
    permissions: [
      { key: "can_view_hmo_pricing", label: "View HMO pricing" },
      { key: "can_manage_hmo_pricing", label: "Manage HMO pricing" },
    ],
  },
  {
    id: "settings",
    label: "Facility Settings",
    icon: Settings,
    color: "slate",
    permissions: [
      { key: "can_view_providers", label: "View providers" },
      { key: "can_manage_providers", label: "Manage providers" },
      { key: "can_view_facility_settings", label: "View facility settings" },
      { key: "can_edit_facility_settings", label: "Edit facility settings" },
    ],
  },
];

// Color classes mapping
const COLOR_CLASSES = {
  blue: "from-blue-500 to-blue-600 bg-blue-50 text-blue-700 border-blue-200",
  emerald: "from-emerald-500 to-emerald-600 bg-emerald-50 text-emerald-700 border-emerald-200",
  violet: "from-violet-500 to-violet-600 bg-violet-50 text-violet-700 border-violet-200",
  amber: "from-amber-500 to-amber-600 bg-amber-50 text-amber-700 border-amber-200",
  indigo: "from-indigo-500 to-indigo-600 bg-indigo-50 text-indigo-700 border-indigo-200",
  slate: "from-slate-500 to-slate-600 bg-slate-50 text-slate-700 border-slate-200",
  rose: "from-rose-500 to-rose-600 bg-rose-50 text-rose-700 border-rose-200",
  cyan: "from-cyan-500 to-cyan-600 bg-cyan-50 text-cyan-700 border-cyan-200",
  purple: "from-purple-500 to-purple-600 bg-purple-50 text-purple-700 border-purple-200",
  teal: "from-teal-500 to-teal-600 bg-teal-50 text-teal-700 border-teal-200",
};

// ✅ Role-specific category visibility
// Only show relevant permission categories for each role
const ROLE_CATEGORIES = {
  DOCTOR: ["clinical", "appointments", "patients", "vitals", "pharmacy", "lab", "billing", "wards"],
  NURSE: ["clinical", "appointments", "patients", "vitals", "wards"],
  PHARMACY: ["pharmacy", "patients", "hmo"],
  LAB: ["lab", "patients", "hmo"],
  FRONTDESK: ["appointments", "patients", "billing"],
  ADMIN: ["pharmacy", "lab", "clinical", "appointments", "patients", "vitals", "billing", "wards", "hmo", "settings"],
};

// ✅ Helper function to get visible categories for a role
function getVisibleCategories(roleValue) {
  const visibleCategoryIds = ROLE_CATEGORIES[roleValue] || [];
  return PERMISSION_CATEGORIES.filter(cat => visibleCategoryIds.includes(cat.id));
}

export default function PermissionsPage() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({});
  const [expandedRoles, setExpandedRoles] = useState(new Set());
  const [expandedCategories, setExpandedCategories] = useState({});
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState(null);

  // Load current user
  useEffect(() => {
    async function loadMe() {
      try {
        const data = await apiFetch("/accounts/me/");
        setMe(data);

        if (data?.role !== "SUPER_ADMIN") {
          setMessage({
            type: "error",
            text: "Access denied. Only Super Admins can manage permissions.",
          });
          setLoading(false);
          return;
        }

        // Load permissions for all roles
        await loadPermissions();
      } catch (error) {
        console.error("Failed to load user:", error);
        setMessage({ type: "error", text: "Failed to load user data" });
        setLoading(false);
      }
    }
    loadMe();
  }, []);

  async function loadPermissions() {
    try {
      setLoading(true);
      setMessage(null);
      
      console.log('[Permissions] Fetching from /facilities/permissions/');
      const data = await apiFetch("/facilities/permissions/");
      console.log('[Permissions] Received data:', data);

      // Transform array to nested object: { DOCTOR: { can_view_patients: true, ... }, ... }
      const permsMap = {};
      for (const role of ROLES) {
        permsMap[role.value] = {};
      }

      if (Array.isArray(data)) {
        console.log(`[Permissions] Processing ${data.length} permission records`);
        for (const perm of data) {
          if (permsMap[perm.role]) {
            permsMap[perm.role][perm.permission] = perm.enabled;
          }
        }
      } else {
        console.warn('[Permissions] Expected array, got:', typeof data, data);
      }

      setPermissions(permsMap);
      console.log('[Permissions] Loaded successfully');
    } catch (error) {
      console.error("[Permissions] Failed to load:", error);
      console.error("[Permissions] Error details:", {
        message: error.message,
        stack: error.stack,
      });
      
      let errorMessage = "Failed to load permissions";
      
      if (error.message.includes('404')) {
        errorMessage = "API endpoint not found. Check that backend migrations are complete and URLs are registered.";
      } else if (error.message.includes('403')) {
        errorMessage = "Permission denied. Ensure you have Super Admin role.";
      } else if (error.message.includes('401')) {
        errorMessage = "Not authenticated. Please log in again.";
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = "Cannot connect to API. Check that backend is running.";
      } else {
        errorMessage = `Failed to load permissions: ${error.message}`;
      }
      
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setLoading(false);
    }
  }

  function toggleRole(roleValue) {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleValue)) {
        next.delete(roleValue);
      } else {
        next.add(roleValue);
      }
      return next;
    });
  }

  function toggleCategory(roleValue, categoryId) {
    setExpandedCategories((prev) => {
      const key = `${roleValue}-${categoryId}`;
      return { ...prev, [key]: !prev[key] };
    });
  }

  function togglePermission(roleValue, permissionKey) {
    setPermissions((prev) => ({
      ...prev,
      [roleValue]: {
        ...prev[roleValue],
        [permissionKey]: !prev[roleValue]?.[permissionKey],
      },
    }));
  }

  async function saveRole(roleValue) {
    setSaving(roleValue);
    setMessage(null);

    try {
      const rolePerms = permissions[roleValue] || {};
      const updates = Object.entries(rolePerms).map(([permission, enabled]) => ({
        role: roleValue,
        permission,
        enabled: enabled !== false, // default to true if undefined
      }));

      await apiFetch("/facilities/permissions/bulk_update/", {
        method: "POST",
        body: JSON.stringify({ permissions: updates }),
      });

      setMessage({
        type: "success",
        text: `Successfully saved permissions for ${ROLES.find((r) => r.value === roleValue)?.label}`,
      });

      // Reload to get server state
      await loadPermissions();
    } catch (error) {
      console.error("Failed to save permissions:", error);
      setMessage({
        type: "error",
        text: `Failed to save permissions: ${error.message}`,
      });
    } finally {
      setSaving(null);
    }
  }

  async function resetRole(roleValue) {
    if (!confirm(`Reset ${ROLES.find((r) => r.value === roleValue)?.label} to default permissions?`)) {
      return;
    }

    setSaving(roleValue);
    setMessage(null);

    try {
      await apiFetch(`/facilities/permissions/reset_role/`, {
        method: "POST",
        body: JSON.stringify({ role: roleValue }),
      });

      setMessage({
        type: "success",
        text: `Reset ${ROLES.find((r) => r.value === roleValue)?.label} to defaults`,
      });

      await loadPermissions();
    } catch (error) {
      console.error("Failed to reset permissions:", error);
      setMessage({
        type: "error",
        text: `Failed to reset permissions: ${error.message}`,
      });
    } finally {
      setSaving(null);
    }
  }

  function getPermissionStats(roleValue) {
    const rolePerms = permissions[roleValue] || {};
    // ✅ Only count permissions from visible categories for this role
    const visibleCategories = getVisibleCategories(roleValue);
    const allPerms = visibleCategories.flatMap((cat) =>
      cat.permissions.map((p) => p.key)
    );

    const enabled = allPerms.filter((key) => rolePerms[key] !== false).length;
    const total = allPerms.length;
    const percentage = total > 0 ? Math.round((enabled / total) * 100) : 0;

    const hasCustom = Object.values(rolePerms).some((v) => v === false);

    return { enabled, total, percentage, hasCustom };
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-4 text-sm text-slate-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-rose-100">
            <Shield className="h-8 w-8 text-rose-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Access Denied</h1>
          <p className="mt-2 text-sm text-slate-600">
            Only Super Admins can manage facility role permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg">
              <Shield className="h-3.5 w-3.5" />
              Super Admin
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Role Permissions
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Configure what each facility role can access and perform
            </p>
          </div>
        </header>

        {/* Message */}
        {message && (
          <div
            className={`flex items-start gap-3 rounded-xl border p-4 ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50"
                : "border-rose-200 bg-rose-50"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            )}
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${
                  message.type === "success" ? "text-emerald-900" : "text-rose-900"
                }`}
              >
                {message.text}
              </p>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          </div>
        )}

        {/* Info Card */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-100">
              <Info className="h-6 w-6 text-blue-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">About Permissions</h3>
              <div className="mt-2 space-y-1 text-sm text-blue-800">
                <p>
                  • Permissions are <strong>fail-open</strong> by default - all users have access
                  unless explicitly disabled
                </p>
                <p>
                  • Changes take effect immediately without requiring logout
                </p>
                <p>
                  • Backend always enforces permissions - frontend only controls UI visibility
                </p>
                <p>
                  • Only relevant permission categories are shown for each role
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Roles List */}
        <div className="space-y-4">
          {ROLES.map((role) => {
            const isExpanded = expandedRoles.has(role.value);
            const stats = getPermissionStats(role.value);
            const colorParts = COLOR_CLASSES[role.color].split(" ");
            const gradient = colorParts[0] + " " + colorParts[1];
            const bg = colorParts[2];
            const text = colorParts[3];
            
            // ✅ Get only visible categories for this role
            const visibleCategories = getVisibleCategories(role.value);

            return (
              <div
                key={role.value}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Role Header */}
                <div
                  onClick={() => toggleRole(role.value)}
                  className="flex cursor-pointer items-center justify-between p-6 transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`grid h-12 w-12 place-items-center rounded-xl ${bg}`}>
                      <role.icon className={`h-6 w-6 ${text}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{role.label}</h3>
                        {stats.hasCustom && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            Custom
                          </span>
                        )}
                        {!stats.hasCustom && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600">{role.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900">
                        {stats.enabled} / {stats.total}
                      </div>
                      <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full bg-gradient-to-r ${gradient} transition-all`}
                          style={{ width: `${stats.percentage}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{stats.percentage}% enabled</div>
                    </div>

                    <div className="text-slate-400">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-6">
                    {/* Action Buttons */}
                    <div className="mb-6 flex items-center gap-3">
                      <button
                        onClick={() => saveRole(role.value)}
                        disabled={saving === role.value}
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl disabled:opacity-50"
                      >
                        {saving === role.value ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Changes
                      </button>

                      <button
                        onClick={() => resetRole(role.value)}
                        disabled={saving === role.value}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reset to Defaults
                      </button>
                    </div>

                    {/* Permission Categories - ✅ Only show visible categories */}
                    <div className="space-y-3">
                      {visibleCategories.map((category) => {
                        const categoryKey = `${role.value}-${category.id}`;
                        const isCategoryExpanded = expandedCategories[categoryKey];
                        const categoryColorParts = COLOR_CLASSES[category.color].split(" ");
                        const categoryBg = categoryColorParts[2];
                        const categoryText = categoryColorParts[3];

                        const categoryEnabled = category.permissions.filter(
                          (p) => permissions[role.value]?.[p.key] !== false
                        ).length;

                        return (
                          <div
                            key={category.id}
                            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                          >
                            <div
                              onClick={() => toggleCategory(role.value, category.id)}
                              className="flex cursor-pointer items-center justify-between p-4 transition hover:bg-slate-50"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`grid h-8 w-8 place-items-center rounded-lg ${categoryBg}`}>
                                  <category.icon className={`h-4 w-4 ${categoryText}`} />
                                </div>
                                <div>
                                  <h4 className="font-medium text-slate-900">{category.label}</h4>
                                  <p className="text-xs text-slate-500">
                                    {categoryEnabled} / {category.permissions.length} enabled
                                  </p>
                                </div>
                              </div>

                              <div className="text-slate-400">
                                {isCategoryExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </div>
                            </div>

                            {isCategoryExpanded && (
                              <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                                <div className="space-y-2">
                                  {category.permissions.map((perm) => {
                                    const isEnabled = permissions[role.value]?.[perm.key] !== false;

                                    return (
                                      <div
                                        key={perm.key}
                                        onClick={() => togglePermission(role.value, perm.key)}
                                        className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:shadow-sm"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div
                                            className={`grid h-6 w-6 place-items-center rounded ${
                                              isEnabled
                                                ? "bg-emerald-100"
                                                : "bg-slate-100"
                                            }`}
                                          >
                                            {isEnabled ? (
                                              <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                                            ) : (
                                              <Lock className="h-3.5 w-3.5 text-slate-400" />
                                            )}
                                          </div>
                                          <span className="text-sm text-slate-700">
                                            {perm.label}
                                          </span>
                                        </div>

                                        <div className="text-xs font-medium">
                                          {isEnabled ? (
                                            <span className="text-emerald-600">Enabled</span>
                                          ) : (
                                            <span className="text-slate-500">Disabled</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}