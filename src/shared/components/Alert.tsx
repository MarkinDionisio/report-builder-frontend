import React from "react";
import { AlertCircle } from "lucide-react";
import type { ApiProblemDetails } from "../api/types";

/**
 * Mapping of known/expected business and validation error codes to user-friendly messages.
 */
import { KNOWN_ERROR_CODES, validationFieldLabel } from "../presentation/messages";
export { KNOWN_ERROR_CODES } from "../presentation/messages";

interface AlertProps {
  problem: ApiProblemDetails | null;
}

export const ProblemAlert: React.FC<AlertProps> = ({ problem }) => {
  if (!problem) return null;

  const hasValidationErrors = problem.errors && Object.keys(problem.errors).length > 0;
  const knownError = problem.code && Object.hasOwn(KNOWN_ERROR_CODES, problem.code) ? KNOWN_ERROR_CODES[problem.code] : null;

  // Determine if this is an expected known business/validation error
  const isExpectedError = Boolean(knownError || hasValidationErrors);

  // For unexpected errors, display a single polite generic message without exposing internal details
  let displayTitle = "Erro de Processamento";
  let displayMessage = "Ocorreu um erro ao processar sua requisição. Por favor, tente novamente mais tarde.";

  if (isExpectedError) {
    if (knownError) {
      displayTitle = knownError.title;
      displayMessage = knownError.message;
    } else if (hasValidationErrors) {
      displayTitle = "Erro de Validação";
      displayMessage = "Os dados fornecidos são inválidos. Por favor, verifique e tente novamente.";
    } else {
      displayTitle = "Atenção";
      displayMessage = "Não foi possível concluir a ação.";
    }
  }

  return (
    <div className="alert alert-danger animate-fade-in" role="alert">
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
        <AlertCircle size={18} style={{ flexShrink: 0 }} />
        <span className="alert-title">{displayTitle}</span>
      </div>

      <div style={{ marginTop: "0.2rem" }}>{displayMessage}</div>

      {hasValidationErrors && (
        <ul style={{ marginTop: "0.75rem", paddingLeft: "1.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          {Object.keys(problem.errors!).map((field) => (
            <li key={field}>
              <strong>{validationFieldLabel(field)}:</strong> Verifique o valor informado.
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const Alert: React.FC<{
  type: "error" | "warning" | "success" | "info";
  message: string;
  style?: React.CSSProperties;
}> = ({ type, message, style }) => {
  const bg =
    type === "error"
      ? "rgba(239, 68, 68, 0.1)"
      : type === "warning"
      ? "rgba(245, 158, 11, 0.1)"
      : type === "success"
      ? "rgba(34, 197, 94, 0.1)"
      : "rgba(59, 130, 246, 0.1)";

  const color =
    type === "error"
      ? "#ef4444"
      : type === "warning"
      ? "#f59e0b"
      : type === "success"
      ? "#22c55e"
      : "#3b82f6";

  return (
    <div role={type === "error" ? "alert" : "status"}
      style={{
        padding: "0.75rem 1rem",
        borderRadius: "6px",
        background: bg,
        color,
        fontSize: "0.875rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        ...style,
      }}
    >
      <AlertCircle size={16} style={{ flexShrink: 0 }} />
      <span>{message}</span>
    </div>
  );
};
