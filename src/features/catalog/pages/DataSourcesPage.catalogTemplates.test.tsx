import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {MemoryRouter,Route,Routes} from "react-router-dom";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {OrganizationDataSources} from "../components/OrganizationDataSources";
import {catalogApi} from "../api/catalogApi";
import {ok} from "../../../shared/result/result";
vi.mock("../api/catalogApi",()=>({catalogApi:{listDataSources:vi.fn(),listReportSchemas:vi.fn(),createDataSource:vi.fn(),deleteDataSource:vi.fn()}}));
vi.mock("../components/DataSourceModal",()=>({DataSourceModal:({organizationId,onSubmitCreate}:{organizationId:string;onSubmitCreate:(r:unknown)=>Promise<boolean>})=><button onClick={()=>void onSubmitCreate({organizationId,name:"Nova conexão"})}>Concluir cadastro</button>}));
const source={id:"new",name:"Nova conexão",organizationId:"org",provider:"postgresql" as const,executionCredentialMode:"existingReadOnlyUser" as const,readOnlyVerificationStatus:"pending" as const,isEnabled:true,adminConnectionStringMasked:"***",executionConnectionStringMasked:"***",hasClientCertificate:false};
beforeEach(()=>{vi.resetAllMocks();vi.mocked(catalogApi.listDataSources).mockResolvedValue(ok([source]));vi.mocked(catalogApi.listReportSchemas).mockResolvedValue(ok([]));});afterEach(cleanup);
it("includes empty sources and continues a saved connection to choosing tables",async()=>{
 vi.mocked(catalogApi.createDataSource).mockResolvedValue(ok(source));render(<MemoryRouter><Routes><Route path="/" element={<OrganizationDataSources organizationId="org" isRoot/>}/><Route path="/organizations/org/data-sources/new" element={<p>Escolher tabelas depois de salvar</p>}/></Routes></MemoryRouter>);
 expect(await screen.findByText(/0 tabelas/)).toBeVisible();expect(screen.getByText(/validar conexão de somente leitura/)).toBeVisible();
 fireEvent.click(screen.getByRole("button",{name:"Cadastrar fonte"}));fireEvent.click(screen.getByRole("button",{name:"Concluir cadastro"}));
 expect(await screen.findByText("Escolher tabelas depois de salvar")).toBeVisible();await waitFor(()=>expect(catalogApi.createDataSource).toHaveBeenCalledWith({organizationId:"org",name:"Nova conexão"}));expect(catalogApi.deleteDataSource).not.toHaveBeenCalled();
});
it("does not offer connection creation to administrators",async()=>{render(<MemoryRouter><OrganizationDataSources organizationId="org" isRoot={false}/></MemoryRouter>);await waitFor(()=>expect(catalogApi.listDataSources).toHaveBeenCalledWith("org"));expect(screen.queryByRole("button",{name:"Cadastrar fonte"})).toBeNull();});
