"use client";

import { toast } from "sonner";

export interface ApiError extends Error {
  status?: number;
  details?: unknown;
}

/**
 * Typed fetch wrapper with consistent error handling.
 * Throws ApiError on non-OK responses or network failures.
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
  opts?: { silent?: boolean; errorMessage?: string }
): Promise<T> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err: ApiError = new Error(
        data?.error ?? opts?.errorMessage ?? `Request failed (${res.status})`
      );
      err.status = res.status;
      err.details = data;
      throw err;
    }
    return data as T;
  } catch (err) {
    const apiErr = err as ApiError;
    if (!opts?.silent) {
      toast.error(apiErr.message ?? "Network error", {
        description: apiErr.status ? `Status ${apiErr.status}` : undefined,
      });
    }
    throw apiErr;
  }
}

/**
 * Refresh the audit log from the server.
 * Returns the audit entries on success, or null on failure.
 * Failures are logged but not surfaced to the user (non-critical refresh).
 */
export async function refreshAudit(): Promise<unknown[] | null> {
  try {
    const res = await fetch("/api/ingest", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.audit ?? null;
  } catch (err) {
    console.error("[refreshAudit] failed:", err);
    return null;
  }
}
