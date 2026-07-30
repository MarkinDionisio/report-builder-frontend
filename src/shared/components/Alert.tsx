import React from "react";
import { AlertCircle } from "lucide-react";
import type { ApiProblemDetails } from "../api/types";

/**
 * Mapping of known/expected business and validation error codes to user-friendly messages.
 */
export const KNOWN_ERROR_CODES: Record<string, { title: string; message: string }> = {
  // Auth
  "auth.invalid_credentials": {
    title: "Credenciais Inválidas",
    message: "E-mail ou senha incorretos. Verifique os dados informados.",
  },
  "auth.email_exists": {
    title: "E-mail Já Cadastrado",
    message: "Este endereço de e-mail já está em uso na plataforma.",
  },
  "auth.password_invalid": {
    title: "Senha Inválida",
    message: "A senha deve conter no mínimo 8 caracteres.",
  },
  "auth.refresh_token_required": {
    title: "Sessão Expirada",
    message: "Sua sessão expirou. Por favor, faça login novamente.",
  },
  "auth.refresh_token_invalid": {
    title: "Sessão Expirada",
    message: "Sua sessão expirou. Por favor, faça login novamente.",
  },
  "auth.invitation_token_required": {
    title: "Token de Convite Obrigatório",
    message: "O token de convite deve ser fornecido para continuar.",
  },
  "auth.invitation_not_found": {
    title: "Convite Não Encontrado",
    message: "O convite solicitado não foi localizado.",
  },
  "auth.invitation_not_pending": {
    title: "Convite Indisponível",
    message: "Este convite já foi aceito ou revogado anteriormente.",
  },
  "auth.invitation_expired": {
    title: "Convite Expirado",
    message: "Este convite expirou. Solicite um novo convite ao administrador.",
  },
  "auth.user_has_credentials": {
    title: "Usuário Já Possui Credenciais",
    message: "Esta conta já possui senha cadastrada. Por favor, faça login.",
  },

  // Organizations
  "organizations.name_required": {
    title: "Nome Obrigatório",
    message: "O nome da organização é obrigatório.",
  },
  "organizations.name_conflict": {
    title: "Nome em Uso",
    message: "Já existe uma organização cadastrada com este nome.",
  },
  "organizations.not_found": {
    title: "Organização Não Encontrada",
    message: "A organização solicitada não foi encontrada.",
  },
  "organizations.email_required": {
    title: "E-mail Obrigatório",
    message: "O endereço de e-mail é obrigatório.",
  },
  "organizations.user_not_found": {
    title: "Usuário Não Encontrado",
    message: "Nenhuma conta global foi localizada com este e-mail.",
  },
  "organizations.user_id_required": {
    title: "Usuário Obrigatório",
    message: "Nenhum usuário foi selecionado.",
  },
  "organizations.member_already_exists": {
    title: "Membro Já Cadastrado",
    message: "Este usuário já é membro desta organização.",
  },
  "organizations.membership_not_found": {
    title: "Membro Não Encontrado",
    message: "O vínculo deste membro não foi localizado.",
  },
  "organizations.role_required": {
    title: "Papel Obrigatório",
    message: "O papel na organização é obrigatório.",
  },
  "organizations.invalid_role": {
    title: "Papel Inválido",
    message: "O papel selecionado é inválido.",
  },
  "organizations.root_access_required": {
    title: "Acesso Restrito",
    message: "Esta ação requer privilégios de Administrador Root.",
  },
  "organizations.member_view_forbidden": {
    title: "Acesso Negado",
    message: "Você não possui permissão para visualizar os membros desta organização.",
  },
  "organizations.member_management_forbidden": {
    title: "Acesso Negado",
    message: "Você não possui permissão para gerenciar membros nesta organização.",
  },
  "organizations.administrator_assignment_forbidden": {
    title: "Permissão Insuficiente",
    message: "Apenas Administradores Root podem atribuir o papel de Administrador.",
  },
  "organizations.target_user_management_forbidden": {
    title: "Permissão Insuficiente",
    message: "Você não possui permissão para gerenciar este usuário.",
  },

  // Invitations
  "invitations.email_required": {
    title: "E-mail Obrigatório",
    message: "O e-mail é obrigatório para enviar o convite.",
  },
  "invitations.role_required": {
    title: "Papel Obrigatório",
    message: "O papel do convite é obrigatório.",
  },
  "invitations.invalid_role": {
    title: "Papel Inválido",
    message: "O papel selecionado para o convite é inválido.",
  },
  "invitations.pending_already_exists": {
    title: "Convite Já Pendente",
    message: "Já existe um convite pendente ativo para este e-mail nesta organização.",
  },
  "invitations.user_already_member": {
    title: "Usuário Já Membro",
    message: "Este usuário já é membro ativo da organização.",
  },
  "invitations.revoke_not_pending": {
    title: "Ação Não Permitida",
    message: "Apenas convites com status pendente podem ser revogados.",
  },
  "invitations.assign_administrator_forbidden": {
    title: "Permissão Insuficiente",
    message: "Apenas Administradores Root podem convidar com papel de Administrador.",
  },
  "invitations.manage_target_forbidden": {
    title: "Acesso Negado",
    message: "Você não possui permissão sobre esta conta.",
  },
  "invitations.organization_management_forbidden": {
    title: "Acesso Negado",
    message: "Você não possui permissão para gerenciar esta organização.",
  },

  // Users Global Role
  "users.not_found": {
    title: "Usuário Não Encontrado",
    message: "O usuário solicitado não foi localizado.",
  },
  "users.invalid_role": {
    title: "Papel Global Inválido",
    message: "O papel global informado é inválido.",
  },
  "users.root_access_required": {
    title: "Acesso Restrito",
    message: "Apenas Administradores Root podem alterar o papel global de usuários.",
  },
};

interface AlertProps {
  problem: ApiProblemDetails | null;
}

export const ProblemAlert: React.FC<AlertProps> = ({ problem }) => {
  if (!problem) return null;

  const hasValidationErrors = problem.errors && Object.keys(problem.errors).length > 0;
  const knownError = problem.code ? KNOWN_ERROR_CODES[problem.code] : null;

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
      displayTitle = problem.title || "Atenção";
      displayMessage = problem.detail || "Não foi possível concluir a ação.";
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
          {Object.entries(problem.errors!).map(([field, messages]) => (
            <li key={field}>
              <strong>{field}:</strong> {messages.join(", ")}
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
    <div
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

