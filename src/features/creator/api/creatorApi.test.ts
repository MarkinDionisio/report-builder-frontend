import { describe, expect, it, vi } from "vitest";
import * as client from "../../../shared/api/client";
import { ok } from "../../../shared/result/result";
import { creatorApi } from "./creatorApi";

describe("creator execution API", () => {
  it("uses the creator data-source discovery endpoint", async () => {
    const fetchSpy = vi.spyOn(client, "apiFetch").mockResolvedValueOnce(ok(new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } })));

    await creatorApi.getCreatorDataSources("org-1");

    expect(fetchSpy).toHaveBeenCalledWith("/api/v1/organizations/org-1/report-designer/data-sources");
  });

  it("sends typed execution parameters", async () => {
    const fetchSpy = vi.spyOn(client, "apiFetch").mockResolvedValueOnce(ok(new Response(JSON.stringify({ columns: [], rows: [], page: 1, pageSize: 50, rowCount: 0, durationMs: 1 }), { status: 200, headers: { "Content-Type": "application/json" } })));
    await creatorApi.executeReport("report-1", { parameters: { start: "2026-08-14T03:00:00.000Z", storeId: "store-1" }, filters: [], page: 1, pageSize: 50 });
    expect(fetchSpy).toHaveBeenCalledWith("/api/v1/reports/report-1/execute", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ parameters: { start: "2026-08-14T03:00:00.000Z", storeId: "store-1" }, filters: [], page: 1, pageSize: 50 }),
    }));
  });
});

it("sends import requests as JSON with the target organization and data source", async () => {
  const request = { organizationId: "target", dataSourceId: "source", title: "Cópia" };
  const spy = vi.spyOn(client, "apiFetch").mockResolvedValue(ok(new Response(JSON.stringify({ canImport: true, issues: [] }), { status: 200 })));
  await creatorApi.checkReportImport("global", request);
  expect(spy).toHaveBeenLastCalledWith("/api/v1/reports/global/import-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
  spy.mockResolvedValueOnce(ok(new Response(JSON.stringify({ id: "copy" }), { status: 201 })));
  await creatorApi.importReport("global", request);
  expect(spy).toHaveBeenLastCalledWith("/api/v1/reports/global/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
});

it("encodes the catalog search alongside pagination", async () => {
  const spy = vi.spyOn(client, "apiFetch").mockResolvedValueOnce(ok(new Response(JSON.stringify({ data: [] }), { status: 200 })));
  await creatorApi.listGlobalTemplates(2, "Vendas & estoque");
  expect(spy).toHaveBeenCalledWith("/api/v1/reports/global-templates?page=2&pageSize=10&search=Vendas%20%26%20estoque");
});


it("resolves names once per organization when the tag endpoint lacks names", async () => {
  const json = (body: unknown) => ok(new Response(JSON.stringify(body), {status:200}));
  const spy = vi.spyOn(client, "apiFetch").mockClear().mockResolvedValueOnce(json([
    {id:"sales",name:"Vendas",organizationId:"org"},
    {id:"finance",name:"Financeiro",organizationId:"org"},
    {id:"other",name:"Vendas",organizationId:"other",organizationName:"Outra empresa"},
  ])).mockResolvedValueOnce(json({data:[{organizationId:"org",organizationName:"Fabrica Sistemas"}]}));
  const result = await creatorApi.listReportTags();
  expect(result).toEqual(ok([
    {id:"sales",name:"Vendas",organizationId:"org",organizationName:"Fabrica Sistemas"},
    {id:"finance",name:"Financeiro",organizationId:"org",organizationName:"Fabrica Sistemas"},
    {id:"other",name:"Vendas",organizationId:"other",organizationName:"Outra empresa"},
  ]));
  expect(spy).toHaveBeenCalledTimes(2);
  expect(spy.mock.calls[1][0]).toContain("organizationId=org");
});

it("does not query reports when tag names already contain the organization", async () => {
  const tags=[{id:"sales",name:"Vendas",organizationId:"org",organizationName:"Fabrica Sistemas"}];
  const spy=vi.spyOn(client,"apiFetch").mockClear().mockResolvedValueOnce(ok(new Response(JSON.stringify(tags),{status:200})));
  expect(await creatorApi.listReportTags()).toEqual(ok(tags));
  expect(spy).toHaveBeenCalledTimes(1);
});
