import React from "react";
import { Loader2 } from "lucide-react";

interface NeutralLoaderProps {
  message?: string;
  minHeight?: string;
}

export const NeutralLoader: React.FC<NeutralLoaderProps> = ({
  message = "Carregando...",
  minHeight = "300px",
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight,
        color: "var(--text-secondary)",
        gap: "1rem",
        padding: "2rem 0",
      }}
    >
      <Loader2 size={36} className="animate-spin" style={{ color: "var(--primary-500)" }} />
      <span style={{ fontSize: "0.95rem", fontWeight: 500, letterSpacing: "0.02em" }}>
        {message}
      </span>
    </div>
  );
};
