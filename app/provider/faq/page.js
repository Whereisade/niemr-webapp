export const dynamic = "force-dynamic";

import FAQClient from "@/components/faq/FAQClient";
import { getProviderFaq } from "@/lib/faqData";
import { requireIndependentProvider } from "@/lib/serverAuth";

export default async function ProviderFAQPage() {
  const { me } = await requireIndependentProvider({ loginPath: "/login/provider" });
  const role = String(me?.role || "").toUpperCase();

  const data = getProviderFaq(role);

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
