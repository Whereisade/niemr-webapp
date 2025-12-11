// components/nurse/NurseWorkflow.js
"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { DateTime } from "luxon";
import { Loader2, PlusCircle } from "lucide-react";

export default function NurseWorkflow({ patientId }) {
  // States for vitals - using proper field names that match backend
  const [vitals, setVitals] = useState({
    systolic: "",
    diastolic: "",
    heart_rate: "",
    temp_c: "",
    resp_rate: "",
    spo2: "",
    weight_kg: "",
    height_cm: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderTime, setReminderTime] = useState(DateTime.now().toISO());
  const [reminderError, setReminderError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [labTest, setLabTest] = useState("");
  const [medication, setMedication] = useState("");
  const [dosage, setDosage] = useState("");

  // Handle form changes
  const handleVitalsChange = (e) => {
    const { name, value } = e.target;
    setVitals((prev) => ({ ...prev, [name]: value }));
  };

  const handleReminderChange = (e) => {
    const { name, value } = e.target;
    if (name === "message") setReminderMessage(value);
    if (name === "reminder_time") setReminderTime(value);
  };

  const handleLabChange = (e) => setLabTest(e.target.value);
  const handleMedicationChange = (e) => setMedication(e.target.value);
  const handleDosageChange = (e) => setDosage(e.target.value);

  const handleSubmitVitals = async () => {
    setLoading(true);
    setReminderError("");
    setSuccessMessage("");
    
    try {
      // Build payload with required fields
      const payload = {
        patient: patientId, // 🔧 FIXED: Include patient ID
        measured_at: new Date().toISOString(), // 🔧 FIXED: Include current timestamp
      };

      // Add vitals only if they have values (convert to numbers for numeric fields)
      if (vitals.systolic) payload.systolic = parseInt(vitals.systolic);
      if (vitals.diastolic) payload.diastolic = parseInt(vitals.diastolic);
      if (vitals.heart_rate) payload.heart_rate = parseInt(vitals.heart_rate);
      if (vitals.temp_c) payload.temp_c = parseFloat(vitals.temp_c);
      if (vitals.resp_rate) payload.resp_rate = parseInt(vitals.resp_rate);
      if (vitals.spo2) payload.spo2 = parseInt(vitals.spo2);
      if (vitals.weight_kg) payload.weight_kg = parseFloat(vitals.weight_kg);
      if (vitals.height_cm) payload.height_cm = parseFloat(vitals.height_cm);

      const response = await apiFetch(`/vitals/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      setSuccessMessage("Vitals recorded successfully.");
      // Reset form
      setVitals({
        systolic: "",
        diastolic: "",
        heart_rate: "",
        temp_c: "",
        resp_rate: "",
        spo2: "",
        weight_kg: "",
        height_cm: "",
      });
    } catch (error) {
      console.error("Error recording vitals:", error);
      setReminderError(error?.message || "Error recording vitals.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitLabRequest = async () => {
    setLoading(true);
    setReminderError("");
    setSuccessMessage("");
    
    try {
      const response = await apiFetch(`/labs/`, {
        method: "POST",
        body: JSON.stringify({
          patient: patientId,
          test_type: labTest,
        }),
      });
      setSuccessMessage("Lab request created successfully.");
      setLabTest("");
    } catch (error) {
      console.error("Error creating lab request:", error);
      setReminderError(error?.message || "Error creating lab request.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPrescription = async () => {
    setLoading(true);
    setReminderError("");
    setSuccessMessage("");
    
    try {
      const response = await apiFetch(`/pharmacy/`, {
        method: "POST",
        body: JSON.stringify({
          patient: patientId,
          medication_name: medication,
          dosage,
        }),
      });
      setSuccessMessage("Prescription created successfully.");
      setMedication("");
      setDosage("");
    } catch (error) {
      console.error("Error creating prescription:", error);
      setReminderError(error?.message || "Error creating prescription.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReminder = async () => {
    setLoading(true);
    setReminderError("");
    setSuccessMessage("");
    
    try {
      const response = await apiFetch(`/notifications/reminders/`, {
        method: "POST",
        body: JSON.stringify({
          patient: patientId,
          message: reminderMessage,
          reminder_time: reminderTime,
        }),
      });
      setSuccessMessage("Reminder set successfully.");
      setReminderMessage("");
    } catch (error) {
      console.error("Error setting reminder:", error);
      setReminderError(error?.message || "Error setting reminder.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Global error/success messages */}
      {reminderError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {reminderError}
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* Vitals Section */}
      <section className="rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-medium mb-4">Record Vitals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Blood Pressure - Systolic (mmHg)</label>
            <input
              type="number"
              name="systolic"
              value={vitals.systolic}
              onChange={handleVitalsChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="e.g., 120"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Blood Pressure - Diastolic (mmHg)</label>
            <input
              type="number"
              name="diastolic"
              value={vitals.diastolic}
              onChange={handleVitalsChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="e.g., 80"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Heart Rate (bpm)</label>
            <input
              type="number"
              name="heart_rate"
              value={vitals.heart_rate}
              onChange={handleVitalsChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="e.g., 72"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Temperature (°C)</label>
            <input
              type="number"
              step="0.1"
              name="temp_c"
              value={vitals.temp_c}
              onChange={handleVitalsChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="e.g., 36.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Respiratory Rate (breaths/min)</label>
            <input
              type="number"
              name="resp_rate"
              value={vitals.resp_rate}
              onChange={handleVitalsChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="e.g., 16"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">SpO2 (%)</label>
            <input
              type="number"
              name="spo2"
              value={vitals.spo2}
              onChange={handleVitalsChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="e.g., 98"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              name="weight_kg"
              value={vitals.weight_kg}
              onChange={handleVitalsChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="e.g., 70.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Height (cm)</label>
            <input
              type="number"
              step="0.1"
              name="height_cm"
              value={vitals.height_cm}
              onChange={handleVitalsChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="e.g., 175"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSubmitVitals}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
            {loading ? "Submitting..." : "Submit Vitals"}
          </button>
        </div>
      </section>

      {/* Lab Request Section */}
      <section className="rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-medium mb-4">Request Lab Test</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Lab Test</label>
          <input
            type="text"
            value={labTest}
            onChange={handleLabChange}
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Enter lab test (e.g., Blood test)"
          />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSubmitLabRequest}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
            {loading ? "Submitting..." : "Request Lab Test"}
          </button>
        </div>
      </section>

      {/* Prescription Section */}
      <section className="rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-medium mb-4">Prescribe Medication</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Medication Name</label>
            <input
              type="text"
              value={medication}
              onChange={handleMedicationChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Enter medication name (e.g., Paracetamol)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Dosage</label>
            <input
              type="text"
              value={dosage}
              onChange={handleDosageChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Enter dosage (e.g., 500mg)"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSubmitPrescription}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
            {loading ? "Submitting..." : "Prescribe Medication"}
          </button>
        </div>
      </section>

      {/* Reminder Section */}
      <section className="rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-medium mb-4">Set a Reminder</h2>
        <div className="space-y-3">
          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-1">Reminder Message</label>
            <textarea
              id="message"
              name="message"
              rows={3}
              value={reminderMessage}
              onChange={handleReminderChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Enter reminder message..."
            />
          </div>
          <div>
            <label htmlFor="reminder_time" className="block text-sm font-medium mb-1">Reminder Time</label>
            <input
              type="datetime-local"
              name="reminder_time"
              value={reminderTime}
              onChange={handleReminderChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSubmitReminder}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
            {loading ? "Submitting..." : "Set Reminder"}
          </button>
        </div>
      </section>
    </div>
  );
}