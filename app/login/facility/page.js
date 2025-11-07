import AuthForm from "@/components/AuthForm";
export const metadata = { title: "Facility Login — NIEMR" };
export default function FacilityLoginPage() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <AuthForm role="Hospital / Facility" />
    </div>
  );
}
