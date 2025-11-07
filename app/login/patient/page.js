import AuthForm from "@/components/AuthForm";
export const metadata = { title: "Patient Login — NIEMR" };
export default function PatientLoginPage() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <AuthForm role="Patient" />
    </div>
  );
}
