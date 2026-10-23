import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { creatorApi } from "../api/creatorApi";
import { ReportBrowser } from "./ReportBrowser";
import { ReportTagManager } from "./ReportTagManager";
import { TagChoices } from "./ReportTagPicker";

vi.mock("../api/creatorApi", () => ({ creatorApi: { listReportTags: vi.fn(), listReports: vi.fn(), saveReportTag: vi.fn(), deleteReportTag: vi.fn() } }));
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
