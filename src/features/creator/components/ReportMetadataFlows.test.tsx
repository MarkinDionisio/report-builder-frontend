import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { creatorApi } from "../api/creatorApi";
import { ReportBrowser } from "./ReportBrowser";
import { ReportTagManager } from "./ReportTagManager";
import { TagChoices } from "./ReportTagPicker";

vi.mock("../api/creatorApi", () => ({ creatorApi: { listReportTags: vi.fn(), listReports: vi.fn(), saveReportTag: vi.fn(), deleteReport: vi.fn(), deleteReportTag: vi.fn() } }));
const tags = [{id:"sales",organizationId:"org",name:"Vendas"},{id:"finance",organizationId:"org",name:"Financeiro"}];
const item = {id:"report",title:"Comparativo mensal",description:"Últimos 12 meses, mês atual parcial.",tags,organizationId:"org",organizationName:"Fábrica",visibilityScope:"private" as const,myRole:"root" as const,createdAt:"2026-10-23"};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(creatorApi.listReportTags).mockResolvedValue({ok:true,value:tags});
  vi.mocked(creatorApi.listReports).mockResolvedValue({ok:true,value:{page:2,pageSize:20,totalRecords:125,totalPages:7,data:[item]}});
});
function Location() { const location=useLocation(), navigate=useNavigate(); return <><output aria-label="URL">{location.search}</output><button onClick={()=>navigate(-1)}>Voltar no navegador</button></>; }

it("uses server filters and pagination, resets page on search and preserves labels on clear/back", async () => {
  render(<MemoryRouter initialEntries={["/?page=2&tagIds=sales&tagIds=finance"]}><ReportBrowser organizationId="org"/><Location/></MemoryRouter>);
  await screen.findByText(item.title);
  expect(creatorApi.listReports).toHaveBeenLastCalledWith(2,20,expect.objectContaining({organizationId:"org",tagIds:["sales","finance"]}));
  expect(screen.getAllByText(item.title)).toHaveLength(1);
  expect(screen.getByText(item.description)).toBeVisible();
  fireEvent.change(screen.getByRole("textbox",{name:"Buscar relatórios"}),{target:{value:"mensal"}});
  await waitFor(()=>expect(creatorApi.listReports).toHaveBeenLastCalledWith(1,20,expect.objectContaining({search:"mensal",tagIds:["sales","finance"]})));
  fireEvent.click(screen.getByRole("button",{name:"Limpar busca"}));
  expect(screen.getByRole("textbox",{name:"Buscar relatórios"})).toHaveFocus();
  expect(screen.getByLabelText("URL")).toHaveTextContent("tagIds=sales&tagIds=finance");
  fireEvent.click(screen.getByRole("button",{name:"Voltar no navegador"}));
  expect(screen.getByRole("textbox",{name:"Buscar relatórios"})).toHaveValue("mensal");
});

it("preserves selected labels outside the search when selecting or clearing visible results", () => {
  const change=vi.fn();
  render(<TagChoices tags={tags} selected={["finance"]} onChange={change}/>);
  fireEvent.change(screen.getByRole("textbox",{name:"Buscar etiquetas"}),{target:{value:"Vendas"}});
  fireEvent.click(screen.getByRole("button",{name:"Marcar resultados da busca"}));
  expect(change).toHaveBeenLastCalledWith(["finance","sales"]);
});

it("keeps form data after save errors and locks duplicate submissions", async () => {
  let finish!: (value: Awaited<ReturnType<typeof creatorApi.saveReportTag>>) => void;
  vi.mocked(creatorApi.saveReportTag).mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  render(<ReportTagManager organizationId="org" onClose={vi.fn()} onChanged={vi.fn()}/>);
  const name=await screen.findByLabelText("Nova etiqueta");
  fireEvent.change(name,{target:{value:"Compras"}});
  const save=screen.getByRole("button",{name:"Salvar etiqueta"});
  fireEvent.click(save); fireEvent.click(save);
  expect(creatorApi.saveReportTag).toHaveBeenCalledTimes(1);
  finish({ok:false,error:{type:"about:blank",title:"Conflito",status:409,detail:"Nome duplicado",instance:""}});
  await screen.findByText("Nome duplicado");
  expect(name).toHaveValue("Compras");
  expect(screen.getByRole("button",{name:"Salvar etiqueta"})).toBeEnabled();
});

