import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ApiProblemDetails } from "../../../shared/api/types";
import { ProblemAlert } from "../../../shared/components/Alert";
import { isErr } from "../../../shared/result/result";
import { MailCheck, Loader2, KeyRound } from "lucide-react";

export const AcceptInvitationPage: React.FC = () => {
  const { acceptInvitation } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState(searchParams.get("token") || "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [problem, setProblem] = useState<ApiProblemDetails | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProblem(null);

    if (!token.trim()) {
      setProblem({
        type: "about:blank",
        title: "Token Obrigatório",
        status: 400,
        detail: "O token do convite deve ser fornecido.",
        code: "auth.invitation_token_required",
        instance: "/api/v1/auth/invitations/accept",
      });
      return;
    }

    if (password.length < 8) {
      setProblem({
        type: "about:blank",
        title: "Senha Inválida",
        status: 400,
        detail: "A senha deve ter no mínimo 8 caracteres.",
        code: "auth.password_invalid",
        instance: "/api/v1/auth/invitations/accept",
      });
      return;
    }

    setIsLoading(true);

    const result = await acceptInvitation({ token, name, password });

    setIsLoading(false);

    if (isErr(result)) {
      setProblem(result.error);
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "1.5rem",
      }}
    >
      <div className="glass-card animate-fade-in" style={{ maxWidth: "460px" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              display: "inline-flex",
              padding: "0.75rem",
              borderRadius: "1rem",
              background: "rgba(99, 102, 241, 0.15)",
              color: "var(--primary-500)",
              marginBottom: "1rem",
            }}
          >
            <MailCheck size={32} />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Aceitar Convite
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            Complete seu cadastro para ingressar na organização
          </p>
        </div>

        <ProblemAlert problem={problem} />

        {problem?.code === "auth.user_has_credentials" && (
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <Link to="/login" className="btn btn-secondary" style={{ width: "100%" }}>
              Ir para o Login
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="invite-token">
              Token do Convite
            </label>
            <input
              id="invite-token"
              type="text"
              required
              className="input-field"
              placeholder="Cole seu token de convite aqui"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="invite-name">
              Seu Nome Completo
            </label>
            <input
              id="invite-name"
              type="text"
              required
              className="input-field"
              placeholder="Maria Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="invite-password">
              Defina sua Senha (mínimo 8 caracteres)
            </label>
            <input
              id="invite-password"
              type="password"
              required
              minLength={8}
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "1rem" }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Processando...
              </>
            ) : (
              <>
                <KeyRound size={18} /> Aceitar e Acessar
              </>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.75rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--border-color)",
            textAlign: "center",
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
          }}
        >
          Já é cadastrado? <Link to="/login">Fazer Login</Link>
        </div>
      </div>
    </div>
  );
};
