export const dynamic = "force-dynamic";

import FAQClient from "@/components/faq/FAQClient";
import { getFacilityFaq } from "@/lib/faqData";
import { requireFacilityStaff } from "@/lib/serverAuth";

export default async function FacilityFAQPage() {
  const { me } = await requireFacilityStaff({ loginPath: "/login/facility" });
  const role = String(me?.role || "").toUpperCase();

  const data = getFacilityFaq(role);

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
