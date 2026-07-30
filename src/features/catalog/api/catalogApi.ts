import { apiFetch } from "../../../shared/api/client";
import { err, isErr, ok } from "../../../shared/result/result";
import type { Result } from "../../../shared/result/result";
import type { ApiProblemDetails } from "../../../shared/api/types";
import type {
  AvailableCatalogSchema,
  BootstrapRequest,
  BootstrapPreview,
  BootstrapResult,
  CreateDataSourceRequest,
  CreateReportSchemaRequest,
  DataSource,
  ImportReportSchemaRequest,
  ImportSchemaPreview,
  ImportSchemaResponse,
  IntrospectionField,
  IntrospectionObject,
  Profile,
  ProfileGrants,
  RootReportField,
  RootReportSchema,
  UpdateDataSourceRequest,
  UpdateProfileGrantsRequest,
  UpdateReportSchemaRequest,
  UpsertProfileRequest,
  UpsertReportFieldRequest,
} from "../types/catalogTypes";

async function parseJsonResponse<T>(
  result: Result<Response, ApiProblemDetails>
): Promise<Result<T, ApiProblemDetails>> {
  if (isErr(result)) return err(result.error);
  try {
    const data = (await result.value.json()) as T;
    return ok(data);
  } catch {
    return err({
      type: "about:blank",
      title: "Erro ao processar resposta",
      status: result.value.status,
      detail: "Falha ao ler o corpo JSON da resposta.",
      instance: result.value.url,
    });
  }
}

function handleVoidResponse(
  result: Result<Response, ApiProblemDetails>
): Result<void, ApiProblemDetails> {
  if (isErr(result)) return err(result.error);
  return ok(undefined);
}

