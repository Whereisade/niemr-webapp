// lib/useRecordHMOPayment.js
"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * Hook for recording HMO payments
 * 
 * Usage:
 *  const { recordPayment, isLoading, error } = useRecordHMOPayment();
 * 
 *  await recordPayment({
 *    hmo_id: 5,
 *    amount: "50000.00",
 *    method: "TRANSFER",
 *    reference: "HMO-JAN-2025",
 *    note: "Monthly settlement",
 *    period_start: "2025-01-01",
 *    period_end: "2025-01-31",
 *    auto_allocate: true
 *  });
 */
export function useRecordHMOPayment() {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const recordPayment = async (paymentData) => {
    setLoading(true);
    setError(null);

    try {
      // Use apiFetch (direct backend call) - matches pattern from useHMOFinancials
      const response = await apiFetch("/billing/payments/hmo-payment/", {
        method: "POST",
        body: JSON.stringify(paymentData),
      });

      return response;
    } catch (err) {
      console.error("Error recording HMO payment:", err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { recordPayment, isLoading, error };
}