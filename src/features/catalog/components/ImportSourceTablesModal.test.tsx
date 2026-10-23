import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {ImportSourceTablesModal} from "./ImportSourceTablesModal";
import {catalogApi} from "../api/catalogApi";
import {ok,err} from "../../../shared/result/result";
vi.mock("../api/catalogApi",()=>({catalogApi:{listIntrospectionObjects:vi.fn(),previewImportSchema:vi.fn(),importSchema:vi.fn()}}));
beforeEach(()=>vi.resetAllMocks());afterEach(cleanup);
it("previews selection, reports partial failures and retries only failed tables",async()=>{
 vi.mocked(catalogApi.listIntrospectionObjects).mockResolvedValue(ok(["a","b"].map(objectName=>({schemaName:"public",objectName,objectType:"table"}))));
 vi.mocked(catalogApi.previewImportSchema).mockResolvedValue(ok({fields:[]} as never));
 vi.mocked(catalogApi.importSchema).mockResolvedValueOnce(ok({schema:{id:"created-a"}} as never)).mockResolvedValueOnce(err({type:"about:blank",instance:"/import",status:500,title:"Falha",detail:"Table b is unavailable"})).mockResolvedValueOnce(ok({schema:{id:"created-a"}} as never));
 const changed=vi.fn(),review=vi.fn();render(<ImportSourceTablesModal sourceId="source" sourceName="ERP" onClose={vi.fn()} onChanged={changed} onReview={review}/>);
 await screen.findByText("public.a");fireEvent.click(screen.getByRole("button",{name:"Marcar resultados"}));fireEvent.click(screen.getByRole("button",{name:"Revisar prévia"}));
 fireEvent.click(await screen.findByRole("button",{name:"Importar tabelas compatíveis"}));expect(await screen.findByText("Falha ao importar a tabela.")).toBeVisible();
 fireEvent.click(await screen.findByRole("button",{name:"Tentar novamente somente as falhas"}));await waitFor(()=>expect(screen.getByText("2 tabelas importadas")).toBeVisible());
 expect(catalogApi.importSchema).toHaveBeenCalledTimes(3);expect(vi.mocked(catalogApi.importSchema).mock.calls.map(c=>c[0].internalObjectName)).toEqual(["a","b","b"]);expect(changed).toHaveBeenCalledTimes(2);
 fireEvent.click(screen.getByRole("button",{name:"Revisar campos"}));expect(review).toHaveBeenCalledWith("created-a");
});
it("supports case-sensitive exact table search",async()=>{
 vi.mocked(catalogApi.listIntrospectionObjects).mockResolvedValue(ok(["Orders","orders","old_orders"].map(objectName=>({schemaName:"public",objectName,objectType:"table"}))));render(<ImportSourceTablesModal sourceId="s" sourceName="ERP" onClose={vi.fn()} onChanged={vi.fn()}/>);await screen.findByText("public.Orders");fireEvent.change(screen.getByRole("textbox"),{target:{value:"Orders"}});fireEvent.click(screen.getByRole("button",{name:"Aa"}));fireEvent.click(screen.getByRole("button",{name:"ab"}));expect(screen.getAllByRole("checkbox")).toHaveLength(1);expect(screen.getByText("public.Orders")).toBeVisible();
});
