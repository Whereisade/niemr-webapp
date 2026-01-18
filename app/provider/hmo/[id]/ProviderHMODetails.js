"use client";

import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import {
  Shield,
  ArrowLeft,
  Stethoscope,
  Pill,
  Beaker,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Award,
  DollarSign,
  Search,
  Loader2,
  Edit2,
  Check,
  X,
  TrendingDown,
  Upload,
  FileSpreadsheet,
  Info,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

export default function ProviderHMODetails({ hmo: initialHMO, user, token }) {
  const [activeTab, setActiveTab] = useState("info");
  const [hmo, setHMO] = useState(initialHMO);
  
  const role = useMemo(() => (user?.role || "").toUpperCase(), [user]);
  const system_hmo = hmo.system_hmo || {};
  const tiers = system_hmo.tiers || [];

  // Determine available tabs based on role
  const availableTabs = useMemo(() => {
    const tabs = [{ id: "info", label: "HMO Information", icon: Shield }];
    
    if (role === "DOCTOR") {
      tabs.push({ id: "services", label: "Services Pricing", icon: Stethoscope });
    } else if (role === "LAB") {
      tabs.push({ id: "lab", label: "Lab Pricing", icon: Beaker });
    } else if (role === "PHARMACY") {
      tabs.push({ id: "pharmacy", label: "Pharmacy Pricing", icon: Pill });
    }
    
    return tabs;
  }, [role]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/provider/hmo"
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-100">
                <Shield className="h-6 w-6 text-sky-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {system_hmo.name || "HMO Details"}
                </h1>
                {system_hmo.nhis_number && (
                  <p className="text-sm font-mono text-slate-600">
                    NHIS: {system_hmo.nhis_number}
                  </p>
                )}
              </div>
            </div>
            
            {/* Tier Badges */}
            {tiers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tiers.map((tier) => (
                  <TierBadge key={tier.id} tier={tier.name} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {availableTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-sky-600 text-sky-700"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {activeTab === "info" && <HMOInfoTab hmo={hmo} />}
        {activeTab === "services" && role === "DOCTOR" && (
          <ServicesPricingTab hmoId={hmo.id} systemHMO={system_hmo} />
        )}
        {activeTab === "lab" && role === "LAB" && (
          <LabPricingTab hmoId={hmo.id} systemHMO={system_hmo} />
        )}
        {activeTab === "pharmacy" && role === "PHARMACY" && (
          <PharmacyPricingTab hmoId={hmo.id} systemHMO={system_hmo} />
        )}
      </div>
    </div>
  );
}

// HMO Information Tab
function HMOInfoTab({ hmo }) {
  const system_hmo = hmo.system_hmo || {};
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">HMO Information</h2>
        <p className="text-sm text-slate-600">
          Basic details and contact information for this HMO
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900">Contact Information</h3>
          
          {system_hmo.email && (
            <InfoRow icon={Mail} label="Email" value={system_hmo.email} />
          )}
          
          {system_hmo.contact_numbers && system_hmo.contact_numbers.length > 0 && (
            <InfoRow
              icon={Phone}
              label="Phone"
              value={system_hmo.contact_numbers.join(", ")}
            />
          )}
          
          {system_hmo.addresses && system_hmo.addresses.length > 0 && (
            <InfoRow
              icon={MapPin}
              label="Address"
              value={system_hmo.addresses.join(", ")}
            />
          )}
          
          {system_hmo.contact_person_name && (
            <InfoRow
              icon={Building2}
              label="Contact Person"
              value={system_hmo.contact_person_name}
            />
          )}
        </div>

        {/* Relationship Details */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900">Relationship Details</h3>
          
          {hmo.relationship_status && (
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Status</p>
              <RelationshipBadge status={hmo.relationship_status} />
            </div>
          )}
          
          {hmo.contract_reference && (
            <InfoRow
              icon={FileText}
              label="Contract Reference"
              value={hmo.contract_reference}
            />
          )}
          
          {hmo.contract_start_date && (
            <InfoRow
              icon={Calendar}
              label="Contract Start"
              value={new Date(hmo.contract_start_date).toLocaleDateString()}
            />
          )}
          
          {hmo.contract_end_date && (
            <InfoRow
              icon={Calendar}
              label="Contract End"
              value={new Date(hmo.contract_end_date).toLocaleDateString()}
            />
          )}
        </div>
      </div>

      {/* Tiers Section */}
      {system_hmo.tiers && system_hmo.tiers.length > 0 && (
        <div className="border-t border-slate-200 pt-6">
          <h3 className="mb-4 font-semibold text-slate-900">Available Tiers</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {system_hmo.tiers.map((tier) => (
              <TierCard key={tier.id} tier={tier} />
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {hmo.relationship_notes && (
        <div className="border-t border-slate-200 pt-6">
          <h3 className="mb-2 font-semibold text-slate-900">Notes</h3>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">
            {hmo.relationship_notes}
          </p>
        </div>
      )}
    </div>
  );
}

// Info Row Component
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-600">{label}</p>
        <p className="text-sm text-slate-900 break-words">{value}</p>
      </div>
    </div>
  );
}

// Tier Card Component
function TierCard({ tier }) {
  const config = {
    GOLD: { bg: "bg-gradient-to-br from-amber-50 to-yellow-50", border: "border-amber-200", icon: "🥇" },
    SILVER: { bg: "bg-gradient-to-br from-slate-50 to-gray-50", border: "border-slate-300", icon: "🥈" },
    BRONZE: { bg: "bg-gradient-to-br from-orange-50 to-red-50", border: "border-orange-200", icon: "🥉" },
  };
  const c = config[tier.name?.toUpperCase()] || config.BRONZE;
  
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-2xl">{c.icon}</span>
        <span className="text-xs font-semibold text-slate-600">Level {tier.level}</span>
      </div>
      <h4 className="font-bold text-slate-900">{tier.name} Tier</h4>
      {tier.description && (
        <p className="mt-1 text-xs text-slate-600">{tier.description}</p>
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${c.bg} ${c.border} ${c.text}`}
    >
      <Building2 className="h-3 w-3" />
      {status?.replace("_", " ") || "N/A"}
    </span>
  );
}

// We'll create the pricing tabs in separate files for better organization
// ServicesPricingTab, LabPricingTab, and PharmacyPricingTab will be imported