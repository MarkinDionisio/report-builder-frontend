import {useState} from "react";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {ClearSearchButton} from "./ClearSearchButton";
afterEach(cleanup);
it("appears only with text, clears without submitting and returns focus",()=>{
 const submit=vi.fn();function Harness(){const [text,setText]=useState("");return <form onSubmit={submit}><label>Buscar<input value={text} onChange={event=>setText(event.target.value)}/></label><ClearSearchButton value={text} onClear={()=>setText("")}/></form>;}
 render(<Harness/>);expect(screen.queryByRole("button",{name:"Limpar busca"})).toBeNull();const input=screen.getByRole("textbox",{name:"Buscar"});fireEvent.change(input,{target:{value:"Pedidos"}});fireEvent.click(screen.getByRole("button",{name:"Limpar busca"}));expect(input).toHaveValue("");expect(input).toHaveFocus();expect(submit).not.toHaveBeenCalled();expect(screen.queryByRole("button",{name:"Limpar busca"})).toBeNull();
});
