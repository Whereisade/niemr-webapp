// components/nurse/NurseWorkflow.js
"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { DateTime } from "luxon";
import { Loader2, PlusCircle } from "lucide-react";

export default function NurseWorkflow({ patientId }) {
  // States for vitals, lab requests, prescriptions, reminders
  const [vitals, setVitals] = useState({ bp: "", hr: "", temp: "", rr: "", spo2: "", bmi: "" });
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
    try {
      const response = await apiFetch(`/vitals/`, {
        method: "POST",
        body: JSON.stringify(vitals),
      });
      setSuccessMessage("Vitals recorded successfully.");
    } catch (error) {
      setReminderError("Error recording vitals.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitLabRequest = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/labs/`, {
        method: "POST",
        body: JSON.stringify({
          patient: patientId,
          test_type: labTest,
        }),
      });
      setSuccessMessage("Lab request created successfully.");
    } catch (error) {
      setReminderError("Error creating lab request.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPrescription = async () => {
    setLoading(true);
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
    } catch (error) {
      setReminderError("Error creating prescription.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReminder = async () => {
    setLoading(true);
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
    } catch (error) {
      setReminderError("Error setting reminder.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Vitals Section */}
      <section className="rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-medium">Record Vitals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {["bp", "hr", "temp", "rr", "spo2", "bmi"].map((field) => (
            <div key={field}>
              <label className="block text-sm">{field.toUpperCase()}</label>
              <input
                type="text"
                name={field}
                value={vitals[field]}
                onChange={handleVitalsChange}
                className="w-full border p-2 rounded-md"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSubmitVitals}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Submit Vitals"}
          </button>
        </div>
        {successMessage && <p className="mt-2 text-green-500">{successMessage}</p>}
      </section>

      {/* Lab Request Section */}
      <section className="rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-medium">Request Lab Test</h2>
        <div>
          <label className="block text-sm">Lab Test</label>
          <input
            type="text"
            value={labTest}
            onChange={handleLabChange}
            className="w-full border p-2 rounded-md"
            placeholder="Enter lab test (e.g., Blood test)"
          />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSubmitLabRequest}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Request Lab Test"}
          </button>
        </div>
        {successMessage && <p className="mt-2 text-green-500">{successMessage}</p>}
      </section>

      {/* Prescription Section */}
      <section className="rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-medium">Prescribe Medication</h2>
        <div>
          <label className="block text-sm">Medication Name</label>
          <input
            type="text"
            value={medication}
            onChange={handleMedicationChange}
            className="w-full border p-2 rounded-md"
            placeholder="Enter medication name (e.g., Paracetamol)"
          />
        </div>
        <div>
          <label className="block text-sm">Dosage</label>
          <input
            type="text"
            value={dosage}
            onChange={handleDosageChange}
            className="w-full border p-2 rounded-md"
            placeholder="Enter dosage (e.g., 500mg)"
          />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSubmitPrescription}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Prescribe Medication"}
          </button>
        </div>
        {successMessage && <p className="mt-2 text-green-500">{successMessage}</p>}
      </section>

      {/* Reminder Section */}
      <section className="rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-medium">Set a Reminder</h2>
        {reminderError && <p className="text-red-500">{reminderError}</p>}
        {successMessage && <p className="text-green-500">{successMessage}</p>}
        <div>
          <label htmlFor="message" className="block text-sm">Reminder Message</label>
          <textarea
            id="message"
            name="message"
            rows={3}
            value={reminderMessage}
            onChange={handleReminderChange}
            className="w-full border p-2 rounded-md"
            placeholder="Enter reminder message..."
          />
        </div>
        <div className="mt-4">
          <label htmlFor="reminder_time" className="block text-sm">Reminder Time</label>
          <input
            type="datetime-local"
            name="reminder_time"
            value={reminderTime}
            onChange={handleReminderChange}
            className="w-full border p-2 rounded-md"
          />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSubmitReminder}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Set Reminder"}
          </button>
        </div>
      </section>
    </div>
  );
}
