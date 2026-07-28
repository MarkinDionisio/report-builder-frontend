import { describe, it, expect, vi } from "vitest";
import { catalogApi } from "./catalogApi";
import * as client from "../../../shared/api/client";
import { isOk, isErr, ok, err } from "../../../shared/result/result";

describe("Catalog API Service (Result Pattern)", () => {
  it("should list profiles for an organization", async () => {
    const mockProfiles = [
      {
        id: "prof-1",
        name: "Financeiro",
        organizationId: "org-1",
        organizationName: "Org Test",
        description: "Acesso aos relatórios financeiros",
      },
    ];

    const mockResponse = new Response(JSON.stringify(mockProfiles), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const fetchSpy = vi.spyOn(client, "apiFetch").mockResolvedValueOnce(ok(mockResponse));

    const result = await catalogApi.listProfiles("org-1");
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].name).toBe("Financeiro");
    }
    expect(fetchSpy).toHaveBeenCalledWith("/api/v1/organizations/org-1/profiles");
  });

  it("should create profile with trimmed name and description", async () => {
    const mockProfile = {
      id: "prof-2",
      name: "Vendas",
      organizationId: "org-1",
      organizationName: "Org Test",
      description: "Acesso a vendas",
    };

    const mockResponse = new Response(JSON.stringify(mockProfile), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });

    const fetchSpy = vi.spyOn(client, "apiFetch").mockResolvedValueOnce(ok(mockResponse));

    const result = await catalogApi.createProfile("org-1", {
      name: "  Vendas  ",
      description: "Acesso a vendas",
    });

    expect(isOk(result)).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith("/api/v1/organizations/org-1/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Vendas", description: "Acesso a vendas" }),
    });
  });

  it("should handle 204 No Content on profile deletion", async () => {
    const mockResponse = new Response(null, { status: 204 });
    vi.spyOn(client, "apiFetch").mockResolvedValueOnce(ok(mockResponse));

    const result = await catalogApi.deleteProfile("org-1", "prof-1");
    expect(isOk(result)).toBe(true);
  });

  it("should list data sources", async () => {
    const mockDataSources = [
      {
        id: "ds-1",
        organizationId: "org-1",
        name: "Produção",
        provider: "postgresql",
        executionCredentialMode: "existingReadOnlyUser",
        readOnlyVerificationStatus: "verified",
        isEnabled: true,
        adminConnectionStringMasked: "Host=***;Database=***",
        executionConnectionStringMasked: "Host=***;Database=***",
        hasClientCertificate: false,
      },
    ];

    const mockResponse = new Response(JSON.stringify(mockDataSources), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    vi.spyOn(client, "apiFetch").mockResolvedValueOnce(ok(mockResponse));

    const result = await catalogApi.listDataSources();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value[0].name).toBe("Produção");
    }
  });

  it("should verify read-only data source connection", async () => {
    const mockDS = {
      id: "ds-1",
      organizationId: "org-1",
      name: "Produção",
      provider: "postgresql",
      executionCredentialMode: "existingReadOnlyUser",
      readOnlyVerificationStatus: "verified",
      isEnabled: true,
      adminConnectionStringMasked: "Host=***",
      executionConnectionStringMasked: "Host=***",
      hasClientCertificate: true,
    };

    const mockResponse = new Response(JSON.stringify(mockDS), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const fetchSpy = vi.spyOn(client, "apiFetch").mockResolvedValueOnce(ok(mockResponse));

    const result = await catalogApi.verifyReadOnlyDataSource("ds-1");
    expect(isOk(result)).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith("/api/v1/data-sources/ds-1/verify-read-only", {
      method: "POST",
    });
  });

  it("should encode query parameters when listing introspection fields", async () => {
    const mockFields = [
      {
        fieldName: "total",
        databaseType: "numeric",
        isNullable: false,
        suggestedPublicType: "number",
      },
    ];

    const mockResponse = new Response(JSON.stringify(mockFields), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const fetchSpy = vi.spyOn(client, "apiFetch").mockResolvedValueOnce(ok(mockResponse));

    const result = await catalogApi.listIntrospectionFields("ds-1", "sales & ops", "orders/items");
    expect(isOk(result)).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/data-sources/ds-1/introspection/fields?schemaName=sales+%26+ops&objectName=orders%2Fitems"
    );
  });

  it("should send grant-all request for profile schema grants", async () => {
    const mockGrants = {
      schemas: [
        {
          schemaId: "schema-1",
          fields: [
            {
              fieldId: "field-1",
              selectable: true,
              filterable: true,
              sortable: true,
              groupable: false,
              aggregatable: true,
            },
          ],
        },
      ],
    };

    const mockResponse = new Response(JSON.stringify(mockGrants), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const fetchSpy = vi.spyOn(client, "apiFetch").mockResolvedValueOnce(ok(mockResponse));

    const result = await catalogApi.grantAllProfileSchemas("org-1", "prof-1", "ds-1");
    expect(isOk(result)).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/organizations/org-1/profiles/prof-1/schema-grants/grant-all",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSourceId: "ds-1" }),
      }
    );
  });

  it("should update profile grants with complete snapshot via PUT", async () => {
    const grantsSnapshot = {
      schemas: [
        {
          schemaId: "schema-1",
          fields: [
            {
              fieldId: "field-1",
              selectable: true,
              filterable: true,
              sortable: false,
              groupable: false,
              aggregatable: false,
            },
          ],
        },
      ],
    };

    const mockResponse = new Response(JSON.stringify(grantsSnapshot), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const fetchSpy = vi.spyOn(client, "apiFetch").mockResolvedValueOnce(ok(mockResponse));

    const result = await catalogApi.updateProfileGrants("org-1", "prof-1", grantsSnapshot);
    expect(isOk(result)).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/organizations/org-1/profiles/prof-1/schema-grants",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(grantsSnapshot),
      }
    );
  });

  it("should handle Problem Details 403 Forbidden without throwing", async () => {
    const mockProblem = {
      type: "about:blank",
      title: "Forbidden",
      status: 403,
      detail: "Acesso restrito ao perfil root.",
      instance: "/api/v1/data-sources",
      code: "report_catalog.root_access_required",
    };

    vi.spyOn(client, "apiFetch").mockResolvedValueOnce(err(mockProblem));

    const result = await catalogApi.listDataSources();
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.status).toBe(403);
      expect(result.error.code).toBe("report_catalog.root_access_required");
    }
  });
});
