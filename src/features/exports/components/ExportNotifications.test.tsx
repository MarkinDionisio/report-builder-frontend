import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ok, err } from "../../../shared/result/result";
import { exportApi } from "../api/exportApi";
import { ExportNotifications } from "./ExportNotifications";

const identity = vi.hoisted(() => ({ state: { status: "authenticated", user: { id: "one" } } }));
vi.mock("../../auth/context/AuthContext", () => ({ useAuth: () => identity }));
vi.mock("../api/exportApi", () => ({ exportApi: { list: vi.fn(), notifications: vi.fn(), read: vi.fn(), download: vi.fn() } }));
beforeEach(() => {
  identity.state = { status: "authenticated", user: { id: "one" } };
  vi.mocked(exportApi.list).mockResolvedValue(ok({ data: [], totalCount: 0, page: 1, pageSize: 20 }));
  vi.mocked(exportApi.notifications).mockResolvedValue(ok({ data: [], totalCount: 0, unreadCount: 0, page: 1, pageSize: 20 }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" }); });
it("polls only in a visible authenticated session and refreshes on returning", async () => {
  vi.useFakeTimers();
  render(<MemoryRouter><ExportNotifications/></MemoryRouter>);
  await act(async () => {});
  expect(exportApi.list).toHaveBeenCalledTimes(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(exportApi.list).toHaveBeenCalledTimes(2);
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
  expect(exportApi.list).toHaveBeenCalledTimes(2);
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
  expect(exportApi.list).toHaveBeenCalledTimes(3);
  cleanup();
  await vi.advanceTimersByTimeAsync(30000);
  expect(exportApi.list).toHaveBeenCalledTimes(3);
});
it("shows persistent completion, marks a notice read and downloads only on demand", async () => {
  vi.mocked(exportApi.list).mockResolvedValue(ok({ data: [{ id: "job", reportId: "report", title: "Vendas", format: "csv", status: "ready", createdAt: "2026-10-23T12:00:00Z", expiresAt: "2026-10-24T12:00:00Z", error: null }], totalCount: 1, page: 1, pageSize: 20 }));
  vi.mocked(exportApi.notifications).mockResolvedValue(ok({ data: [{ id: "notice", jobId: "job", message: "Arquivo disponível", readAt: null, createdAt: "2026-10-23T12:00:00Z" }], totalCount: 1, unreadCount: 1, page: 1, pageSize: 20 }));
  vi.mocked(exportApi.read).mockResolvedValue(ok(new Response(null, { status: 204 })));
  vi.mocked(exportApi.download).mockResolvedValue(ok(undefined));
  render(<MemoryRouter><ExportNotifications/></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /1 não lidas/ }));
  expect(await screen.findByText("CSV · Disponível")).toBeVisible();
  expect(exportApi.download).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Baixar arquivo" }));
  await act(async () => {});
  expect(exportApi.download).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Marcar como lida" }));
  await act(async () => {});
  expect(exportApi.read).toHaveBeenCalledWith("notice");
});
it("allows retry after list failure without presenting an empty success", async () => {
  const failure = err({ type: "about:blank", title: "Falha", status: 500, detail: "Consulta indisponível", instance: "/exports" });
  vi.mocked(exportApi.list).mockResolvedValueOnce(failure).mockResolvedValueOnce(failure);
  render(<MemoryRouter><ExportNotifications/></MemoryRouter>);
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: /Exportações e notificações/ }));
  expect(await screen.findByRole("button", { name: "Tentar novamente" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await act(async () => {});
});
it("clears notices and cancels polling when the session ends", async () => {
  vi.mocked(exportApi.notifications).mockResolvedValue(ok({ data: [], totalCount: 0, unreadCount: 4, page: 1, pageSize: 20 }));
  const view = render(<MemoryRouter><ExportNotifications/></MemoryRouter>);
  await screen.findByRole("button", { name: /4 não lidas/ });
  const signal = vi.mocked(exportApi.list).mock.calls[0][1];
  identity.state = { status: "anonymous", user: { id: "" } };
  view.rerender(<MemoryRouter><ExportNotifications/></MemoryRouter>);
  expect(screen.queryByRole("button", { name: /Exportações e notificações/ })).not.toBeInTheDocument();
  expect(signal?.aborted).toBe(true);
});

it("keeps historical export failures localized without rewriting notification data", async () => {
  vi.mocked(exportApi.list).mockResolvedValue(ok({ data: [{ id: "legacy", reportId: "report", title: "Vendas", format: "csv", status: "failed", createdAt: "2026-10-23T12:00:00Z", expiresAt: null, error: "The source field is unavailable." }], totalCount: 1, page: 1, pageSize: 20 }));
  render(<MemoryRouter><ExportNotifications/></MemoryRouter>);
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: /Exportações e notificações/ }));
  expect(await screen.findByText("Não foi possível gerar o arquivo. Revise os parâmetros e tente novamente.")).toBeVisible();
  expect(screen.queryByText("The source field is unavailable.")).not.toBeInTheDocument();
});
