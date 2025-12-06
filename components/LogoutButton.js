"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";

export default function LogoutButton({ className = "" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading || isPending) return;

    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (err) {
      // you can optionally log this
      console.error("Logout failed:", err);
    } finally {
      setLoading(false);

      // Make sure we land on the login page and clear any cached UI
      startTransition(() => {
        router.push("/login");
        router.refresh();
      });
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 ${className}`}
    >
      <LogOut className="h-4 w-4" />
      <span>{loading || isPending ? "Logging out..." : "Log out"}</span>
    </button>
  );
}
