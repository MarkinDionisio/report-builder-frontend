import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProblemAlert } from "./Alert";
import type { ApiProblemDetails } from "../api/types";

describe("ProblemAlert Error Filtering Component", () => {
  it("should render clean expected user-friendly message for known error codes", () => {
    const knownProblem: ApiProblemDetails = {
      type: "about:blank",
      title: "Bad Request",
      status: 400,
      detail: "Raw backend detail string",
      instance: "/api/v1/auth/login",
      code: "auth.invalid_credentials",
    };

    render(<ProblemAlert problem={knownProblem} />);

    expect(screen.getByText("Credenciais Inválidas")).toBeInTheDocument();
    expect(
      screen.getByText("E-mail ou senha incorretos. Verifique os dados informados.")
    ).toBeInTheDocument();
    // Ensures raw backend detail was replaced with friendly message
    expect(screen.queryByText("Raw backend detail string")).not.toBeInTheDocument();
  });

  it("should render field validation errors when problem.errors is present", () => {
    const validationProblem: ApiProblemDetails = {
      type: "about:blank",
      title: "Validation Error",
      status: 400,
      detail: "Validation failed",
      instance: "/api/v1/organizations",
      errors: {
        name: ["O nome é obrigatório"],
      },
    };

    render(<ProblemAlert problem={validationProblem} />);

    expect(screen.getByText("name:")).toBeInTheDocument();
    expect(screen.getByText("O nome é obrigatório")).toBeInTheDocument();
  });

  it("should SUPPRESS raw internal technical messages for unexpected 500 errors", () => {
    const unexpectedProblem: ApiProblemDetails = {
      type: "about:blank",
      title: "Internal Server Error",
      status: 500,
      detail: "NullReferenceException at DbContext.cs:142 inside internal database driver",
      instance: "/api/v1/organizations",
      traceId: "trace-abc-123",
    };

    render(<ProblemAlert problem={unexpectedProblem} />);

    // Must NOT reveal raw system exception/technical text
    expect(
      screen.queryByText("NullReferenceException at DbContext.cs:142 inside internal database driver")
    ).not.toBeInTheDocument();

    // Must display generic polite message & traceId
    expect(
      screen.getByText("Ocorreu um erro ao processar sua requisição. Por favor, tente novamente mais tarde.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/Trace ID/i)).not.toBeInTheDocument();
  });
});
