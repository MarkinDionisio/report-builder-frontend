import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ApiProblemDetails } from "../../../shared/api/types";
import { ProblemAlert } from "../../../shared/components/Alert";
import { isErr } from "../../../shared/result/result";
import { LogIn, Loader2, ShieldCheck } from "lucide-react";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [problem, setProblem] = useState<ApiProblemDetails | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProblem(null);
    setIsLoading(true);

    const result = await login({ email, password });

    setIsLoading(false);

    if (isErr(result)) {
      setProblem(result.error);
    } else {
      navigate(from, { replace: true });
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
        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
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
            <ShieldCheck size={32} />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Report Builder
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            Acesse sua conta para continuar
          </p>
        </div>

        <ProblemAlert problem={problem} />

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="login-email">
              E-mail
            </label>
            <input
              id="login-email"
              type="email"
              required
              className={`input-field ${problem?.code === "auth.invalid_credentials" ? "has-error" : ""}`}
              placeholder="seu.email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="login-password">
              Senha
            </label>
            <input
              id="login-password"
              type="password"
              required
              className={`input-field ${problem?.code === "auth.invalid_credentials" ? "has-error" : ""}`}
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
                <Loader2 size={18} className="animate-spin" /> Entrando...
              </>
            ) : (
              <>
                <LogIn size={18} /> Entrar
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
          Não possui uma conta? <Link to="/register">Cadastre-se</Link>
        </div>
      </div>
    </div>
  );
};
