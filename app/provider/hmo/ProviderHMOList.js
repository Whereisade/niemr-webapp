"use client";

import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import {
  Shield,
  Plus,
  Building2,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Stethoscope,
  Pill,
  Beaker,
  Award,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import Link from "next/link";

export default function ProviderHMOList({ user, token }) {
  const [hmos, setHmos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggleLoading, setToggleLoading] = useState(null);

  const role = useMemo(() => (user?.role || "").toUpperCase(), [user]);

  // Load HMOs for this independent provider
  useEffect(() => {
    async function loadHMOs() {
      setLoading(true);
      setError("");
      
      try {
        const data = await apiFetch("/patients/hmo/facility/");
        setHmos(Array.isArray(data) ? data : data?.results || []);
      } catch (err) {
        setError("Failed to load HMOs");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadHMOs();
  }, []);

  // Toggle HMO active status
  async function toggleHMO(hmoId, currentStatus) {
    setToggleLoading(hmoId);
    setError("");

    try {
      if (currentStatus) {
        // Disable HMO
        await apiFetch(`/patients/hmo/facility/${hmoId}/`, {
          method: "DELETE",
        });
      } else {
        // Re-enable HMO (would need to implement reactivation endpoint)
        await apiFetch(`/patients/hmo/facility/enable/`, {
          method: "POST",
          body: JSON.stringify({ system_hmo_id: hmoId }),
        });
      }

      // Reload HMOs
      const data = await apiFetch("/patients/hmo/facility/");
      setHmos(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      setError(`Failed to ${currentStatus ? "disable" : "enable"} HMO`);
      console.error(err);
    } finally {
      setToggleLoading(null);
    }
  }

  // Stats
  const stats = useMemo(() => {
    const active = hmos.filter((h) => h.is_active).length;
    const totalTiers = hmos.reduce(
      (sum, h) => sum + (h.system_hmo?.tiers?.length || 0),
      0
    );

    return {
      total: hmos.length,
      active,
      inactive: hmos.length - active,
      tiers: totalTiers,
    };
  }, [hmos]);

  // Get role-specific icon and title
  const roleConfig = useMemo(() => {
    switch (role) {
      case "DOCTOR":
        return {
          icon: Stethoscope,
          title: "Medical Services & HMO Pricing",
          pricingLabel: "Consultation Services",
        };
      case "LAB":
        return {
          icon: Beaker,
          title: "Laboratory Services & HMO Pricing",
          pricingLabel: "Lab Tests",
        };
      case "PHARMACY":
        return {
          icon: Pill,
          title: "Pharmacy Services & HMO Pricing",
          pricingLabel: "Medications",
        };
      default:
        return {
          icon: Shield,
          title: "HMO Management",
          pricingLabel: "Services",
        };
    }
  }, [role]);

  const RoleIcon = roleConfig.icon;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-sky-600" />
          <p className="mt-4 text-sm text-slate-600">Loading your HMOs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-100">
              <RoleIcon className="h-6 w-6 text-sky-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {roleConfig.title}
              </h1>
              <p className="text-sm text-slate-600">
                Manage HMO relationships and set pricing for your {roleConfig.pricingLabel.toLowerCase()}
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/provider/hmo/enable"
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          Enable New HMO
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <div>
              <p className="font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={Shield}
          value={stats.total}
          label="Total HMOs"
          bgColor="bg-blue-50"
          iconColor="text-blue-700"
          iconBg="bg-blue-100"
        />
        <StatCard
          icon={CheckCircle2}
          value={stats.active}
          label="Active"
          bgColor="bg-emerald-50"
          iconColor="text-emerald-700"
          iconBg="bg-emerald-100"
        />
        <StatCard
          icon={AlertCircle}
          value={stats.inactive}
          label="Inactive"
          bgColor="bg-slate-50"
          iconColor="text-slate-600"
          iconBg="bg-slate-100"
        />
        <StatCard
          icon={Award}
          value={stats.tiers}
          label="Total Tiers"
          bgColor="bg-amber-50"
          iconColor="text-amber-700"
          iconBg="bg-amber-100"
        />
      </div>

      {/* HMO List */}
      {hmos.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <Shield className="mx-auto h-16 w-16 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            No HMOs Enabled
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Get started by enabling your first HMO to manage pricing for your {roleConfig.pricingLabel.toLowerCase()}.
          </p>
          <Link
            href="/provider/hmo/enable"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            Enable Your First HMO
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hmos.map((hmo) => (
            <HMOCard
              key={hmo.id}
              hmo={hmo}
              role={role}
              toggleLoading={toggleLoading}
              onToggle={toggleHMO}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, value, label, bgColor, iconColor, iconBg }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200 ${bgColor} p-5 transition hover:shadow-md`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className={`grid h-12 w-12 place-items-center rounded-xl ${iconBg}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
      <div className={`text-3xl font-bold ${iconColor.replace("text-", "text-")}`}>
        {value}
      </div>
      <div className="text-sm font-medium text-slate-700">{label}</div>
    </div>
  );
}

// HMO Card Component
function HMOCard({ hmo, role, toggleLoading, onToggle }) {
  const system_hmo = hmo.system_hmo || {};
  const tiers = system_hmo.tiers || [];
  const isActive = hmo.is_active;
  const isToggling = toggleLoading === hmo.id;

  return (
    <div
      className={`overflow-hidden rounded-2xl border-2 bg-white transition ${
        isActive
          ? "border-sky-200 shadow-sm hover:shadow-md"
          : "border-slate-200 opacity-60"
      }`}
    >
      {/* Header */}
      <div className={`p-5 ${isActive ? "bg-sky-50" : "bg-slate-50"}`}>
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900">
              {system_hmo.name || "Unnamed HMO"}
            </h3>
            {system_hmo.nhis_number && (
              <p className="mt-1 text-xs font-mono text-slate-600">
                NHIS: {system_hmo.nhis_number}
              </p>
            )}
          </div>
          
          <button
            onClick={() => onToggle(hmo.id, isActive)}
            disabled={isToggling}
            className={`rounded-lg p-2 transition ${
              isActive
                ? "hover:bg-sky-100 text-sky-700"
                : "hover:bg-slate-100 text-slate-400"
            }`}
            title={isActive ? "Disable HMO" : "Enable HMO"}
          >
            {isToggling ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isActive ? (
              <ToggleRight className="h-5 w-5" />
            ) : (
              <ToggleLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Tiers */}
        {tiers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tiers.map((tier) => (
              <TierBadge key={tier.id} tier={tier.name} />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-3 p-5">
        {/* Contact Info */}
        {system_hmo.email && (
          <div className="flex items-start gap-2 text-sm">
            <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
            <span className="text-slate-700">{system_hmo.email}</span>
          </div>
        )}
        
        {system_hmo.contact_numbers && system_hmo.contact_numbers.length > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
            <span className="text-slate-700">{system_hmo.contact_numbers[0]}</span>
          </div>
        )}

        {system_hmo.addresses && system_hmo.addresses.length > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
            <span className="text-slate-700 line-clamp-2">{system_hmo.addresses[0]}</span>
          </div>
        )}

        {/* Relationship Status */}
        {hmo.relationship_status && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <RelationshipBadge status={hmo.relationship_status} />
          </div>
        )}
      </div>

      {/* Footer - View Details Link */}
      {isActive && (
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3">
          <Link
            href={`/provider/hmo/${hmo.id}`}
            className="flex items-center justify-between text-sm font-medium text-sky-700 transition hover:text-sky-800"
          >
            <span>Manage Pricing & Details</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

// Tier Badge Component
function TierBadge({ tier }) {
  const config = {
    GOLD: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "🥇" },
    SILVER: { bg: "bg-slate-50", border: "border-slate-300", text: "text-slate-600", icon: "🥈" },
    BRONZE: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", icon: "🥉" },
  };
  const c = config[tier?.toUpperCase()] || config.BRONZE;
  
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${c.bg} ${c.border} ${c.text}`}
    >
      <span>{c.icon}</span>
      {tier}
    </span>
  );
}

// Relationship Status Badge
function RelationshipBadge({ status }) {
  const config = {
    EXCELLENT: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
    GOOD: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
    AVERAGE: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700" },
    POOR: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
    BAD: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  };
  const c = config[status?.toUpperCase()] || config.AVERAGE;
  
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${c.bg} ${c.border} ${c.text}`}
    >
      <Building2 className="h-3 w-3" />
      {status?.replace("_", " ") || "N/A"}
    </span>
  );
}