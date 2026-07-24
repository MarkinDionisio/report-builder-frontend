import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ApiProblemDetails } from "../../../shared/api/types";
import { ProblemAlert } from "../../../shared/components/Alert";
import { isErr } from "../../../shared/result/result";
import { UserPlus, Loader2, UserCheck } from "lucide-react";

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [problem, setProblem] = useState<ApiProblemDetails | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProblem(null);

    if (password.length < 8) {
      setProblem({
        type: "about:blank",
        title: "Senha Inválida",
        status: 400,
        detail: "A senha deve ter no mínimo 8 caracteres.",
        code: "auth.password_invalid",
        instance: "/api/v1/auth/register",
      });
      return;
    }

    setIsLoading(true);

    const result = await register({ name, email, password });

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
      <div className="glass-card animate-fade-in" style={{ maxWidth: "440px" }}>
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
            <UserCheck size={32} />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Criar Conta
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            Preencha os dados abaixo para se cadastrar
          </p>
        </div>

        <ProblemAlert problem={problem} />

        <form noValidate onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="register-name">
              Nome Completo
            </label>
            <input
              id="register-name"
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
            <label className="input-label" htmlFor="register-email">
              E-mail
            </label>
            <input
              id="register-email"
              type="email"
              required
              className={`input-field ${problem?.code === "auth.email_exists" ? "has-error" : ""}`}
              placeholder="maria@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="register-password">
              Senha (mínimo 8 caracteres)
            </label>
            <input
              id="register-password"
              type="password"
              required
              minLength={8}
              className={`input-field ${problem?.code === "auth.password_invalid" ? "has-error" : ""}`}
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
                <Loader2 size={18} className="animate-spin" /> Cadastrando...
              </>
            ) : (
              <>
                <UserPlus size={18} /> Cadastrar
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
          Já possui uma conta? <Link to="/login">Faça Login</Link>
        </div>
      </div>
    </div>
  );
};
