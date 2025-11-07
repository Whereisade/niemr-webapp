import AuthForm from "@/components/AuthForm";
export const metadata = { title: "Provider Login — NIEMR" };
export default function ProviderLoginPage() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <AuthForm role="Independent Provider" />
    </div>
  );
}
