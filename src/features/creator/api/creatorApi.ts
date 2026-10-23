import type { ReportTag, ReportListFilters } from "../types/creatorTypes";
import { apiFetch } from "../../../shared/api/client";
import { err, isErr, ok } from "../../../shared/result/result";
import type { Result } from "../../../shared/result/result";
import type { ApiProblemDetails } from "../../../shared/api/types";
import type {
  GlobalReportTemplate, ReportImportRequest, ReportImportCheck, ReportImportDataSource,
  CreatorDataSourceOption,
  SharingTargets,
  DesignerCatalog,
  PagedResult,
  ReportListItem,
  ReportDetail,
  UpsertReportRequest,
  UpdateReportShareRequest,
  DashboardListItem,
  DashboardDetail,
  CreateDashboardRequest,
  UpdateDashboardRequest,
  UpdateDashboardShareRequest,
  PreviewRequest,
  ExecuteRequest,
  ExecuteResponse,
} from "../types/creatorTypes";

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

export const creatorApi = {
  async listReportTags(organizationId?: string): Promise<Result<ReportTag[], ApiProblemDetails>> {
    return parseJsonResponse(await apiFetch(organizationId ? `/api/v1/organizations/${organizationId}/report-tags` : "/api/v1/reports/tags"));
  },
  async saveReportTag(organizationId: string, name: string, id?: string): Promise<Result<ReportTag, ApiProblemDetails>> {
    return parseJsonResponse(await apiFetch(`/api/v1/organizations/${organizationId}/report-tags${id ? "/"+id : ""}`, { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }));
  },
  async deleteReportTag(organizationId: string, id: string): Promise<Result<void, ApiProblemDetails>> {
    return handleVoidResponse(await apiFetch(`/api/v1/organizations/${organizationId}/report-tags/${id}`, {method:"DELETE"}));
  },
  async listGlobalTemplates(page = 1, search = ""): Promise<Result<PagedResult<GlobalReportTemplate>, ApiProblemDetails>> {
    return parseJsonResponse(await apiFetch(`/api/v1/reports/global-templates?page=${page}&pageSize=10&search=${encodeURIComponent(search)}`));
  },
  async getImportDataSources(organizationId: string): Promise<Result<ReportImportDataSource[], ApiProblemDetails>> {
    return parseJsonResponse(await apiFetch(`/api/v1/organizations/${organizationId}/report-import-data-sources`));
  },
  async checkReportImport(id: string, request: ReportImportRequest): Promise<Result<ReportImportCheck, ApiProblemDetails>> {
    return parseJsonResponse(await apiFetch(`/api/v1/reports/${id}/import-check`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) }));
  },
  async importReport(id: string, request: ReportImportRequest): Promise<Result<ReportDetail, ApiProblemDetails>> {
    return parseJsonResponse(await apiFetch(`/api/v1/reports/${id}/import`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) }));
  },
  // --- Discovery ---
  async getCreatorDataSources(
    organizationId: string
  ): Promise<Result<CreatorDataSourceOption[], ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/organizations/${organizationId}/report-designer/data-sources`);
    return parseJsonResponse<CreatorDataSourceOption[]>(res);
  },

  async getSharingTargets(
    organizationId: string
  ): Promise<Result<SharingTargets, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/organizations/${organizationId}/sharing-targets`);
    return parseJsonResponse<SharingTargets>(res);
  },

  async getDesignerCatalog(
    organizationId: string,
    dataSourceId: string
  ): Promise<Result<DesignerCatalog, ApiProblemDetails>> {
    const query = `?dataSourceId=${encodeURIComponent(dataSourceId)}`;
    const res = await apiFetch(`/api/v1/organizations/${organizationId}/report-designer/catalog${query}`);
    return parseJsonResponse<DesignerCatalog>(res);
  },

  // --- Reports CRUD ---
  async listReports(
    page: number = 1,
    pageSize: number = 20,
    filters: ReportListFilters = {}
  ): Promise<Result<PagedResult<ReportListItem>, ApiProblemDetails>> {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters.organizationId) query.set("organizationId", filters.organizationId);
    if (filters.search) query.set("search", filters.search);
    if (filters.matchCase) query.set("matchCase", "true");
    if (filters.exactMatch) query.set("exactMatch", "true");
    if (filters.untagged) query.set("untagged", "true");
    else filters.tagIds?.forEach(id => query.append("tagIds", id));
    const res = await apiFetch(`/api/v1/reports?${query}`);
    return parseJsonResponse<PagedResult<ReportListItem>>(res);
  },

  async getReport(id: string): Promise<Result<ReportDetail, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/reports/${id}`);
    return parseJsonResponse<ReportDetail>(res);
  },

  async createReport(data: UpsertReportRequest): Promise<Result<ReportDetail, ApiProblemDetails>> {
    const res = await apiFetch("/api/v1/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonResponse<ReportDetail>(res);
  },

  async updateReport(
    id: string,
    data: Omit<UpsertReportRequest, "organizationId">
  ): Promise<Result<ReportDetail, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonResponse<ReportDetail>(res);
  },

  async shareReport(
    id: string,
    data: UpdateReportShareRequest
  ): Promise<Result<void, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/reports/${id}/share`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleVoidResponse(res);
  },

  async deleteReport(id: string): Promise<Result<void, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/reports/${id}`, {
      method: "DELETE",
    });
    return handleVoidResponse(res);
  },

  // --- Execution & Preview ---
  async previewReport(data: PreviewRequest): Promise<Result<ExecuteResponse, ApiProblemDetails>> {
    const res = await apiFetch("/api/v1/reports/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonResponse<ExecuteResponse>(res);
  },

  async executeReport(
    id: string,
    data: ExecuteRequest
  ): Promise<Result<ExecuteResponse, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/reports/${id}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonResponse<ExecuteResponse>(res);
  },

  // --- Dashboards CRUD ---
  async listDashboards(
    page: number = 1,
    pageSize: number = 20
  ): Promise<Result<PagedResult<DashboardListItem>, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/dashboards?page=${page}&pageSize=${pageSize}`);
    return parseJsonResponse<PagedResult<DashboardListItem>>(res);
  },

  async getDashboard(id: string): Promise<Result<DashboardDetail, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/dashboards/${id}`);
    return parseJsonResponse<DashboardDetail>(res);
  },

  async createDashboard(
    data: CreateDashboardRequest
  ): Promise<Result<DashboardDetail, ApiProblemDetails>> {
    const res = await apiFetch("/api/v1/dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonResponse<DashboardDetail>(res);
  },

  async updateDashboard(
    id: string,
    data: UpdateDashboardRequest
  ): Promise<Result<DashboardDetail, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/dashboards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonResponse<DashboardDetail>(res);
  },

  async shareDashboard(
    id: string,
    data: UpdateDashboardShareRequest
  ): Promise<Result<DashboardDetail, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/dashboards/${id}/share`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJsonResponse<DashboardDetail>(res);
  },

  async deleteDashboard(id: string): Promise<Result<void, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/dashboards/${id}`, {
      method: "DELETE",
    });
    return handleVoidResponse(res);
  },
};