export const catalogApi = {
  // --- Profiles ---
  async listProfiles(organizationId: string): Promise<Result<Profile[], ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/organizations/${organizationId}/profiles`);
    return parseJsonResponse<Profile[]>(res);
  },

  async getProfile(organizationId: string, profileId: string): Promise<Result<Profile, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/organizations/${organizationId}/profiles/${profileId}`);
    return parseJsonResponse<Profile>(res);
  },

  async createProfile(organizationId: string, data: UpsertProfileRequest): Promise<Result<Profile, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/organizations/${organizationId}/profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name.trim(),
        description: data.description ?? null,
      }),
    });
    return parseJsonResponse<Profile>(res);
  },

  async updateProfile(
    organizationId: string,
    profileId: string,
    data: UpsertProfileRequest
  ): Promise<Result<Profile, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/organizations/${organizationId}/profiles/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name.trim(),
        description: data.description === undefined ? null : data.description,
      }),
    });
    return parseJsonResponse<Profile>(res);
  },

  async deleteProfile(organizationId: string, profileId: string): Promise<Result<void, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/organizations/${organizationId}/profiles/${profileId}`, {
      method: "DELETE",
    });
    return handleVoidResponse(res);
  },

  // --- DataSources ---
  async listDataSources(organizationId?: string): Promise<Result<DataSource[], ApiProblemDetails>> {
    const url = organizationId 
      ? `/api/v1/organizations/${encodeURIComponent(organizationId)}/data-sources` 
      : "/api/v1/data-sources";
    const res = await apiFetch(url);
    return parseJsonResponse<DataSource[]>(res);
  },

  async createDataSource(data: CreateDataSourceRequest): Promise<Result<DataSource, ApiProblemDetails>> {
    const res = await apiFetch("/api/v1/data-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonResponse<DataSource>(res);
  },

  async updateDataSource(id: string, data: UpdateDataSourceRequest): Promise<Result<DataSource, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/data-sources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonResponse<DataSource>(res);
  },

  async deleteDataSource(id: string): Promise<Result<void, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/data-sources/${id}`, {
      method: "DELETE",
    });
    return handleVoidResponse(res);
  },

  async verifyReadOnlyDataSource(id: string): Promise<Result<DataSource, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/data-sources/${id}/verify-read-only`, {
      method: "POST",
    });
    return parseJsonResponse<DataSource>(res);
  },

  // --- Introspection & Import ---
  async listIntrospectionObjects(dataSourceId: string): Promise<Result<IntrospectionObject[], ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/data-sources/${dataSourceId}/introspection/objects`);
    return parseJsonResponse<IntrospectionObject[]>(res);
  },

  async listIntrospectionFields(
    dataSourceId: string,
    schemaName: string,
    objectName: string
  ): Promise<Result<IntrospectionField[], ApiProblemDetails>> {
    const query = new URLSearchParams({ schemaName, objectName });
    const res = await apiFetch(`/api/v1/data-sources/${dataSourceId}/introspection/fields?${query}`);
    return parseJsonResponse<IntrospectionField[]>(res);
  },

  async previewImportSchema(data: ImportReportSchemaRequest): Promise<Result<ImportSchemaPreview, ApiProblemDetails>> {
    const res = await apiFetch("/api/v1/report-schemas/import-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonResponse<ImportSchemaPreview>(res);
  },

  async importSchema(data: ImportReportSchemaRequest): Promise<Result<ImportSchemaResponse, ApiProblemDetails>> {
    const res = await apiFetch("/api/v1/report-schemas/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonResponse<ImportSchemaResponse>(res);
  },

  // --- Mass Bootstrap ---
  async previewBootstrap(data: BootstrapRequest): Promise<Result<BootstrapPreview, ApiProblemDetails>> {
    const res = await apiFetch("/api/v1/report-schemas/bootstrap-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonResponse<BootstrapPreview>(res);
  },

  async executeBootstrap(data: BootstrapRequest): Promise<Result<BootstrapResult, ApiProblemDetails>> {
    const res = await apiFetch("/api/v1/report-schemas/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonResponse<BootstrapResult>(res);
  },

  // --- Report Schemas ---
  async listReportSchemas(dataSourceId?: string): Promise<Result<RootReportSchema[], ApiProblemDetails>> {
    const query = dataSourceId ? `?dataSourceId=${encodeURIComponent(dataSourceId)}` : "";
    const res = await apiFetch(`/api/v1/report-schemas${query}`);
    return parseJsonResponse<RootReportSchema[]>(res);
  },

  async createReportSchema(data: CreateReportSchemaRequest): Promise<Result<RootReportSchema, ApiProblemDetails>> {
    const res = await apiFetch("/api/v1/report-schemas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonResponse<RootReportSchema>(res);
  },

  async updateReportSchema(
    id: string,
    data: UpdateReportSchemaRequest
  ): Promise<Result<RootReportSchema, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/report-schemas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonResponse<RootReportSchema>(res);
  },

  async deleteReportSchema(id: string): Promise<Result<void, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/report-schemas/${id}`, {
      method: "DELETE",
    });
    return handleVoidResponse(res);
  },

  // --- Report Fields ---
  async listReportFields(schemaId: string): Promise<Result<RootReportField[], ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/report-schemas/${schemaId}/fields`);
    return parseJsonResponse<RootReportField[]>(res);
  },

  async createReportField(
    schemaId: string,
    data: UpsertReportFieldRequest
  ): Promise<Result<RootReportField, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/report-schemas/${schemaId}/fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonResponse<RootReportField>(res);
  },

  async updateReportField(
    id: string,
    data: UpsertReportFieldRequest
  ): Promise<Result<RootReportField, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/report-fields/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonResponse<RootReportField>(res);
  },

  async deleteReportField(id: string): Promise<Result<void, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/report-fields/${id}`, {
      method: "DELETE",
    });
    return handleVoidResponse(res);
  },

  // --- Profile Grants ---
  async getAvailableCatalog(
    organizationId: string,
    dataSourceId?: string
  ): Promise<Result<AvailableCatalogSchema[], ApiProblemDetails>> {
    const query = dataSourceId ? `?dataSourceId=${encodeURIComponent(dataSourceId)}` : "";
    const res = await apiFetch(`/api/v1/organizations/${organizationId}/available-report-schemas${query}`);
    return parseJsonResponse<AvailableCatalogSchema[]>(res);
  },

  async getProfileGrants(
    organizationId: string,
    profileId: string
  ): Promise<Result<ProfileGrants, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/organizations/${organizationId}/profiles/${profileId}/schema-grants`);
    return parseJsonResponse<ProfileGrants>(res);
  },

  async grantAllProfileSchemas(
    organizationId: string,
    profileId: string,
    dataSourceId: string
  ): Promise<Result<ProfileGrants, ApiProblemDetails>> {
    const res = await apiFetch(
      `/api/v1/organizations/${organizationId}/profiles/${profileId}/schema-grants/grant-all`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSourceId }),
      }
    );
    return parseJsonResponse<ProfileGrants>(res);
  },

  async updateProfileGrants(
    organizationId: string,
    profileId: string,
    grants: UpdateProfileGrantsRequest
  ): Promise<Result<ProfileGrants, ApiProblemDetails>> {
    const res = await apiFetch(
      `/api/v1/organizations/${organizationId}/profiles/${profileId}/schema-grants`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(grants),
      }
    );
    return parseJsonResponse<ProfileGrants>(res);
  },
};
