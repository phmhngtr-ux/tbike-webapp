import { api } from "../lib/api";
import type { DashboardSummary, StaffProfile } from "../lib/types";

export const staffApi = {
  me: () => api<StaffProfile>("/api/me"),
  dashboard: () => api<DashboardSummary>("/api/dashboard/summary"),
};
