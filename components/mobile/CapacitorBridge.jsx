"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

/**
 * Small native integration layer shared by the web app and Android shell.
 *
 * On the normal website this component is effectively a no-op. On Android,
 * it maps the native back button to browser/Next.js history first, and exits
 * only when there is no navigation history left.
 */
export default function CapacitorBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    let listenerHandle;
    let cancelled = false;

    const setup = async () => {
      const handle = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
          return;
        }

        App.exitApp();
      });

      if (cancelled) {
        await handle.remove();
        return;
      }

      listenerHandle = handle;
    };

    setup().catch((error) => {
      console.error("NIEMR Capacitor back-button setup failed:", error);
    });

    return () => {
      cancelled = true;
      listenerHandle?.remove?.();
    };
  }, []);

  return null;
}
