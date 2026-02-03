"use client";

import Link from "next/link";
import {
  Activity,
  ClipboardList,
  FlaskConical,
  Pill,
  Syringe,
  Droplet,
  MessageCircleHeart,
  Baby,
  Users,
  FileText,
  ArrowRight,
  Send,
  Scissors,
  Eye,
  
} from "lucide-react";
import { OUTREACH_MODULES, hasPerm, OUTREACH_PERMS, isModuleEnabled } from "@/lib/outreachConfig";

const ICONS = {
  patients: Users,
  vitals: Activity,
  encounter: ClipboardList,
  lab: FlaskConical,
  pharmacy: Pill,
  immunization: Syringe,
  blood_donation: Droplet,
  counseling: MessageCircleHeart,
  maternal: Baby,
  referral: Send,
  surgicals: Scissors,
  eye_checks: Eye,
  dental_checks: Scissors,
  reports: FileText,
};

const ROUTES = {
  patients: "/outreach/patients",
  vitals: "/outreach/vitals",
  encounter: "/outreach/encounters",
  lab: "/outreach/labs",
  pharmacy: "/outreach/pharmacy",
  immunization: "/outreach/immunizations",
  blood_donation: "/outreach/blood-donations",
  counseling: "/outreach/counseling",
  maternal: "/outreach/maternal",
  referral: "/outreach/referrals",
  surgicals: "/outreach/surgicals",
  eye_checks: "/outreach/eye-checks",
  dental_checks: "/outreach/dental-checks",
  reports: "/outreach/reports",
};

function canSeeModule({ key, modulesEnabled, permissions, isOutreachSuperAdmin }) {
  if (isOutreachSuperAdmin) return true;
  if (key !== "patients" && key !== "reports" && !isModuleEnabled(modulesEnabled, key)) return false;

  // patients: needs at least view or create
  if (key === "patients") return hasPerm(permissions, OUTREACH_PERMS.PATIENTS_VIEW) || hasPerm(permissions, OUTREACH_PERMS.PATIENTS_CREATE);

  if (key === "vitals") return hasPerm(permissions, OUTREACH_PERMS.VITALS_CREATE) || hasPerm(permissions, OUTREACH_PERMS.VITALS_EDIT);
  if (key === "encounter") return hasPerm(permissions, OUTREACH_PERMS.ENCOUNTER_CREATE) || hasPerm(permissions, OUTREACH_PERMS.ENCOUNTER_EDIT);
  if (key === "lab") return (
    hasPerm(permissions, OUTREACH_PERMS.LAB_ORDER_CREATE) ||
    hasPerm(permissions, OUTREACH_PERMS.LAB_RESULT_CREATE) ||
    hasPerm(permissions, OUTREACH_PERMS.LAB_CATALOG_VIEW)
  );
  if (key === "pharmacy") return (
    hasPerm(permissions, OUTREACH_PERMS.PHARMACY_DISPENSE_CREATE) ||
    hasPerm(permissions, OUTREACH_PERMS.PHARMACY_CATALOG_VIEW)
  );
  if (key === "immunization") return hasPerm(permissions, OUTREACH_PERMS.IMMUNIZATION_CREATE) || hasPerm(permissions, OUTREACH_PERMS.IMMUNIZATION_EDIT);
  if (key === "blood_donation") return hasPerm(permissions, OUTREACH_PERMS.BLOOD_CREATE) || hasPerm(permissions, OUTREACH_PERMS.BLOOD_EDIT);
  if (key === "counseling") return hasPerm(permissions, OUTREACH_PERMS.COUNSELING_CREATE) || hasPerm(permissions, OUTREACH_PERMS.COUNSELING_EDIT);
  if (key === "maternal") return hasPerm(permissions, OUTREACH_PERMS.MATERNAL_CREATE) || hasPerm(permissions, OUTREACH_PERMS.MATERNAL_EDIT);
  if (key === "referral") return hasPerm(permissions, OUTREACH_PERMS.REFERRAL_CREATE) || hasPerm(permissions, OUTREACH_PERMS.REFERRAL_EDIT);
  if (key === "surgicals") return hasPerm(permissions, OUTREACH_PERMS.SURGICALS_CREATE) || hasPerm(permissions, OUTREACH_PERMS.SURGICALS_EDIT);
  if (key === "eye_checks") return hasPerm(permissions, OUTREACH_PERMS.EYE_CHECKS_CREATE) || hasPerm(permissions, OUTREACH_PERMS.EYE_CHECKS_EDIT);
  if (key === "dental_checks") return hasPerm(permissions, OUTREACH_PERMS.DENTAL_CHECKS_CREATE) || hasPerm(permissions, OUTREACH_PERMS.DENTAL_CHECKS_EDIT);
  if (key === "reports") return hasPerm(permissions, OUTREACH_PERMS.REPORTS_VIEW) || hasPerm(permissions, OUTREACH_PERMS.REPORTS_EXPORT);
  return false;
}

export default function OutreachModuleCards({ modulesEnabled, permissions, isOutreachSuperAdmin = false }) {
  const items = [
    { key: "patients", title: "Patients", desc: "Register and find outreach patients" },
    { key: "vitals", title: OUTREACH_MODULES.vitals.label, desc: OUTREACH_MODULES.vitals.description },
    { key: "encounter", title: OUTREACH_MODULES.encounter.label, desc: OUTREACH_MODULES.encounter.description },
    { key: "lab", title: OUTREACH_MODULES.lab.label, desc: OUTREACH_MODULES.lab.description },
    { key: "pharmacy", title: OUTREACH_MODULES.pharmacy.label, desc: OUTREACH_MODULES.pharmacy.description },
    { key: "immunization", title: OUTREACH_MODULES.immunization.label, desc: OUTREACH_MODULES.immunization.description },
    { key: "blood_donation", title: OUTREACH_MODULES.blood_donation.label, desc: OUTREACH_MODULES.blood_donation.description },
    { key: "counseling", title: OUTREACH_MODULES.counseling.label, desc: OUTREACH_MODULES.counseling.description },
    { key: "maternal", title: OUTREACH_MODULES.maternal.label, desc: OUTREACH_MODULES.maternal.description },
    { key: "referral", title: OUTREACH_MODULES.referral.label, desc: OUTREACH_MODULES.referral.description },
    { key: "surgicals", title: OUTREACH_MODULES.surgicals.label, desc: OUTREACH_MODULES.surgicals.description },
    { key: "eye_checks", title: OUTREACH_MODULES.eye_checks.label, desc: OUTREACH_MODULES.eye_checks.description },
    { key: "dental_checks", title: OUTREACH_MODULES.dental_checks.label, desc: OUTREACH_MODULES.dental_checks.description },
    { key: "reports", title: "Reports", desc: "Generate/view outreach exports" },
  ].filter((x) => canSeeModule({ ...x, modulesEnabled, permissions, isOutreachSuperAdmin }));

  return (
    <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {items.map((m) => {
        const Icon = ICONS[m.key] || FileText;
        return (
          <Link
            key={m.key}
            href={ROUTES[m.key] || "/outreach"}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-100 blur-2xl opacity-70" />
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600/10 text-blue-700">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900">{m.title}</h3>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
                </div>
                <p className="mt-1 text-sm text-slate-600">{m.desc}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
