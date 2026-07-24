import React from "react";
import { Loader2 } from "lucide-react";

export const NeutralLoader: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-secondary)",
        gap: "1rem",
      }}
    >
      <Loader2 size={36} className="animate-spin" style={{ color: "var(--primary-500)" }} />
      <span style={{ fontSize: "0.95rem", fontWeight: 500, letterSpacing: "0.02em" }}>
        Carregando sessão...
      </span>
    </div>
  );
};
