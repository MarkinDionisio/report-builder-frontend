import { describe, expect, it, vi } from "vitest";
import * as client from "../../../shared/api/client";
import { ok } from "../../../shared/result/result";
import { creatorApi } from "./creatorApi";

describe("creator execution API", () => {
  it("sends typed execution parameters", async () => {
    const fetchSpy = vi.spyOn(client, "apiFetch").mockResolvedValueOnce(ok(new Response(JSON.stringify({ columns: [], rows: [], page: 1, pageSize: 50, rowCount: 0, durationMs: 1 }), { status: 200, headers: { "Content-Type": "application/json" } })));
    await creatorApi.executeReport("report-1", { parameters: { start: "2026-08-14T03:00:00.000Z", storeId: "store-1" }, filters: [], page: 1, pageSize: 50 });
    expect(fetchSpy).toHaveBeenCalledWith("/api/v1/reports/report-1/execute", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ parameters: { start: "2026-08-14T03:00:00.000Z", storeId: "store-1" }, filters: [], page: 1, pageSize: 50 }),
    }));
  });
});
