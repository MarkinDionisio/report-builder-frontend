import React, { useState, useEffect } from "react";
import type { ApiProblemDetails } from "../../../shared/api/types";
import { ProblemAlert } from "../../../shared/components/Alert";
import type { Organization, UpsertOrganizationRequest } from "../types";
import { X, Loader2, Building } from "lucide-react";

interface OrganizationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpsertOrganizationRequest) => Promise<boolean>;
  initialData?: Organization | null;
  problem: ApiProblemDetails | null;
}

export const OrganizationFormModal: React.FC<OrganizationFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  problem,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setDescription(initialData.description || "");
    } else {
      setName("");
      setDescription("");
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await onSubmit({
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
    });
    setIsSubmitting(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "1rem",
      }}
    >
      <div className="glass-card animate-fade-in" style={{ maxWidth: "500px", padding: "1.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Building size={22} style={{ color: "var(--primary-500)" }} />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
              {initialData ? "Editar Organização" : "Nova Organização"}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        <ProblemAlert problem={problem} />

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="org-name">
              Nome da Organização *
            </label>
            <input
              id="org-name"
              type="text"
              required
              className="input-field"
              placeholder="Ex: Operação Brasil"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="org-description">
              Descrição (Opcional)
            </label>
            <textarea
              id="org-description"
              className="input-field"
              style={{ minHeight: "90px", resize: "vertical" }}
              placeholder="Descreva a finalidade desta organização..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Salvando...
                </>
              ) : (
                "Salvar Organização"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
