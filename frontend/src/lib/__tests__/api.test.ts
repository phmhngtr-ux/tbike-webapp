import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, buildUrl, configureApi, errorMessage, fieldErrors } from "../api";

afterEach(() => vi.restoreAllMocks());

describe("api client", () => {
  it("builds query strings and skips empty values", () => {
    expect(buildUrl("/api/x", { a: 1, b: "", c: undefined, d: ["DaGui", "DaXacNhan"] })).toBe("/api/x?a=1&d=DaGui&d=DaXacNhan");
  });

  it("sends bearer token and parses JSON", async () => {
    configureApi({ getToken: async () => "tok", onUnauthorized: () => {} });
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    await expect(api("/api/me")).resolves.toEqual({ ok: 1 });
    const init = spy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("maps backend error envelope and triggers onUnauthorized on 401", async () => {
    const onUnauth = vi.fn();
    configureApi({ getToken: async () => "tok", onUnauthorized: onUnauth });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "TOKEN_INVALID", message: "Hết hạn" } }), { status: 401 }),
    );
    const err = (await api("/api/me").catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("TOKEN_INVALID");
    expect(onUnauth).toHaveBeenCalledWith("TOKEN_INVALID");
  });

  it("does not require a token for public calls", async () => {
    configureApi({ getToken: async () => null, onUnauthorized: () => {} });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("[]", { status: 200 }));
    await expect(api("/api/rental-pricing", { auth: false })).resolves.toEqual([]);
  });

  it("fails fast without token on protected calls", async () => {
    const onUnauth = vi.fn();
    configureApi({ getToken: async () => null, onUnauthorized: onUnauth });
    await expect(api("/api/me")).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
    expect(onUnauth).toHaveBeenCalled();
  });

  it("reports network failures", async () => {
    configureApi({ getToken: async () => "t", onUnauthorized: () => {} });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fail"));
    await expect(api("/api/me")).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });

  it("extracts field errors", () => {
    const e = new ApiError(422, "VALIDATION_ERROR", "Dữ liệu gửi lên không hợp lệ", [{ field: "so_dien_thoai", message: "Value error, Sai số" }]);
    expect(fieldErrors(e)).toEqual({ so_dien_thoai: "Sai số" });
    expect(errorMessage(e)).toBe("Dữ liệu gửi lên không hợp lệ: Sai số");
  });
});
