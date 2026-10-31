import { describe, expect, it } from "vitest";
import { formatDateTime, formatDuration, formatVnd, rentalDays, slugify, toApiDateTime, toLocalInput } from "../format";

describe("format", () => {
  it("formats VND with dot separators", () => {
    expect(formatVnd(150000)).toBe("150.000đ");
    expect(formatVnd(1000000)).toBe("1.000.000đ");
    expect(formatVnd(null)).toBe("—");
  });
  it("converts datetime-local (VN time) to ISO with +07:00", () => {
    expect(toApiDateTime("2026-10-28T09:00")).toBe("2026-10-28T09:00:00+07:00");
    expect(() => toApiDateTime("28/10/2026")).toThrow();
  });
  it("renders instants in Asia/Ho_Chi_Minh regardless of input offset", () => {
    expect(formatDateTime("2026-10-28T02:00:00Z")).toBe("28/10/2026 09:00");
    expect(toLocalInput("2026-10-28T02:00:00+00:00")).toBe("2026-10-28T09:00");
  });
  it("formats durations", () => {
    expect(formatDuration(59)).toBe("59 phút");
    expect(formatDuration(150)).toBe("2 giờ 30 phút");
    expect(formatDuration(480)).toBe("8 giờ");
  });
  it("computes rental days rounded up per 24h, min 1", () => {
    expect(rentalDays("2026-10-28T09:00:00+07:00", "2026-10-29T09:00:00+07:00")).toBe(1);
    expect(rentalDays("2026-10-28T09:00:00+07:00", "2026-10-29T10:00:00+07:00")).toBe(2);
    expect(rentalDays("2026-10-28T09:00:00+07:00", "2026-10-28T12:00:00+07:00")).toBe(1);
  });
  it("slugifies Vietnamese names for image files", () => {
    expect(slugify("Honda Air Blade")).toBe("honda-air-blade");
    expect(slugify("Xe Đà Nẵng 125")).toBe("xe-da-nang-125");
  });
});
