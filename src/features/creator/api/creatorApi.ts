import { apiFetch } from "../../../shared/api/client";
import { err, isErr, ok } from "../../../shared/result/result";
import type { Result } from "../../../shared/result/result";
import type { ApiProblemDetails } from "../../../shared/api/types";
import type {
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
    pageSize: number = 20
  ): Promise<Result<PagedResult<ReportListItem>, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/reports?page=${page}&pageSize=${pageSize}`);
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
