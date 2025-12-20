"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LabDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to orders list
    router.replace("/lab/orders");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading lab dashboard…</span>
      </div>
    </main>
  );
}