import "server-only";
import { DEFAULT_SETTINGS, type AppSettings } from "@/types/settings";

// In-memory settings store. Persists for the lifetime of the server process.
// In production this would be backed by a database table.

declare global {
  var __appSettings: AppSettings | undefined;
}

export function getSettings(): AppSettings {
  if (!globalThis.__appSettings) {
    globalThis.__appSettings = { ...DEFAULT_SETTINGS };
  }
  return globalThis.__appSettings;
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const next = { ...current, ...patch };
  globalThis.__appSettings = next;
  return next;
}

export function resetSettings(): AppSettings {
  globalThis.__appSettings = { ...DEFAULT_SETTINGS };
  return globalThis.__appSettings;
}
