import {cleanup,render,screen} from "@testing-library/react";
import {MemoryRouter,Route,Routes} from "react-router-dom";
import {afterEach,expect,it,vi} from "vitest";
import {ProfileGrantsEditorPage} from "./ProfileGrantsEditorPage";
import {catalogApi} from "../api/catalogApi";
import {ok,err} from "../../../shared/result/result";
vi.mock("../../auth/context/AuthContext",()=>({useAuth:()=>({state:{status:"authenticated",user:{globalRole:"root",organizations:[]}},refreshUser:vi.fn()})}));
vi.mock("../../../shared/components/Navbar",()=>({Navbar:()=>null}));
vi.mock("../api/catalogApi",()=>({catalogApi:{getProfile:vi.fn(),getProfileGrants:vi.fn(),listDataSources:vi.fn(),getAvailableCatalog:vi.fn(),updateProfileGrants:vi.fn()}}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
it("blocks editing when existing grants could not be read",async()=>{
 vi.mocked(catalogApi.getProfile).mockResolvedValue(ok({id:"p",organizationId:"org",name:"Equipe",organizationName:"Empresa",description:null}));
 vi.mocked(catalogApi.listDataSources).mockResolvedValue(ok([{id:"s",organizationId:"org"}] as never));
 vi.mocked(catalogApi.getProfileGrants).mockResolvedValue(err({type:"about:blank",instance:"/grants",status:500,title:"Falha",detail:"Falha ao ler grants"}));
 render(<MemoryRouter initialEntries={["/organizations/org/data-sources/s"]}><Routes><Route path="/organizations/:organizationId/data-sources/:dataSourceId" element={<ProfileGrantsEditorPage embedded profileId="p" sourceId="s"/>}/></Routes></MemoryRouter>);
 expect(await screen.findByText(/Nenhuma alteração será permitida/)).toBeVisible();expect(screen.queryByRole("button",{name:/Liberar fonte/})).toBeNull();expect(catalogApi.getAvailableCatalog).not.toHaveBeenCalled();expect(catalogApi.updateProfileGrants).not.toHaveBeenCalled();
});
