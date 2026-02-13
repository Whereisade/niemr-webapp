export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import FAQClient from "@/components/faq/FAQClient";
import { getPatientFaq } from "@/lib/faqData";

const BACKEND = process.env.NIEMR_BACKEND_URL || "http://localhost:8000";
const ACCESS_COOKIE = process.env.ACCESS_COOKIE || "niemr_access";

async function fetchMe(token) {
  if (!token) return null;
  try {
    const res = await fetch(`${BACKEND}/api/accounts/me/`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function PatientFAQPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value || null;

  if (!token) redirect("/login/patient");

  const me = await fetchMe(token);
  if (!me) redirect("/login/patient");

  if (String(me?.role || "").toUpperCase() !== "PATIENT") {
    redirect("/login/patient");
  }

  const data = getPatientFaq();

  return (
    <FAQClient
      title={data.title}
      subtitle={data.subtitle}
      portalLabel={data.portalLabel}
      backHref={data.backHref}
      roleLabel={data.roleLabel}
      categories={data.categories}
    />
  );
}
