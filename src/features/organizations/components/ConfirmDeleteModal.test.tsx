import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {ConfirmDeleteModal} from "./ConfirmDeleteModal";
afterEach(cleanup);
const props={isOpen:true,title:"Excluir tabela",itemName:"Pedidos",warningText:"Os dados do banco serão preservados.",problem:null};
it("focuses cancel, traps keyboard focus, cancels on Escape and restores focus",()=>{
 const trigger=document.createElement("button");document.body.append(trigger);trigger.focus();const close=vi.fn();const view=render(<ConfirmDeleteModal {...props} onClose={close} onConfirm={vi.fn()}/>);
 expect(screen.getByRole("button",{name:"Cancelar"})).toHaveFocus();fireEvent.keyDown(document.activeElement!,{key:"Tab",shiftKey:true});expect(screen.getByRole("button",{name:"Confirmar Exclusão"})).toHaveFocus();fireEvent.keyDown(document.activeElement!,{key:"Escape"});expect(close).toHaveBeenCalledOnce();view.unmount();expect(trigger).toHaveFocus();trigger.remove();
});
it("prevents repeated confirmation and closing while pending",async()=>{
 let resolve!:(value:boolean)=>void;const confirm=vi.fn(()=>new Promise<boolean>(done=>{resolve=done;})),close=vi.fn();render(<ConfirmDeleteModal {...props} onClose={close} onConfirm={confirm}/>);const button=screen.getByRole("button",{name:"Confirmar Exclusão"});fireEvent.click(button);fireEvent.click(button);fireEvent.keyDown(screen.getByRole("dialog"),{key:"Escape"});expect(confirm).toHaveBeenCalledOnce();expect(close).not.toHaveBeenCalled();expect(screen.getByRole("button",{name:"Cancelar"})).toBeDisabled();resolve(true);await waitFor(()=>expect(close).toHaveBeenCalledOnce());
});
it("keeps unexpected errors inside the modal and permits retry",async()=>{
 const confirm=vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValue(true),close=vi.fn();render(<ConfirmDeleteModal {...props} onClose={close} onConfirm={confirm}/>);fireEvent.click(screen.getByRole("button",{name:"Confirmar Exclusão"}));expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível concluir");expect(close).not.toHaveBeenCalled();fireEvent.click(screen.getByRole("button",{name:"Confirmar Exclusão"}));await waitFor(()=>expect(close).toHaveBeenCalledOnce());
});

it("handles Escape after a disabled submit button loses focus",async()=>{const close=vi.fn();render(<ConfirmDeleteModal {...props} onClose={close} onConfirm={vi.fn().mockResolvedValue(false)}/>);document.body.focus();fireEvent.keyDown(document.body,{key:"Escape"});expect(close).toHaveBeenCalledOnce();});
