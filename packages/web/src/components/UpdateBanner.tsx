"use client";

import { useEffect, useState } from "react";
import { Snackbar, Button } from "@mui/material";

export default function UpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // If there's already a waiting worker on load
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        return;
      }

      // Detect new SW installing
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New SW is installed but waiting — means update is available
            setWaitingWorker(newWorker);
          }
        });
      });
    });

    // When the new SW activates and takes control, reload to get fresh content
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = () => {
    waitingWorker?.postMessage("SKIP_WAITING");
  };

  return (
    <Snackbar
      open={!!waitingWorker}
      message="A new version is available"
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      action={
        <Button color="primary" size="small" onClick={handleUpdate}>
          Reload
        </Button>
      }
    />
  );
}
