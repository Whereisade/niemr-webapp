// components/billing/PatientDropdown.js
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { UserRound, Loader2, Search, X, ChevronDown } from "lucide-react";

export default function PatientDropdown({ value, onChange, placeholder = "Select patient…", className = "" }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const wrapperRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPatients() {
      try {
        setLoading(true);
        setError("");
        const res = await apiFetch("/patients/?page=1&limit=200");
        if (cancelled) return;
        const items = Array.isArray(res) ? res : res?.results || [];
        setPatients(items);
      } catch (err) {
        console.error("Failed to load patients", err);
        if (!cancelled) {
          setError(err?.message || "Failed to load patients");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPatients();

    return () => {
      cancelled = true;
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter patients based on search term
  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return patients;
    
    const query = searchTerm.toLowerCase();
    return patients.filter((p) => {
      const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ").toLowerCase();
      const email = (p.email || "").toLowerCase();
      const id = String(p.id);
      const mrn = (p.mrn || "").toLowerCase();
      
      return (
        fullName.includes(query) ||
        email.includes(query) ||
        id.includes(query) ||
        mrn.includes(query)
      );
    });
  }, [patients, searchTerm]);

  // Get selected patient display name
  const selectedPatient = patients.find((p) => String(p.id) === String(value));
  const selectedDisplayName = selectedPatient
    ? (() => {
        const fullName = [selectedPatient.first_name, selectedPatient.last_name].filter(Boolean).join(" ");
        return fullName || selectedPatient.email || `Patient #${selectedPatient.id}`;
      })()
    : "";

  const handleSelect = (patientId) => {
    onChange?.(String(patientId));
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.("");
    setSearchTerm("");
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !loading && !error && setIsOpen(!isOpen)}
        disabled={loading || !!error}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm outline-none focus:border-slate-400 disabled:opacity-60"
      >
        <span className={value ? "text-slate-900" : "text-slate-500"}>
          {loading
            ? "Loading patients…"
            : error
            ? "Error loading patients"
            : value
            ? selectedDisplayName
            : placeholder}
        </span>
        
        <div className="flex items-center gap-1">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          {value && !loading && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-0.5 hover:bg-slate-100"
            >
              <X className="h-3.5 w-3.5 text-slate-400" />
            </button>
          )}
          {!loading && <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {/* Dropdown panel */}
      {isOpen && !loading && !error && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
          {/* Search input */}
          <div className="border-b border-slate-100 p-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or ID…"
                className="flex-1 border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="rounded p-0.5 hover:bg-slate-200"
                >
                  <X className="h-3.5 w-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          {/* Patient list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredPatients.length > 0 ? (
              <>
                {/* "All patients" option */}
                {!searchTerm && (
                  <button
                    type="button"
                    onClick={() => handleSelect("")}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                      !value ? "bg-blue-50 text-blue-700" : "text-slate-700"
                    }`}
                  >
                    <UserRound className="h-4 w-4 text-slate-400" />
                    <span className="font-medium">All patients</span>
                  </button>
                )}
                
                {filteredPatients.map((p) => {
                  const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ");
                  const displayName = fullName || p.email || `Patient #${p.id}`;
                  const isSelected = String(p.id) === String(value);

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelect(p.id)}
                      className={`flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-slate-50 ${
                        isSelected ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="mt-0.5">
                        <UserRound className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${isSelected ? "text-blue-700" : "text-slate-900"}`}>
                          {displayName}
                        </div>
                        <div className="text-xs text-slate-500">
                          ID: {p.id}
                          {p.mrn ? ` • MRN: ${p.mrn}` : ""}
                          {p.email ? ` • ${p.email}` : ""}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </>
            ) : (
              <div className="px-3 py-6 text-center text-sm text-slate-500">
                No patients found matching &quot;{searchTerm}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}