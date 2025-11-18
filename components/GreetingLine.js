// components/GreetingLine.js
"use client";

import { useEffect, useState } from "react";

function computeGreeting() {
  const now = new Date();
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Renders a time-of-day greeting using the browser's local time.
 * Example: "Good morning, Odus Adewale · My Facility"
 */
export default function GreetingLine({ name, className = "" }) {
  const [prefix, setPrefix] = useState("");

  useEffect(() => {
    setPrefix(computeGreeting());
  }, []);

  const base = prefix || "Hello";
  const full = name ? `${base}, ${name}` : base;

  return <h1 className={className}>{full}</h1>;
}