it("requires deletion confirmation, preserves labels on failure and supports retry", async () => {
  const problem={type:"about:blank",title:"Erro",status:500,detail:"Tente novamente",instance:""};
  vi.mocked(creatorApi.deleteReportTag).mockResolvedValueOnce({ok:false,error:problem}).mockResolvedValueOnce({ok:true,value:undefined});
  render(<ReportTagManager organizationId="org" onClose={vi.fn()} onChanged={vi.fn()}/>);
  fireEvent.click(await screen.findByRole("button",{name:"Excluir Vendas"}));
  expect(creatorApi.deleteReportTag).not.toHaveBeenCalled();
  expect(screen.getByText(/Os relatórios e suas permissões serão preservados/)).toBeVisible();
  fireEvent.click(screen.getByRole("button",{name:"Confirmar Exclusão"}));
  await screen.findByText("Tente novamente");
  fireEvent.click(screen.getByRole("button",{name:"Confirmar Exclusão"}));
  await waitFor(()=>expect(screen.queryByRole("button",{name:"Excluir Vendas"})).not.toBeInTheDocument());
  expect(creatorApi.deleteReportTag).toHaveBeenCalledTimes(2);
});

it("removes selected chips, clears selection and closes options with Escape", () => {
  function Picker() { const [selected,setSelected]=useState(["sales","finance"]); return <TagChoices tags={tags} selected={selected} onChange={setSelected}/>; }
  render(<Picker/>);
  fireEvent.click(screen.getByRole("button",{name:"Remover etiqueta Vendas"}));
  expect(screen.queryByRole("button",{name:"Remover etiqueta Vendas"})).not.toBeInTheDocument();
  fireEvent.focus(screen.getByRole("textbox",{name:"Buscar etiquetas"}));
  expect(screen.getByRole("checkbox",{name:"Financeiro"})).toBeChecked();
  fireEvent.keyDown(screen.getByRole("textbox",{name:"Buscar etiquetas"}),{key:"Escape"});
  expect(screen.queryByRole("group",{name:"Opções de etiquetas"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Limpar etiquetas selecionadas"}));
  expect(screen.queryByRole("button",{name:"Remover etiqueta Financeiro"})).not.toBeInTheDocument();
});
it("distinguishes same-name dashboard tags by organization and searches organization names", async () => {
  vi.mocked(creatorApi.listReportTags).mockResolvedValue({ok:true,value:[
    {id:"sales-a",organizationId:"a",organizationName:"Fabrica Sistemas",name:"Vendas"},
    {id:"sales-b",organizationId:"b",organizationName:"Outra empresa",name:"Vendas"},
  ]});
  render(<MemoryRouter initialEntries={["/?tagIds=sales-a"]}><ReportBrowser/></MemoryRouter>);
  await screen.findByRole("button",{name:"Remover etiqueta Vendas · Fabrica Sistemas"});
  fireEvent.focus(screen.getByRole("textbox",{name:"Buscar etiquetas"}));
  expect(screen.getByRole("checkbox",{name:"Vendas · Fabrica Sistemas"})).toBeChecked();
  expect(screen.getByRole("checkbox",{name:"Vendas · Outra empresa"})).not.toBeChecked();
  fireEvent.change(screen.getByRole("textbox",{name:"Buscar etiquetas"}),{target:{value:"Outra empresa"}});
  expect(screen.queryByRole("checkbox",{name:"Vendas · Fabrica Sistemas"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox",{name:"Vendas · Outra empresa"}));
  await waitFor(()=>expect(creatorApi.listReports).toHaveBeenLastCalledWith(1,20,expect.objectContaining({tagIds:["sales-a","sales-b"]})));
});

it("keeps organization-scoped tag labels short", () => {
  render(<TagChoices tags={[{id:"sales",organizationId:"org",organizationName:"Fabrica Sistemas",name:"Vendas"}]} selected={["sales"]} onChange={vi.fn()}/>);
  expect(screen.getByRole("button",{name:"Remover etiqueta Vendas"})).toBeVisible();
  fireEvent.focus(screen.getByRole("textbox",{name:"Buscar etiquetas"}));
  expect(screen.getByRole("checkbox",{name:"Vendas"})).toBeVisible();
});


it("confirms report deletion, keeps the dialog on failure and refreshes after retry", async () => {
  const onTotal=vi.fn();
  vi.mocked(creatorApi.listReports).mockResolvedValue({ok:true,value:{page:1,pageSize:20,totalRecords:1,totalPages:1,data:[item]}});
  vi.mocked(creatorApi.deleteReport).mockResolvedValueOnce({ok:false,error:{type:"about:blank",title:"Erro",status:403,detail:"Sem permissão",instance:""}}).mockResolvedValueOnce({ok:true,value:undefined});
  render(<MemoryRouter><ReportBrowser organizationId="org" onTotal={onTotal}/></MemoryRouter>);
  await screen.findByText(item.title);
  fireEvent.click(screen.getByRole("button",{name:"Opções"}));
  fireEvent.click(screen.getByRole("button",{name:"Excluir relatório "+item.title}));
  expect(creatorApi.deleteReport).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Cancelar"}));
  expect(creatorApi.deleteReport).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Opções"}));
  fireEvent.click(screen.getByRole("button",{name:"Excluir relatório "+item.title}));
  fireEvent.click(screen.getByRole("button",{name:"Confirmar Exclusão"}));
  await screen.findByText("Sem permissão");
  expect(screen.getByRole("dialog",{name:"Excluir relatório"})).toBeVisible();
  vi.mocked(creatorApi.listReports).mockResolvedValue({ok:true,value:{page:1,pageSize:20,totalRecords:0,totalPages:0,data:[]}});
  fireEvent.click(screen.getByRole("button",{name:"Confirmar Exclusão"}));
  await waitFor(()=>expect(screen.queryByRole("dialog",{name:"Excluir relatório"})).not.toBeInTheDocument());
  await waitFor(()=>expect(onTotal).toHaveBeenLastCalledWith(0));
  expect(creatorApi.deleteReport).toHaveBeenCalledTimes(2);
});

it("does not expose report deletion to viewers", async () => {
  vi.mocked(creatorApi.listReports).mockResolvedValue({ok:true,value:{page:1,pageSize:20,totalRecords:1,totalPages:1,data:[{...item,myRole:"viewer"}]}});
  render(<MemoryRouter><ReportBrowser organizationId="org"/></MemoryRouter>);
  await screen.findByText(item.title);
  expect(screen.queryByRole("button",{name:"Opções"})).not.toBeInTheDocument();
});

it("returns to the previous page after deleting its final report and preserves filters", async () => {
  vi.mocked(creatorApi.listReports).mockResolvedValue({ok:true,value:{page:2,pageSize:20,totalRecords:21,totalPages:2,data:[item]}});
  vi.mocked(creatorApi.deleteReport).mockResolvedValue({ok:true,value:undefined});
  render(<MemoryRouter initialEntries={["/?page=2&tagIds=sales"]}><ReportBrowser organizationId="org"/><Location/></MemoryRouter>);
  await screen.findByText(item.title);
  fireEvent.click(screen.getByRole("button",{name:"Opções"}));
  fireEvent.click(screen.getByRole("button",{name:"Excluir relatório "+item.title}));
  fireEvent.click(screen.getByRole("button",{name:"Confirmar Exclusão"}));
  await waitFor(()=>expect(creatorApi.listReports).toHaveBeenLastCalledWith(1,20,expect.objectContaining({organizationId:"org",tagIds:["sales"]})));
  expect(screen.getByLabelText("URL")).toHaveTextContent("tagIds=sales");
  expect(screen.getByLabelText("URL")).toHaveTextContent("page=1");
});


it("keeps reports visible and disables actions during a page refresh", async () => {
  render(<MemoryRouter><ReportBrowser organizationId="org"/></MemoryRouter>);
  await screen.findByText(item.title);
  let finish!: (value: Awaited<ReturnType<typeof creatorApi.listReports>>) => void;
  vi.mocked(creatorApi.listReports).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
  await screen.findByText("Atualizando relatórios…");
  expect(screen.getByText(item.title)).toBeVisible();
  expect(screen.getByText(item.title).closest("[inert]")).not.toBeNull();
  finish({ ok: true, value: { page: 2, pageSize: 20, totalRecords: 125, totalPages: 7, data: [item] } });
  await waitFor(() => expect(screen.queryByText("Atualizando relatórios…")).not.toBeInTheDocument());
});

it("hides reports immediately when switching organizations", async () => {
  const { rerender } = render(<MemoryRouter><ReportBrowser organizationId="org"/></MemoryRouter>);
  await screen.findByText(item.title);
  vi.mocked(creatorApi.listReports).mockImplementationOnce(() => new Promise(() => {}));
  rerender(<MemoryRouter><ReportBrowser organizationId="other"/></MemoryRouter>);
  expect(screen.queryByText(item.title)).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Consultando relatórios");
});
