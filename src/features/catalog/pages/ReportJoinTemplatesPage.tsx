import { ConfirmDeleteModal } from "../../organizations/components/ConfirmDeleteModal";
import { SourceActionMenu } from "../components/SourceActionMenu";
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

export const ReportJoinTemplatesPage: React.FC<{ embedded?: boolean; sourceId?: string }> = ({ embedded = false, sourceId }) => {
  const Container = embedded ? "section" : "main";
  const Heading = embedded ? "h3" : "h1";
  const { state, refreshUser } = useAuth();
  const user = state.status === "authenticated" ? state.user : null;
  const isRoot = user?.globalRole === "root";

  const [templates, setTemplates] = useState<ReportJoinTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<ReportJoinTemplate | undefined>(undefined);
  const [deleteTarget,setDeleteTarget]=useState<ReportJoinTemplate|null>(null);
  const [deleteError,setDeleteError]=useState("");
  const [formError,setFormError]=useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!isRoot) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
    const res = await catalogApi.listJoinTemplates();
    setLoading(false);

    if (isErr(res)) {
      if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      } else {
        setErrorMsg(res.error.detail || "Erro ao carregar Modelos de relacionamento.");
      }
    } else {
      setTemplates(res.value);
    }
    } catch {setErrorMsg("Falha de comunicação ao consultar modelos de relacionamento.");}
    finally {setLoading(false);}
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
      setFormError(res.error.detail || "Erro ao criar modelo de relacionamento.");
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
      setFormError(res.error.detail || "Erro ao atualizar modelo de relacionamento.");
      return false;
    }

    setTemplates((prev) => prev.map(t => (t.id === templateToEdit.id ? res.value : t)));
    return true;
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    setDeleteError("");
    try {

    const res = await catalogApi.deleteJoinTemplate(id);
    setIsDeleting(null);

    if (isErr(res)) {
      if (res.error.status === 403) {
        void refreshUser();
      }
      setDeleteError(res.error.detail || "Erro ao excluir modelo de relacionamento.");
      return false;
    } else {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      return true;
    }
    } finally {setIsDeleting(null);}
  };

  const openCreateModal = () => {
    setFormError("");
    setTemplateToEdit(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (template: ReportJoinTemplate) => {
    setFormError("");
    setTemplateToEdit(template);
    setIsModalOpen(true);
  };

  if (accessDenied) {
    return (
      <div style={{ minHeight: embedded ? undefined : "100vh", display: "flex", flexDirection: "column" }}>
        {!embedded && <Navbar />}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <ShieldAlert size={64} style={{ color: "#ef4444", marginBottom: "1rem" }} />
          <Heading style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>Acesso Negado</Heading>
          <p style={{ color: "var(--text-secondary)", maxWidth: "400px", textAlign: "center" }}>
            O gerenciamento de templates de join é restrito a usuários Root.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: embedded ? undefined : "100vh", display: "flex", flexDirection: "column" }}>
      {!embedded && <Navbar />}
      <Container className={embedded ? "source-embedded" : "admin-page"}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
          <div>
            <Heading style={{ fontSize: embedded ? "1.2rem" : "1.75rem", fontWeight: 700, margin: "0 0 0.25rem 0", display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Link size={28} style={{ color: "var(--primary-500)" }} />
              Modelos de relacionamento
            </Heading>
            <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>
              Definem como combinar tabelas nos relatórios. São globais: alterações podem afetar outras fontes que usam os mesmos nomes de tabelas e campos.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="btn btn-primary"
          >
            <Plus size={18} /> Novo modelo
          </button>
        </div>

        {errorMsg && (
          <div style={{ marginBottom: "1.5rem" }}>
            <Alert type="error" message={errorMsg} /><button className="btn btn-secondary" onClick={()=>void loadData()}>Consultar modelos novamente</button>
          </div>
        )}

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "4rem 2rem", display: "flex", justifyContent: "center" }}>
              <NeutralLoader message="Consultando modelos de relacionamento…" />
            </div>
          ) : templates.length === 0 ? (
            <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-secondary)" }}>
              <Link size={48} style={{ opacity: 0.2, margin: "0 auto 1rem auto" }} />
              <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-color)" }}>Nenhum modelo cadastrado</h3>
              <p>
                Cadastre um modelo para sugerir combinações de tabelas nos relatórios.
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
                        <SourceActionMenu label={"Opções de " + t.name}>
                          <button
                            onClick={() => openEditModal(t)}
                            className="btn-icon"
                            title="Editar Template"
                            disabled={isDeleting === t.id}
                          >
                            <Edit2 size={16} /> Editar modelo
                          </button>
                          <button
                            onClick={() => {setDeleteError("");setDeleteTarget(t);}}
                            className="btn-icon text-danger"
                            title="Excluir Template"
                            disabled={isDeleting === t.id}
                          >
                            {isDeleting === t.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <><Trash2 size={16} /> Excluir modelo</>
                            )}
                          </button>
                        </SourceActionMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Container>

      {deleteTarget && <ConfirmDeleteModal isOpen title="Excluir modelo de relacionamento" itemName={deleteTarget.name} warningText="Relatórios que utilizam este modelo podem deixar de funcionar. Esta biblioteca é global e compartilhada entre organizações." problem={null} errorMessage={deleteError} onClose={()=>setDeleteTarget(null)} onConfirm={()=>handleDelete(deleteTarget.id)}/> }
      {isModalOpen && (
        <JoinTemplateModal
          sourceId={sourceId}
          error={formError}
          isOpen={isModalOpen}
          templateToEdit={templateToEdit}
          onClose={() => setIsModalOpen(false)}
          onSubmit={templateToEdit ? handleUpdateSubmit : handleCreateSubmit}
        />
      )}
    </div>
  );
};
