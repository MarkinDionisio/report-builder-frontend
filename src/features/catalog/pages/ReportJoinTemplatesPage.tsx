import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import type { ReportJoinTemplate, CreateReportJoinTemplateRequest, UpdateReportJoinTemplateRequest } from "../types/catalogTypes";
import { catalogApi } from "../api/catalogApi";
import { isErr } from "../../../shared/result/result";
import { Navbar } from "../../../shared/components/Navbar";
import { Alert } from "../../../shared/components/Alert";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { JoinTemplateModal } from "../components/JoinTemplateModal";
import { Plus, Trash2, Edit2, Link, ShieldAlert, Loader2 } from "lucide-react";

export const ReportJoinTemplatesPage: React.FC = () => {
  const { state, refreshUser } = useAuth();
  const user = state.status === "authenticated" ? state.user : null;
  const isRoot = user?.globalRole === "root";

  const [templates, setTemplates] = useState<ReportJoinTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<ReportJoinTemplate | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!isRoot) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await catalogApi.listJoinTemplates();
    setLoading(false);

    if (isErr(res)) {
      if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      } else {
        setErrorMsg(res.error.detail || "Erro ao carregar Join Templates.");
      }
    } else {
      setTemplates(res.value);
    }
  }, [isRoot, refreshUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateSubmit = async (data: CreateReportJoinTemplateRequest): Promise<boolean> => {
    const res = await catalogApi.createJoinTemplate(data);
    if (isErr(res)) {
      if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      }
      setErrorMsg(res.error.detail || "Erro ao criar Join Template.");
      return false;
    }
    
    // Substitui localmente como sugerido pelo guia "Após criar ou atualizar, substitua o item local..."
    setTemplates((prev) => [...prev, res.value]);
    return true;
  };

  const handleUpdateSubmit = async (data: UpdateReportJoinTemplateRequest): Promise<boolean> => {
    if (!templateToEdit) return false;
    
    const res = await catalogApi.updateJoinTemplate(templateToEdit.id, data);
    if (isErr(res)) {
      if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      }
      setErrorMsg(res.error.detail || "Erro ao atualizar Join Template.");
      return false;
    }

    setTemplates((prev) => prev.map(t => (t.id === templateToEdit.id ? res.value : t)));
    return true;
  };

  const handleDelete = async (id: string) => {
    // "Desabilitar ou excluir um template faz com que ele deixe de aparecer... Exija confirmação explícita... Não use atualização otimista"
    if (!window.confirm("Tem certeza que deseja excluir este template? Relatórios antigos que o utilizam podem quebrar (report_definition.join_template_unavailable).")) {
      return;
    }

    setIsDeleting(id);
    setErrorMsg(null);

    const res = await catalogApi.deleteJoinTemplate(id);
    setIsDeleting(null);

    if (isErr(res)) {
      if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      }
      setErrorMsg(res.error.detail || "Erro ao excluir Join Template.");
    } else {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const openCreateModal = () => {
    setTemplateToEdit(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (template: ReportJoinTemplate) => {
    setTemplateToEdit(template);
    setIsModalOpen(true);
  };

  if (accessDenied) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <ShieldAlert size={64} style={{ color: "#ef4444", marginBottom: "1rem" }} />
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>Acesso Negado</h1>
          <p style={{ color: "var(--text-secondary)", maxWidth: "400px", textAlign: "center" }}>
            O gerenciamento de templates de join é restrito ao papel global <code>root</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ maxWidth: "1200px", width: "100%", margin: "2rem auto", padding: "0 1.5rem", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.25rem 0", display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Link size={28} style={{ color: "var(--primary-500)" }} />
              Join Templates
            </h1>
            <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>
              Gerencie relações globais disponíveis para os catálogos efetivos.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="btn btn-primary"
          >
            <Plus size={18} /> Novo Template
          </button>
        </div>

        {errorMsg && (
          <div style={{ marginBottom: "1.5rem" }}>
            <Alert type="error" message={errorMsg} />
          </div>
        )}

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "4rem 2rem", display: "flex", justifyContent: "center" }}>
              <NeutralLoader />
            </div>
          ) : templates.length === 0 ? (
            <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-secondary)" }}>
              <Link size={48} style={{ opacity: 0.2, margin: "0 auto 1rem auto" }} />
              <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-color)" }}>Nenhum template cadastrado</h3>
              <p>
                Cadastre o primeiro template para permitir joins no Report Designer.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", margin: 0 }}>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Alias</th>
                    <th>Tipo</th>
                    <th>Relação</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                    <th style={{ textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.id}>
                      <td><strong>{t.name}</strong></td>
                      <td><code style={{ background: "rgba(236, 72, 153, 0.1)", padding: "0.2rem 0.4rem", borderRadius: "4px", color: "#ec4899" }}>{t.suggestedAlias}</code></td>
                      <td>
                        <span className="badge badge-info" style={{ textTransform: "uppercase" }}>
                          {t.joinType}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.85rem" }}>
                        <div style={{ fontFamily: "monospace" }}>{t.leftInternalObjectName}.{t.leftInternalFieldName}</div>
                        <div style={{ color: "var(--text-muted)" }}>=</div>
                        <div style={{ fontFamily: "monospace" }}>{t.rightInternalObjectName}.{t.rightInternalFieldName}</div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {t.isEnabled ? (
                          <span className="badge badge-success">
                            Ativo
                          </span>
                        ) : (
                          <span className="badge badge-warning">
                            Inativo
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                          <button
                            onClick={() => openEditModal(t)}
                            className="btn-icon"
                            title="Editar Template"
                            disabled={isDeleting === t.id}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="btn-icon text-danger"
                            title="Excluir Template"
                            disabled={isDeleting === t.id}
                          >
                            {isDeleting === t.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {isModalOpen && (
        <JoinTemplateModal
          isOpen={isModalOpen}
          templateToEdit={templateToEdit}
          onClose={() => setIsModalOpen(false)}
          onSubmit={templateToEdit ? handleUpdateSubmit : handleCreateSubmit}
        />
      )}
    </div>
  );
};
