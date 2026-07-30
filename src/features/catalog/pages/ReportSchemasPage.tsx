import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import type {
  CreateReportSchemaRequest,
  DataSource,
  RootReportSchema,
  UpdateReportSchemaRequest,
} from "../types/catalogTypes";
import type { Organization } from "../../organizations/types";
import { catalogApi } from "../api/catalogApi";
import { organizationsApi } from "../../organizations/api/organizationsApi";
import { isErr } from "../../../shared/result/result";
import { Navbar } from "../../../shared/components/Navbar";
import { Alert } from "../../../shared/components/Alert";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  ShieldAlert,
  List,
  X,
  Database,
  Building2,
  ArrowRight,
  Layers,
} from "lucide-react";

export const ReportSchemasPage: React.FC = () => {
  const { state, refreshUser } = useAuth();
  const navigate = useNavigate();
  const user = state.status === "authenticated" ? state.user : null;
  const isRoot = user?.globalRole === "root";

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [schemas, setSchemas] = useState<RootReportSchema[]>([]);

  // Cascading Selection State
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedDsId, setSelectedDsId] = useState<string>("");

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingDataSources, setLoadingDataSources] = useState(false);
  const [loadingSchemas, setLoadingSchemas] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSchema, setEditingSchema] = useState<RootReportSchema | null>(null);
  const [deletingSchema, setDeletingSchema] = useState<RootReportSchema | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [internalSchemaName, setInternalSchemaName] = useState("");
  const [internalObjectName, setInternalObjectName] = useState("");
  const [publicName, setPublicName] = useState("");
  const [publicType] = useState("object");
  const [description, setDescription] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);

  // Initial load: Organizations
  useEffect(() => {
    async function init() {
      if (!isRoot) {
        setAccessDenied(true);
        setLoadingInitial(false);
        return;
      }

      setLoadingInitial(true);
      setErrorMsg(null);

      const orgsRes = await organizationsApi.list();
      setLoadingInitial(false);

      if (isErr(orgsRes)) {
        if (orgsRes.error.status === 403) {
          setAccessDenied(true);
          refreshUser();
        } else {
          setErrorMsg(orgsRes.error.detail || "Erro ao carregar organizações.");
        }
      } else {
        setOrganizations(orgsRes.value);
        if (orgsRes.value.length > 0) {
          setSelectedOrgId(orgsRes.value[0].id);
        }
      }
    }
    init();
  }, [isRoot, refreshUser]);

  // Cascade Step 2: Load DataSources when Organization changes
  const loadDataSourcesForOrg = useCallback(
    async (orgId: string) => {
      if (!orgId) {
        setDataSources([]);
        setSelectedDsId("");
        return;
      }

      setLoadingDataSources(true);
      setErrorMsg(null);
      setDataSources([]);
      setSelectedDsId("");
      setSchemas([]);

      const dsRes = await catalogApi.listDataSources(orgId);
      setLoadingDataSources(false);

      if (isErr(dsRes)) {
        if (dsRes.error.status === 403) {
          setAccessDenied(true);
          refreshUser();
        } else {
          setErrorMsg(dsRes.error.detail || "Erro ao carregar DataSources da organização.");
        }
      } else {
        setDataSources(dsRes.value);
        if (dsRes.value.length > 0) {
          setSelectedDsId(dsRes.value[0].id);
        }
      }
    },
    [refreshUser]
  );

  useEffect(() => {
    if (selectedOrgId) {
      loadDataSourcesForOrg(selectedOrgId);
    }
  }, [selectedOrgId, loadDataSourcesForOrg]);

  // Cascade Step 3: Load Schemas when DataSource changes
  const loadSchemasForDs = useCallback(
    async (dsId: string) => {
      if (!dsId) {
        setSchemas([]);
        return;
      }

      setLoadingSchemas(true);
      setErrorMsg(null);

      const schemasRes = await catalogApi.listReportSchemas(dsId);
      setLoadingSchemas(false);

      if (isErr(schemasRes)) {
        if (schemasRes.error.status === 403) {
          setAccessDenied(true);
          refreshUser();
        } else {
          setErrorMsg(schemasRes.error.detail || "Erro ao carregar schemas do DataSource.");
        }
      } else {
        setSchemas(schemasRes.value);
      }
    },
    [refreshUser]
  );

  useEffect(() => {
    if (selectedDsId) {
      loadSchemasForDs(selectedDsId);
    }
  }, [selectedDsId, loadSchemasForDs]);

  const openCreateModal = () => {
    setEditingSchema(null);
    setInternalSchemaName("public");
    setInternalObjectName("");
    setPublicName("");
    setDescription("");
    setIsEnabled(true);
    setIsCreateOpen(true);
  };

  const openEditModal = (schema: RootReportSchema) => {
    setEditingSchema(schema);
    setPublicName(schema.publicName);
    setDescription(schema.description || "");
    setIsEnabled(schema.isEnabled);
    setIsCreateOpen(true);
  };

  const handleSaveSchema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicName.trim()) {
      setErrorMsg("O nome público é obrigatório.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    if (editingSchema) {
      const payload: UpdateReportSchemaRequest = {
        publicName: publicName.trim(),
        publicType,
        description: description.trim() || null,
        isEnabled,
      };

      const res = await catalogApi.updateReportSchema(editingSchema.id, payload);
      setSaving(false);

      if (isErr(res)) {
        if (res.error.status === 403) {
          setAccessDenied(true);
          refreshUser();
        }
        setErrorMsg(res.error.detail || "Erro ao atualizar schema.");
      } else {
        setIsCreateOpen(false);
        setEditingSchema(null);
        await loadSchemasForDs(selectedDsId);
      }
    } else {
      if (!selectedDsId || !internalSchemaName.trim() || !internalObjectName.trim()) {
        setErrorMsg("DataSource, Schema Interno e Objeto Interno são obrigatórios.");
        setSaving(false);
        return;
      }

      const payload: CreateReportSchemaRequest = {
        dataSourceId: selectedDsId,
        internalSchemaName: internalSchemaName.trim(),
        internalObjectName: internalObjectName.trim(),
        publicName: publicName.trim(),
        publicType,
        description: description.trim() || null,
        isEnabled,
      };

      const res = await catalogApi.createReportSchema(payload);
      setSaving(false);

      if (isErr(res)) {
        if (res.error.status === 403) {
          setAccessDenied(true);
          refreshUser();
        }
        setErrorMsg(res.error.detail || "Erro ao criar schema.");
      } else {
        setIsCreateOpen(false);
        await loadSchemasForDs(selectedDsId);
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSchema) return;
    setDeleting(true);
    setErrorMsg(null);

    const res = await catalogApi.deleteReportSchema(deletingSchema.id);
    setDeleting(false);

    if (isErr(res)) {
      if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      }
      setErrorMsg(res.error.detail || "Erro ao excluir schema.");
    } else {
      setDeletingSchema(null);
      await loadSchemasForDs(selectedDsId);
    }
  };

  const currentOrg = organizations.find((o) => o.id === selectedOrgId);
  const currentDs = dataSources.find((d) => d.id === selectedDsId);

  if (accessDenied || (!isRoot && !loadingInitial)) {
    return (
      <>
        <Navbar />
        <main className="container" style={{ padding: "2rem 1rem" }}>
          <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
            <ShieldAlert size={48} style={{ color: "var(--danger-500)", marginBottom: "1rem" }} />
            <h2>Acesso Negado</h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto 1.5rem auto" }}>
              Apenas administradores globais (<code>root</code>) possuem permissão para gerenciar os Schemas do Catálogo Global.
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: "2rem 1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.25rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FileText size={28} className="text-accent" /> Catálogo de Schemas Globais
            </h1>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>
              Navegação em cascata: selecione a <strong>Organização</strong> &rarr; <strong>DataSource</strong> &rarr; <strong>Schemas</strong>.
            </p>
          </div>
          {selectedOrgId && selectedDsId && (
            <button onClick={openCreateModal} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Plus size={18} /> Novo Schema Manual
            </button>
          )}
        </div>

        {errorMsg && <Alert type="error" message={errorMsg} style={{ marginBottom: "1.25rem" }} />}

        {/* Cascading Selector Header */}
        <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.95rem", marginBottom: "1rem", color: "var(--text-primary)" }}>
            <Layers size={18} className="text-accent" /> Fluxo de Seleção em Cascata
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 24px 1fr", gap: "1rem", alignItems: "center" }}>
            {/* Step 1: Organization */}
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Building2 size={16} className="text-accent" /> 1. Organização
              </label>
              <select
                className="form-select"
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                disabled={loadingInitial}
              >
                <option value="">-- Selecione uma Organização --</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: "1.2rem" }}>
              <ArrowRight size={20} />
            </div>

            {/* Step 2: DataSource */}
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Database size={16} className="text-accent" /> 2. DataSource
              </label>
              <select
                className="form-select"
                value={selectedDsId}
                onChange={(e) => setSelectedDsId(e.target.value)}
                disabled={!selectedOrgId || loadingDataSources}
              >
                {!selectedOrgId ? (
                  <option value="">Selecione uma Organização primeiro</option>
                ) : loadingDataSources ? (
                  <option value="">Carregando DataSources...</option>
                ) : dataSources.length === 0 ? (
                  <option value="">Nenhum DataSource nesta organização</option>
                ) : (
                  <>
                    <option value="">-- Selecione um DataSource --</option>
                    {dataSources.map((ds) => (
                      <option key={ds.id} value={ds.id}>
                        {ds.name} ({ds.provider})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Cascade Step 3 Display */}
        {loadingInitial || loadingDataSources ? (
          <NeutralLoader message="Carregando dados da cascata..." />
        ) : !selectedOrgId ? (
          <div className="card" style={{ textAlign: "center", padding: "3.5rem 1.5rem", color: "var(--text-secondary)" }}>
            <Building2 size={48} style={{ opacity: 0.3, marginBottom: "0.75rem" }} />
            <h3>Etapa 1: Selecione a Organização</h3>
            <p style={{ maxWidth: "480px", margin: "0 auto" }}>
              Para acessar o catálogo de schemas, selecione primeiro a organização proprietária no seletor em cascata acima.
            </p>
          </div>
        ) : !selectedDsId ? (
          <div className="card" style={{ textAlign: "center", padding: "3.5rem 1.5rem", color: "var(--text-secondary)" }}>
            <Database size={48} style={{ opacity: 0.3, marginBottom: "0.75rem" }} />
            <h3>Etapa 2: Selecione o DataSource</h3>
            {dataSources.length === 0 ? (
              <div>
                <p style={{ maxWidth: "500px", margin: "0 auto 1.5rem auto", color: "var(--danger-500)" }}>
                  A organização <strong>{currentOrg?.name}</strong> não possui nenhum DataSource cadastrado.
                </p>
                <Link to="/data-sources" className="btn btn-primary">
                  Cadastrar DataSource para {currentOrg?.name}
                </Link>
              </div>
            ) : (
              <p style={{ maxWidth: "480px", margin: "0 auto" }}>
                Selecione um dos <strong>{dataSources.length} DataSources</strong> da organização <strong>{currentOrg?.name}</strong> acima para exibir e gerenciar seus schemas.
              </p>
            )}
          </div>
        ) : loadingSchemas ? (
          <NeutralLoader message={`Carregando schemas do DataSource ${currentDs?.name}...`} />
        ) : schemas.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3.5rem 1.5rem", color: "var(--text-secondary)" }}>
            <FileText size={48} style={{ opacity: 0.3, marginBottom: "0.75rem" }} />
            <h3>Etapa 3: Nenhum Schema Catalogado</h3>
            <p style={{ marginBottom: "1.5rem" }}>
              O DataSource <strong>{currentDs?.name}</strong> da organização <strong>{currentOrg?.name}</strong> ainda não possui schemas catalogados.
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <Link to="/data-sources" className="btn btn-secondary">
                <Database size={16} /> Ir para Introspecção / Bootstrap em DataSources
              </Link>
              <button onClick={openCreateModal} className="btn btn-primary">
                <Plus size={16} /> Criar Schema Manualmente
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ background: "var(--surface-color)", padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                Schemas do DataSource <strong>{currentDs?.name}</strong> (Organização: <strong>{currentOrg?.name}</strong>)
              </div>
              <span className="badge badge-info">{schemas.length} Schemas</span>
            </div>

            <table className="table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr>
                  <th>Nome Público / Descrição</th>
                  <th>Origem Interna (DB)</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {schemas.map((schema) => (
                  <tr key={schema.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{schema.publicName}</div>
                      {schema.description && (
                        <div style={{ fontSize: "0.775rem", color: "var(--text-secondary)" }}>{schema.description}</div>
                      )}
                    </td>
                    <td>
                      <code style={{ fontSize: "0.8rem" }}>
                        {schema.internalSchemaName}.{schema.internalObjectName}
                      </code>
                    </td>
                    <td>
                      {schema.isEnabled ? (
                        <span className="badge badge-success">Habilitado</span>
                      ) : (
                        <span className="badge badge-warning">Desabilitado</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                        <button
                          onClick={() => navigate(`/report-schemas/${schema.id}/fields`)}
                          className="btn btn-secondary"
                          style={{ padding: "0.35rem 0.6rem", fontSize: "0.775rem" }}
                          title="Gerenciar Campos do Schema"
                        >
                          <List size={14} /> Fields
                        </button>
                        <button
                          onClick={() => openEditModal(schema)}
                          className="btn-icon"
                          title="Editar Metadata"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingSchema(schema)}
                          className="btn-icon text-danger"
                          title="Excluir Schema"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create / Edit Modal */}
        {isCreateOpen && (
          <div className="modal-backdrop">
            <div className="modal-container" style={{ maxWidth: "550px" }}>
              <div className="modal-header">
                <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
                  {editingSchema ? `Editar Schema: ${editingSchema.publicName}` : "Novo Schema Manual"}
                </h3>
                <button onClick={() => setIsCreateOpen(false)} className="btn-icon">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveSchema} style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {!editingSchema ? (
                    <>
                      <div style={{ background: "var(--surface-color)", padding: "0.75rem", borderRadius: "6px", fontSize: "0.85rem" }}>
                        DataSource Origem: <strong>{currentDs?.name}</strong> (Organização: <strong>{currentOrg?.name}</strong>)
                      </div>

                      <div className="responsive-grid-2col">
                        <div>
                          <label className="form-label" htmlFor="schema-internal-name">
                            Schema DB Interno *
                          </label>
                          <input
                            id="schema-internal-name"
                            type="text"
                            className="form-input"
                            value={internalSchemaName}
                            onChange={(e) => setInternalSchemaName(e.target.value)}
                            placeholder="public"
                            required
                          />
                        </div>
                        <div>
                          <label className="form-label" htmlFor="schema-internal-obj">
                            Objeto DB Interno *
                          </label>
                          <input
                            id="schema-internal-obj"
                            type="text"
                            className="form-input"
                            value={internalObjectName}
                            onChange={(e) => setInternalObjectName(e.target.value)}
                            placeholder="orders"
                            required
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ background: "var(--surface-color)", padding: "0.75rem", borderRadius: "6px", fontSize: "0.85rem" }}>
                      Origem Interna: <code>{editingSchema.internalSchemaName}.{editingSchema.internalObjectName}</code> (Não alterável no PATCH)
                    </div>
                  )}

                  <div>
                    <label className="form-label" htmlFor="schema-public-name">
                      Nome Público *
                    </label>
                    <input
                      id="schema-public-name"
                      type="text"
                      className="form-input"
                      value={publicName}
                      onChange={(e) => setPublicName(e.target.value)}
                      placeholder="Ex: Pedidos de Venda"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" htmlFor="schema-description">
                      Descrição (Opcional)
                    </label>
                    <textarea
                      id="schema-description"
                      className="form-input"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descreva o propósito deste conjunto de relatórios..."
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      id="schema-enabled"
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => setIsEnabled(e.target.checked)}
                      style={{ width: "18px", height: "18px", accentColor: "var(--primary-500)" }}
                    />
                    <label htmlFor="schema-enabled" style={{ fontSize: "0.9rem", cursor: "pointer", fontWeight: 500 }}>
                      Schema Habilitado
                    </label>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
                  <button type="button" onClick={() => setIsCreateOpen(false)} className="btn btn-secondary" disabled={saving}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Salvando..." : editingSchema ? "Atualizar Schema" : "Criar Schema"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingSchema && (
          <div className="modal-backdrop">
            <div className="modal-container" style={{ maxWidth: "450px" }}>
              <div className="modal-header">
                <h3 style={{ margin: 0, color: "var(--danger-500)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ShieldAlert size={20} /> Confirmar Exclusão
                </h3>
                <button onClick={() => setDeletingSchema(null)} className="btn-icon">
                  <X size={20} />
                </button>
              </div>
              <div style={{ padding: "1.25rem" }}>
                <p style={{ margin: "0 0 1rem 0", fontSize: "0.95rem" }}>
                  Tem certeza que deseja excluir o schema <strong>{deletingSchema.publicName}</strong>?
                </p>
                <div style={{ background: "rgba(239, 68, 68, 0.1)", padding: "0.75rem", borderRadius: "6px", fontSize: "0.85rem", color: "var(--danger-500)", marginBottom: "1.25rem" }}>
                  A exclusão remove todos os campos catalogados, grants e políticas associados.
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button onClick={() => setDeletingSchema(null)} className="btn btn-secondary" disabled={deleting}>
                    Cancelar
                  </button>
                  <button onClick={handleDeleteConfirm} className="btn btn-danger" disabled={deleting}>
                    {deleting ? "Excluindo..." : "Sim, Excluir Schema"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
};
