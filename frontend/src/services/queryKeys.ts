import type { QueryClient } from "@tanstack/react-query";

export const qk = {
  me: ["me"] as const,
  dashboard: ["dashboard"] as const,
  vehicles: ["vehicles"] as const,
  maintenance: ["maintenance"] as const,
  requests: ["requests"] as const,
  order: (code: string) => ["order", code] as const,
  request: (code: string) => ["request", code] as const,
  depositMethods: ["deposit-methods"] as const,
};

/** Sau moi thao tac ghi: lam moi tat ca man hinh lien quan (dashboard, xe, bao duong, don). */
export function invalidateOperational(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: qk.dashboard }),
    client.invalidateQueries({ queryKey: qk.vehicles }),
    client.invalidateQueries({ queryKey: qk.maintenance }),
    client.invalidateQueries({ queryKey: qk.requests }),
    client.invalidateQueries({ queryKey: ["order"] }),
    client.invalidateQueries({ queryKey: ["request"] }),
  ]);
}
