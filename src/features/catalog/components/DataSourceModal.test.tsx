import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DataSourceModal } from "./DataSourceModal";
import { catalogApi } from "../api/catalogApi";
import { ok, err } from "../../../shared/result/result";
import type { TestDataSourceConfigurationResponse, DataSource } from "../types/catalogTypes";
vi.mock("../api/catalogApi", () => ({ catalogApi: { testDataSourceConfiguration: vi.fn() } }));
const refreshUser = vi.fn();
vi.mock("../../auth/context/AuthContext", () => ({ useAuth: () => ({ refreshUser }) }));
const create = vi.fn(); const update = vi.fn(); const close = vi.fn();
const success: TestDataSourceConfigurationResponse = { succeeded: true, adminConnection: { succeeded: true, errorCode: null }, executionConnection: { succeeded: true, readOnlyVerified: true, errorCode: null } };
function show(dataSource?: DataSource) { render(<DataSourceModal organizationId="org" onSubmitCreate={create} onSubmitUpdate={update} onClose={close} dataSource={dataSource} />); }
function fillConnections() {
  fireEvent.change(screen.getByLabelText(/Connection String Administrativa/), { target: { value: "Host=admin;Password=test-admin;" } });
  fireEvent.change(screen.getByLabelText(/Connection String de Execução/), { target: { value: "Host=execution;Password=test-execution;" } });
}
beforeEach(() => { vi.resetAllMocks(); vi.mocked(catalogApi.testDataSourceConfiguration).mockResolvedValue(ok(success)); });
afterEach(cleanup);
it("tests both connections without requiring a name or saving the datasource", async () => {
  show(); expect(screen.getByRole("button", { name: "Testar conexão" })).toBeDisabled();
  fillConnections(); fireEvent.click(screen.getByRole("button", { name: "Testar conexão" }));
  await screen.findByText("Conexão administrativa: conectada com sucesso.");
  expect(screen.getByText("Conexão de execução: conectada e validada como somente leitura.")).toBeVisible();
  expect(catalogApi.testDataSourceConfiguration).toHaveBeenCalledWith({ provider: "postgresql", adminConnectionString: "Host=admin;Password=test-admin;", executionConnectionString: "Host=execution;Password=test-execution;", clientCertificate: null });
  expect(create).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
  expect(screen.getByLabelText(/Connection String Administrativa/)).toHaveValue("Host=admin;Password=test-admin;");
  expect(screen.queryByText("test-admin", { exact: false })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Connection String Administrativa/), { target: { value: "Host=changed;" } });
  expect(screen.queryByText("Conexão administrativa: conectada com sucesso.")).not.toBeInTheDocument();
});
it("shows individual failures even when the API returns HTTP success", async () => {
  vi.mocked(catalogApi.testDataSourceConfiguration).mockResolvedValue(ok({ ...success, succeeded: false, executionConnection: { succeeded: false, readOnlyVerified: false, errorCode: "report_catalog.execution_connection_test_failed" } }));
  show(); fillConnections(); fireEvent.click(screen.getByRole("button", { name: "Testar conexão" }));
  expect(await screen.findByText(/Conexão de execução: falhou/)).toBeVisible();
  expect(screen.getByText("Conexão administrativa: conectada com sucesso.")).toBeVisible();
});
it("prevents duplicate requests, editing credentials, and saving while the test is running", async () => {
  let resolve!: (r: ReturnType<typeof ok<TestDataSourceConfigurationResponse>>) => void;
  vi.mocked(catalogApi.testDataSourceConfiguration).mockImplementation(() => new Promise(r => { resolve = r; }));
  show(); fillConnections(); const button = screen.getByRole("button", { name: "Testar conexão" });
  fireEvent.click(button); fireEvent.click(button);
  expect(catalogApi.testDataSourceConfiguration).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Criar DataSource" })).toBeDisabled();
  expect(screen.getByLabelText(/Connection String Administrativa/)).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent("Conectando ao banco");
  resolve(ok(success)); await screen.findByText("Conexão administrativa: conectada com sucesso.");
  expect(screen.getByRole("button", { name: "Criar DataSource" })).toBeEnabled();
});
it("includes the optional certificate and invalidates the result after changing its password", async () => {
  show(); fillConnections();
  fireEvent.change(screen.getByLabelText("Selecione Arquivo PFX"), { target: { files: [new File(["pfx"], "client.pfx")] } });
  fireEvent.change(screen.getByLabelText("Senha do Certificado PFX"), { target: { value: "certificate-password" } });
  await waitFor(() => expect(screen.getByRole("button", { name: "Testar conexão" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Testar conexão" }));
  await screen.findByText("Conexão administrativa: conectada com sucesso.");
  expect(catalogApi.testDataSourceConfiguration).toHaveBeenCalledWith(expect.objectContaining({ clientCertificate: { pfxBase64: "cGZ4", password: "certificate-password" } }));
  fireEvent.change(screen.getByLabelText("Senha do Certificado PFX"), { target: { value: "changed" } });
  expect(screen.queryByText("Conexão administrativa: conectada com sucesso.")).not.toBeInTheDocument();
});
it("shows API failure and allows retry without clearing credentials", async () => {
  vi.mocked(catalogApi.testDataSourceConfiguration).mockResolvedValue(err({ type: "about:blank", title: "Unavailable", status: 503, detail: "Banco indisponível.", instance: "/api/v1/data-sources/test-configuration" }));
  show(); fillConnections(); fireEvent.click(screen.getByRole("button", { name: "Testar conexão" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Banco indisponível.");
  expect(screen.getByRole("button", { name: "Testar conexão" })).toBeEnabled();
  expect(screen.getByLabelText(/Connection String de Execução/)).toHaveValue("Host=execution;Password=test-execution;");
});
it("allows creation without a prior test", async () => {
  create.mockResolvedValue(true); show(); fillConnections();
  fireEvent.change(screen.getByLabelText("Nome do DataSource *"), { target: { value: "ERP" } });
  fireEvent.click(screen.getByRole("button", { name: "Criar DataSource" }));
  await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
  expect(catalogApi.testDataSourceConfiguration).not.toHaveBeenCalled();
});
