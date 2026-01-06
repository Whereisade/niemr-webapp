import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * Main hook to fetch and check user's effective permissions
 * 
 * @returns {Object} { permissions, error, isLoading, mutate, can }
 * 
 * @example
 * const { permissions, isLoading, can } = useMyPermissions();
 * 
 * if (can('can_view_patients')) {
 *   // Show patient list
 * }
 */
export function useMyPermissions() {
  const [permissions, setPermissions] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchPermissions() {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch("/facilities/my-permissions/");
      setPermissions(data.permissions || {});
    } catch (err) {
      console.error("Failed to fetch permissions:", err);
      setError(err);
      // Fail-open: if fetch fails, assume all permissions granted
      // Backend will still enforce actual permissions
      setPermissions({});
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchPermissions();
  }, []);

  // Helper function to check a single permission
  const can = (permission) => {
    if (!permissions) return true; // Fail-open during loading
    return permissions[permission] !== false;
  };

  return {
    permissions,
    error,
    isLoading,
    mutate: fetchPermissions, // For manual refresh
    can,
  };
}

/**
 * Hook to check a single permission
 * 
 * @param {string} permission - Permission key to check
 * @returns {boolean} Whether user has the permission
 * 
 * @example
 * const canViewPatients = usePermission('can_view_patients');
 * 
 * if (canViewPatients) {
 *   // Render patient list
 * }
 */
export function usePermission(permission) {
  const { can, isLoading } = useMyPermissions();
  
  if (isLoading) return true; // Fail-open during loading
  return can(permission);
}

/**
 * Hook to check multiple permissions at once
 * 
 * @param {string[]} permissionNames - Array of permission keys
 * @returns {Object} Map of permission names to boolean values
 * 
 * @example
 * const perms = usePermissions([
 *   'can_view_patients',
 *   'can_create_patients',
 *   'can_edit_patients'
 * ]);
 * 
 * if (perms.can_view_patients) {
 *   // Show patient list
 * }
 * 
 * if (perms.can_create_patients) {
 *   // Show "Add Patient" button
 * }
 */
export function usePermissions(permissionNames) {
  const { can, isLoading } = useMyPermissions();
  
  if (isLoading) {
    // Fail-open: return all true during loading
    return permissionNames.reduce((acc, name) => {
      acc[name] = true;
      return acc;
    }, {});
  }
  
  return permissionNames.reduce((acc, name) => {
    acc[name] = can(name);
    return acc;
  }, {});
}

/**
 * Component that only renders children if user has required permission(s)
 * 
 * @param {Object} props
 * @param {string|string[]} props.permission - Permission(s) required
 * @param {boolean} props.requireAll - If multiple permissions, require all (default: false)
 * @param {React.ReactNode} props.children - Content to render if permitted
 * @param {React.ReactNode} props.fallback - Content to render if not permitted
 * 
 * @example
 * <RequirePermission permission="can_create_patients">
 *   <button>Add New Patient</button>
 * </RequirePermission>
 * 
 * @example
 * <RequirePermission 
 *   permission={['can_view_charges', 'can_create_charges']}
 *   requireAll={false}
 *   fallback={<p>No billing access</p>}
 * >
 *   <BillingPanel />
 * </RequirePermission>
 */
export function RequirePermission({ 
  permission, 
  requireAll = false, 
  children, 
  fallback = null 
}) {
  const { can, isLoading } = useMyPermissions();
  
  // Fail-open during loading
  if (isLoading) return children;
  
  const permissions = Array.isArray(permission) ? permission : [permission];
  
  const hasPermission = requireAll
    ? permissions.every(p => can(p))
    : permissions.some(p => can(p));
  
  return hasPermission ? children : fallback;
}

/**
 * Component that renders different content based on permission
 * 
 * @param {Object} props
 * @param {string} props.permission - Permission to check
 * @param {React.ReactNode} props.granted - Content when permission is granted
 * @param {React.ReactNode} props.denied - Content when permission is denied
 * 
 * @example
 * <PermissionSwitch
 *   permission="can_edit_patients"
 *   granted={<button>Edit Patient</button>}
 *   denied={<button disabled>Edit Patient (No Access)</button>}
 * />
 */
export function PermissionSwitch({ permission, granted, denied = null }) {
  const { can, isLoading } = useMyPermissions();
  
  // Fail-open during loading
  if (isLoading) return granted;
  
  return can(permission) ? granted : denied;
}

/**
 * Higher-order component that wraps a component with permission check
 * 
 * @param {React.Component} Component - Component to wrap
 * @param {string|string[]} permission - Permission(s) required
 * @param {boolean} requireAll - If multiple permissions, require all
 * @returns {React.Component} Wrapped component
 * 
 * @example
 * const ProtectedPatientForm = withPermission(
 *   PatientForm,
 *   'can_create_patients'
 * );
 * 
 * @example
 * const ProtectedBillingPage = withPermission(
 *   BillingPage,
 *   ['can_view_charges', 'can_view_payments'],
 *   false // require any one
 * );
 */
export function withPermission(Component, permission, requireAll = false) {
  return function PermissionWrapper(props) {
    return (
      <RequirePermission permission={permission} requireAll={requireAll}>
        <Component {...props} />
      </RequirePermission>
    );
  };
}

/**
 * Hook to get permission status with loading state
 * Useful when you need to show loading UI
 * 
 * @param {string} permission - Permission to check
 * @returns {Object} { hasPermission, isLoading }
 * 
 * @example
 * const { hasPermission, isLoading } = usePermissionWithLoading('can_view_patients');
 * 
 * if (isLoading) return <Spinner />;
 * if (!hasPermission) return <AccessDenied />;
 * return <PatientList />;
 */
export function usePermissionWithLoading(permission) {
  const { can, isLoading } = useMyPermissions();
  
  return {
    hasPermission: can(permission),
    isLoading,
  };
}

/**
 * Hook to check if user has any of the given roles (for role-based checks)
 * Note: This requires the me object from /accounts/me/
 * 
 * @param {string[]} roles - Array of role values to check
 * @returns {boolean} Whether user has any of the roles
 * 
 * @example
 * const isDoctor = useHasRole(['DOCTOR']);
 * const isClinicalStaff = useHasRole(['DOCTOR', 'NURSE']);
 */
export function useHasRole(roles) {
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRole() {
      try {
        const data = await apiFetch("/accounts/me/");
        setUserRole(data.role);
      } catch (err) {
        console.error("Failed to fetch user role:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadRole();
  }, []);

  if (isLoading) return true; // Fail-open
  return roles.includes(userRole);
}