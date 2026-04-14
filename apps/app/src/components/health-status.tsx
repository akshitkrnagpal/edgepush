"use client";

import { useEffect, useState } from "react";

type Status = "checking" | "running" | "degraded" | "unreachable";

export function HealthStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    // Always call same-origin /api/health to avoid CORS issues.
    // The app worker's catch-all route handles this endpoint.
    fetch("/api/health", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { status?: string }) => {
        if (data.status === "ok") setStatus("running");
        else setStatus("degraded");
      })
      .catch(() => setStatus("unreachable"));
  }, []);

  const color =
    status === "running"
      ? "text-success"
      : status === "degraded"
        ? "text-warning"
        : status === "unreachable"
          ? "text-error"
          : "text-muted";

  const dot = status === "checking" ? "○" : "●";

  return (
    <span className={color}>
      {dot} {status}
    </span>
  );
}
