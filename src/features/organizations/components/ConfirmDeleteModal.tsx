import "../styles/organizationOverview.css";
import React, { useRef, useState } from "react";
import { useModalFocus } from "../../../shared/hooks/useModalFocus";
import { Alert } from "../../../shared/components/Alert";
import type { ApiProblemDetails } from "../../../shared/api/types";
import { ProblemAlert } from "../../../shared/components/Alert";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
  title: string;
  itemName: string;
  warningText: string;
  problem: ApiProblemDetails | null;
  errorMessage?: string;
  confirmLabel?: string;
  question?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  warningText,
  problem,
  errorMessage,
  confirmLabel = "Confirmar Exclusão",
  question = "Tem certeza de que deseja excluir",
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const lock = useRef(false);
  const [unexpectedError, setUnexpectedError] = useState("");
  const dialogRef = useModalFocus(isOpen, onClose, isDeleting);
  if (!isOpen) return null;

  const handleConfirm = async () => {
    if(lock.current)return;
    lock.current=true;setIsDeleting(true);setUnexpectedError("");
    try {if(await onConfirm())onClose();}
    catch {setUnexpectedError("Não foi possível concluir a operação. Tente novamente.");}
    finally {lock.current=false;setIsDeleting(false);}
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "1rem",
      }}
    >
      <div ref={dialogRef} tabIndex={-1} className="card organization-dialog confirm-dialog animate-fade-in" role="dialog" aria-modal="true" aria-label={title} style={{ maxWidth: "480px", padding: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", color: "#ef4444" }}>
          <AlertTriangle size={28} />
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>{title}</h2>
        </div>

        <ProblemAlert problem={problem} />
        {(errorMessage || unexpectedError) && <Alert type="error" message={errorMessage || unexpectedError}/>}

        <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
          {question} <strong style={{ color: "var(--text-primary)" }}>{itemName}</strong>?
        </p>

        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "var(--radius-md)",
            padding: "0.85rem 1rem",
            fontSize: "0.85rem",
            color: "#fca5a5",
            marginBottom: "1.5rem",
          }}
        >
          {warningText}
        </div>

        <div className="confirm-dialog__actions">
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isDeleting}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="btn"
            style={{ backgroundColor: "#ef4444", color: "#ffffff" }}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Excluindo...
              </>
            ) : (
              <>
                <Trash2 size={16} /> {confirmLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
