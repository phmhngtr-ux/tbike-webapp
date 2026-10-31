import { useQuery } from "@tanstack/react-query";
import { ApiError } from "../../lib/api";
import { qk } from "../../services/queryKeys";
import { rentalsApi } from "../../services/rentalsApi";

export function useOrder(maDon: string) {
  const q = useQuery({ queryKey: qk.order(maDon), queryFn: () => rentalsApi.getOrder(maDon) });
  const notFound = q.error instanceof ApiError && q.error.status === 404;
  return { ...q, notFound };
}
