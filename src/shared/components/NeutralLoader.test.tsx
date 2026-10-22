import {cleanup,render,screen} from "@testing-library/react";
import {afterEach,expect,it} from "vitest";
import {NeutralLoader} from "./NeutralLoader";
afterEach(cleanup);
it("provides a prominent accessible panel with explicit data context",()=>{render(<NeutralLoader title="Carregando organização" message="Consultando membros e profiles da organização…"/>);const status=screen.getByRole("status");expect(status).toHaveAttribute("aria-live","polite");expect(status).toHaveAttribute("aria-atomic","true");expect(status).toHaveTextContent("Carregando organização");expect(status).toHaveTextContent("Consultando membros e profiles da organização…");expect(status.querySelector("svg")).toHaveAttribute("aria-hidden","true");});
it("uses the same accessible feedback for compact regions",()=>{render(<NeutralLoader compact message="Consultando campos da tabela…"/>);expect(screen.getByRole("status")).toHaveClass("data-loading--compact");expect(screen.getByRole("status")).toHaveTextContent("Consultando campos da tabela…");});
