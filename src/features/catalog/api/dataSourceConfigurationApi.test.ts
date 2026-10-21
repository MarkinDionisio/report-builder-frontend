import { afterEach, expect, it, vi } from "vitest";
import { catalogApi } from "./catalogApi";
import * as client from "../../../shared/api/client";
import { ok, err, isErr } from "../../../shared/result/result";
afterEach(() => vi.restoreAllMocks());
it("posts unsaved connection settings and certificate to the configuration-test endpoint", async () => {
  const spy = vi.spyOn(client, "apiFetch").mockResolvedValue(ok(new Response(JSON.stringify({ succeeded: false, adminConnection: { succeeded: true, errorCode: null }, executionConnection: { succeeded: false, readOnlyVerified: false, errorCode: "failed" } }))));
  const payload = { provider: "postgresql" as const, adminConnectionString: "admin", executionConnectionString: "execution", clientCertificate: { pfxBase64: "cGZ4", password: "password" } };
  const result = await catalogApi.testDataSourceConfiguration(payload);
  expect(spy).toHaveBeenCalledWith("/api/v1/data-sources/test-configuration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.value.executionConnection.readOnlyVerified).toBe(false);
});
it("preserves validation failures from the API", async () => {
  vi.spyOn(client, "apiFetch").mockResolvedValue(err({ type: "about:blank", title: "Invalid certificate", status: 400, detail: "Certificado inválido.", instance: "/api/v1/data-sources/test-configuration" }));
  const result = await catalogApi.testDataSourceConfiguration({ provider: "postgresql", adminConnectionString: "admin", executionConnectionString: "execution" });
  expect(isErr(result)).toBe(true);
});
