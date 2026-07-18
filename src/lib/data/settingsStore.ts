import "server-only";
import { getSettings, updateSettings, resetSettings } from "@/lib/data/store";
import type { AppSettings } from "@/types/settings";

export { getSettings, updateSettings, resetSettings };
export type { AppSettings };
