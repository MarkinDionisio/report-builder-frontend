import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import type { Organization } from "../types";
import { organizationsApi } from "../api/organizationsApi";
import { catalogApi } from "../../catalog/api/catalogApi";
import type {
  CreateDataSourceRequest,
  DataSource,
  Profile,
  RootReportSchema,
  UpdateDataSourceRequest,
} from "../../catalog/types/catalogTypes";
import { isErr } from "../../../shared/result/result";
import { canManageOrganization } from "../../../shared/utils/roles";
import { Navbar } from "../../../shared/components/Navbar";
import { Alert } from "../../../shared/components/Alert";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { DataSourceModal } from "../../catalog/components/DataSourceModal";
import { IntrospectionModal } from "../../catalog/components/IntrospectionModal";
import { BootstrapModal } from "../../catalog/components/BootstrapModal";
import {
  Building2,
  Server,
  Users,
  Mail,
  Plus,
  ArrowLeft,
  Key,
  Database,
  FileText,
  Edit2,
  Trash2,
  RefreshCw,
  Layers,
  List,
  ShieldAlert,
  X,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

export const OrganizationDetailPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { state, refreshUser } = useAuth();
  const user = state.status === "authenticated" ? state.user : null;
  const isRoot = user?.globalRole === "root";

  const activeTabParam = searchParams.get("tab");
  const activeTab = !isRoot ? "profiles" : (activeTabParam || "datasources");

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [schemasByDs, setSchemasByDs] = useState<Record<string, RootReportSchema[]>>({});
  const initialExpandedDsId = searchParams.get("ds");
  const [expandedDsId, setExpandedDsId] = useState<string | null>(initialExpandedDsId);
  const [schemaSearchTerms, setSchemaSearchTerms] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals state
  const [isDsModalOpen, setIsDsModalOpen] = useState(false);
  const [editingDs, setEditingDs] = useState<DataSource | null>(null);
  const [deletingDs, setDeletingDs] = useState<DataSource | null>(null);
  const [introspectingDs, setIntrospectingDs] = useState<DataSource | null>(null);
  const [bootstrappingDs, setBootstrappingDs] = useState<DataSource | null>(null);
  const [verifyingDsId, setVerifyingDsId] = useState<string | null>(null);

  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [targetDsIdForSchema, setTargetDsIdForSchema] = useState<string>("");
  const [editingSchema, setEditingSchema] = useState<RootReportSchema | null>(null);
  const [deletingSchema, setDeletingSchema] = useState<RootReportSchema | null>(null);

  const [savingSchema, setSavingSchema] = useState(false);
  const [deletingDsLoading, setDeletingDsLoading] = useState(false);
  const [deletingSchemaLoading, setDeletingSchemaLoading] = useState(false);

  // Schema form state
  const [internalSchemaName, setInternalSchemaName] = useState("");
  const [internalObjectName, setInternalObjectName] = useState("");
  const [publicName, setPublicName] = useState("");
  const [description, setDescription] = useState("");

  const canManage = Boolean(user && organizationId && canManageOrganization(user, organizationId));

  const loadOrgDetails = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    setErrorMsg(null);

    const [orgsRes, dsRes, profRes] = await Promise.all([
      organizationsApi.list(),
      catalogApi.listDataSources(organizationId),
      canManage ? catalogApi.listProfiles(organizationId) : Promise.resolve(null),
    ]);

    setLoading(false);

    if (isErr(orgsRes)) {
      if (orgsRes.error.status === 403) {
        refreshUser();
      }
      setErrorMsg(orgsRes.error.detail || "Erro ao carregar dados da organização.");
      return;
    }

    const current = orgsRes.value.find((o) => o.id === organizationId);
    if (!current) {
      setErrorMsg("Organização não encontrada.");
      return;
    }
    setOrganization(current);

    if (!isErr(dsRes)) {
      setDataSources(dsRes.value);
    }

    if (profRes && !isErr(profRes)) {
      setProfiles(profRes.value);
    }
  }, [organizationId, canManage, refreshUser]);

  useEffect(() => {
    loadOrgDetails();
  }, [loadOrgDetails]);

  const loadSchemasForDs = useCallback(async (dsId: string) => {
    const res = await catalogApi.listReportSchemas(dsId);
    if (!isErr(res)) {
      setSchemasByDs((prev) => ({ ...prev, [dsId]: res.value }));
    }
  }, []);

  const toggleExpandDs = (dsId: string) => {
    const newId = expandedDsId === dsId ? null : dsId;
    setExpandedDsId(newId);
    
    setSearchParams(params => {
      if (newId) params.set("ds", newId);
      else params.delete("ds");
      return params;
    }, { replace: true });
  };

  useEffect(() => {
    if (expandedDsId && !schemasByDs[expandedDsId]) {
      loadSchemasForDs(expandedDsId).catch(console.error);
    }
  }, [expandedDsId, schemasByDs, loadSchemasForDs]);

  const changeTab = (tabName: string) => {
    setSearchParams({ tab: tabName });
  };

  // DataSource actions
  const handleCreateDsSubmit = async (data: CreateDataSourceRequest): Promise<boolean> => {
    const res = await catalogApi.createDataSource(data);
    if (isErr(res)) {
      setErrorMsg(res.error.detail || "Erro ao criar DataSource.");
      return false;
    }
    await loadOrgDetails();
    return true;
  };

  const handleUpdateDsSubmit = async (id: string, data: UpdateDataSourceRequest): Promise<boolean> => {
    const res = await catalogApi.updateDataSource(id, data);
    if (isErr(res)) {
      setErrorMsg(res.error.detail || "Erro ao atualizar DataSource.");
      return false;
    }
    await loadOrgDetails();
    return true;
  };

  const handleVerifyReadOnly = async (ds: DataSource) => {
    setVerifyingDsId(ds.id);
    setErrorMsg(null);
    const res = await catalogApi.verifyReadOnlyDataSource(ds.id);
    setVerifyingDsId(null);

    if (isErr(res)) {
      setErrorMsg(res.error.detail || "Erro ao verificar conexão.");
    } else {
      setDataSources((prev) => prev.map((item) => (item.id === ds.id ? res.value : item)));
    }
  };

  const handleDeleteDsConfirm = async () => {
    if (!deletingDs) return;
    setDeletingDsLoading(true);
    const res = await catalogApi.deleteDataSource(deletingDs.id);
    setDeletingDsLoading(false);

    if (isErr(res)) {
      setErrorMsg(res.error.detail || "Erro ao excluir DataSource.");
    } else {
      setDeletingDs(null);
      await loadOrgDetails();
    }
  };

  // Schema actions
  const openCreateSchemaModal = (dsId: string) => {
    setEditingSchema(null);
    setTargetDsIdForSchema(dsId);
    setInternalSchemaName("public");
    setInternalObjectName("");
    setPublicName("");
    setDescription("");
    setIsSchemaModalOpen(true);
  };

  const openEditSchemaModal = (schema: RootReportSchema) => {
    setEditingSchema(schema);
    setTargetDsIdForSchema(schema.dataSourceId);
    setPublicName(schema.publicName);
    setDescription(schema.description || "");
    setIsSchemaModalOpen(true);
  };

  const handleSaveSchema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicName.trim()) return;

    setSavingSchema(true);
    if (editingSchema) {
      const res = await catalogApi.updateReportSchema(editingSchema.id, {
        publicName: publicName.trim(),
        publicType: "object",
        description: description.trim() || null,
        isEnabled: true,
      });
      setSavingSchema(false);
      if (isErr(res)) {
        setErrorMsg(res.error.detail || "Erro ao atualizar schema.");
      } else {
        setIsSchemaModalOpen(false);
        await loadSchemasForDs(targetDsIdForSchema);
      }
    } else {
      const res = await catalogApi.createReportSchema({
        dataSourceId: targetDsIdForSchema,
        internalSchemaName: internalSchemaName.trim(),
        internalObjectName: internalObjectName.trim(),
        publicName: publicName.trim(),
        publicType: "object",
        description: description.trim() || null,
        isEnabled: true,
      });
      setSavingSchema(false);
      if (isErr(res)) {
        setErrorMsg(res.error.detail || "Erro ao criar schema.");
      } else {
        setIsSchemaModalOpen(false);
        await loadSchemasForDs(targetDsIdForSchema);
      }
    }
  };

  const handleDeleteSchemaConfirm = async () => {
    if (!deletingSchema) return;
    setDeletingSchemaLoading(true);
    const res = await catalogApi.deleteReportSchema(deletingSchema.id);
    setDeletingSchemaLoading(false);

    if (isErr(res)) {
      setErrorMsg(res.error.detail || "Erro ao excluir schema.");
    } else {
      const dsId = deletingSchema.dataSourceId;
      setDeletingSchema(null);
      await loadSchemasForDs(dsId);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="container" style={{ padding: "2rem 1rem" }}>
          <NeutralLoader message="Carregando central da organização..." />
        </main>
      </>
    );
  }

  if (errorMsg || !organization) {
    return (
      <>
        <Navbar />
        <main className="container" style={{ padding: "2rem 1rem" }}>
          <Alert type="error" message={errorMsg || "Organização não encontrada."} />
          <div style={{ marginTop: "1rem" }}>
            <Link to="/organizations" className="btn btn-secondary">
              <ArrowLeft size={16} /> Voltar para Organizações
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: "2rem 1rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <Link to="/organizations" className="btn btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}>
            <ArrowLeft size={16} /> Lista de Organizações
          </Link>
        </div>

        {/* Header Summary */}
        <div className="card" style={{ marginBottom: "1.5rem", padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.25rem 0", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Building2 size={32} className="text-accent" /> Central da Organização: {organization.name}
              </h1>
              <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                {organization.description || <em>Sem descrição.</em>}
              </p>
              <div style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>
                ID: {organization.id}
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <Link to={`/organizations/${organization.id}/members`} className="btn btn-secondary" style={{ fontSize: "0.85rem" }}>
                <Users size={16} /> Membros
              </Link>
              <Link to={`/organizations/${organization.id}/invitations`} className="btn btn-secondary" style={{ fontSize: "0.85rem" }}>
                <Mail size={16} /> Convites
              </Link>
            </div>
          </div>
        </div>

        {errorMsg && <Alert type="error" message={errorMsg} style={{ marginBottom: "1.25rem" }} />}

        {/* Tab Header Navigation */}
        <div style={{ display: "flex", borderBottom: "2px solid var(--border-color)", marginBottom: "1.5rem" }}>
          {isRoot && (
            <button
              onClick={() => changeTab("datasources")}
              className={`btn ${activeTab === "datasources" ? "btn-primary" : "btn-secondary"}`}
              style={{ borderRadius: "8px 8px 0 0", padding: "0.65rem 1.25rem", borderBottom: "none" }}
            >
              <Server size={18} /> DataSources & Schemas ({dataSources.length})
            </button>
          )}
          <button
            onClick={() => changeTab("profiles")}
            className={`btn ${activeTab === "profiles" ? "btn-primary" : "btn-secondary"}`}
            style={{ borderRadius: "8px 8px 0 0", padding: "0.65rem 1.25rem", borderBottom: "none", marginLeft: isRoot ? "0.5rem" : "0" }}
          >
            <Key size={18} /> Perfis de Acesso & Grants ({profiles.length})
          </button>
        </div>

        {/* Tab 1: DataSources & Schemas */}
        {isRoot && activeTab === "datasources" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem" }}>DataSources da Organização</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>
                  Conexões com bancos de dados e seus respectivos Schemas e Fields.
                </p>
              </div>
              {isRoot && (
                <button onClick={() => setIsDsModalOpen(true)} className="btn btn-primary" style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Plus size={16} /> Novo DataSource
                </button>
              )}
            </div>

            {dataSources.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem", color: "var(--text-secondary)" }}>
                <Server size={40} style={{ opacity: 0.4, marginBottom: "0.75rem" }} />
                <h4>Nenhum DataSource cadastrado nesta organização</h4>
                {isRoot && (
                  <button onClick={() => setIsDsModalOpen(true)} className="btn btn-primary" style={{ marginTop: "1rem" }}>
                    <Plus size={16} /> Cadastrar DataSource para {organization.name}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {dataSources.map((ds) => {
                  const isExpanded = expandedDsId === ds.id;
                  const dsSchemas = schemasByDs[ds.id] || [];

                  return (
                    <div key={ds.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                      <div style={{ padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <Database size={20} className="text-accent" />
                            <h4 style={{ margin: 0, fontSize: "1.1rem" }}>{ds.name}</h4>
                            <span className="badge badge-info">{ds.provider}</span>
                            {ds.isEnabled ? (
                              <span className="badge badge-success">Habilitado</span>
                            ) : (
                              <span className="badge badge-warning">Desabilitado</span>
                            )}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.35rem" }}>
                            Modo: <code>{ds.executionCredentialMode}</code> | Status: <strong>{ds.readOnlyVerificationStatus}</strong>
                          </div>
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
                          {isRoot && (
                            <>
                              <button
                                onClick={() => handleVerifyReadOnly(ds)}
                                className="btn btn-secondary"
                                style={{ padding: "0.35rem 0.6rem", fontSize: "0.775rem" }}
                                title="Testar Conexão Read-Only"
                                disabled={verifyingDsId === ds.id}
                              >
                                <RefreshCw size={14} className={verifyingDsId === ds.id ? "animate-spin" : ""} /> Verificação
                              </button>
                              <button
                                onClick={() => setIntrospectingDs(ds)}
                                className="btn btn-secondary"
                                style={{ padding: "0.35rem 0.6rem", fontSize: "0.775rem" }}
                                title="Introspecção Unitária"
                              >
                                <Database size={14} /> Introspecção
                              </button>
                              <button
                                onClick={() => setBootstrappingDs(ds)}
                                className="btn btn-secondary"
                                style={{ padding: "0.35rem 0.6rem", fontSize: "0.775rem" }}
                                title="Bootstrap em Massa"
                              >
                                <Layers size={14} /> Bootstrap
                              </button>
                              <button
                                onClick={() => setEditingDs(ds)}
                                className="btn-icon"
                                title="Editar DataSource"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => setDeletingDs(ds)}
                                className="btn-icon text-danger"
                                title="Excluir DataSource"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => toggleExpandDs(ds.id)}
                            className="btn btn-primary"
                            style={{ padding: "0.35rem 0.75rem", fontSize: "0.775rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
                          >
                            <FileText size={14} />
                            {isExpanded ? "Ocultar Schemas" : "Ver Schemas"}
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Schemas Section */}
                      {isExpanded && (
                        <div style={{ background: "var(--surface-color)", borderTop: "1px solid var(--border-color)", padding: "1rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                              Schemas Catalogados do DataSource ({dsSchemas.length})
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                              <div style={{ position: "relative" }}>
                                <Search size={14} style={{ position: "absolute", left: "10px", top: "8px", color: "var(--text-secondary)" }} />
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Buscar schema..."
                                  style={{ paddingLeft: "30px", fontSize: "0.8rem", height: "30px", width: "200px" }}
                                  value={schemaSearchTerms[ds.id] || ""}
                                  onChange={(e) => setSchemaSearchTerms(prev => ({ ...prev, [ds.id]: e.target.value }))}
                                />
                              </div>
                              {isRoot && (
                                <button
                                  onClick={() => openCreateSchemaModal(ds.id)}
                                  className="btn btn-secondary"
                                  style={{ padding: "0.3rem 0.6rem", fontSize: "0.775rem", height: "30px" }}
                                >
                                  <Plus size={14} /> Novo Schema Manual
                                </button>
                              )}
                            </div>
                          </div>

                          {(() => {
                            const st = schemaSearchTerms[ds.id]?.toLowerCase() || "";
                            const filteredSchemas = dsSchemas.filter(s => 
                              s.publicName.toLowerCase().includes(st) || 
                              s.internalSchemaName.toLowerCase().includes(st) || 
                              s.internalObjectName.toLowerCase().includes(st)
                            );

                            if (filteredSchemas.length === 0) {
                              return (
                                <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                  {dsSchemas.length === 0 ? "Nenhum schema catalogado para este DataSource. Use Introspecção ou Bootstrap para importar." : "Nenhum schema encontrado na busca."}
                                </div>
                              );
                            }

                            return (
                              <table className="table" style={{ width: "100%", fontSize: "0.8rem", margin: 0 }}>
                                <thead>
                                  <tr>
                                    <th>Nome Público</th>
                                    <th>Origem DB</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: "right" }}>Ações</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredSchemas.map((schema) => (
                                  <tr key={schema.id}>
                                    <td>
                                      <strong>{schema.publicName}</strong>
                                    </td>
                                    <td>
                                      <code>{schema.internalSchemaName}.{schema.internalObjectName}</code>
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
                                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                                          title="Gerenciar Campos (Fields)"
                                        >
                                          <List size={13} /> Campos (Fields)
                                        </button>
                                        {isRoot && (
                                          <>
                                            <button
                                              onClick={() => openEditSchemaModal(schema)}
                                              className="btn-icon"
                                              title="Editar Metadata"
                                            >
                                              <Edit2 size={14} />
                                            </button>
                                            <button
                                              onClick={() => setDeletingSchema(schema)}
                                              className="btn-icon text-danger"
                                              title="Excluir Schema"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Perfis de Acesso & Grants */}
        {activeTab === "profiles" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem" }}>Perfis de Acesso da Organização</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>
                  Perfis configurados para controlar permissões aos relatórios de <strong>{organization.name}</strong>.
                </p>
              </div>
              {canManage && (
                <Link to={`/organizations/${organization.id}/profiles`} className="btn btn-primary" style={{ fontSize: "0.85rem" }}>
                  <Plus size={16} /> Gerenciar Perfis
                </Link>
              )}
            </div>

            {profiles.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem", color: "var(--text-secondary)" }}>
                <Key size={40} style={{ opacity: 0.4, marginBottom: "0.75rem" }} />
                <h4>Nenhum perfil cadastrado nesta organização</h4>
                {canManage && (
                  <Link to={`/organizations/${organization.id}/profiles`} className="btn btn-primary" style={{ marginTop: "1rem" }}>
                    <Plus size={16} /> Criar Primeiro Perfil
                  </Link>
                )}
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <table className="table" style={{ width: "100%", margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Perfil</th>
                      <th>Descrição</th>
                      <th style={{ textAlign: "right" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((prof) => (
                      <tr key={prof.id}>
                        <td>
                          <strong>{prof.name}</strong>
                        </td>
                        <td>
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                            {prof.description || <em style={{ opacity: 0.5 }}>Sem descrição</em>}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Link
                            to={`/organizations/${organization.id}/profiles/${prof.id}/grants`}
                            className="btn btn-primary"
                            style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                          >
                            <Key size={14} /> Editar Grants / Permissões
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        {isDsModalOpen && (
          <DataSourceModal
            organizationId={organization.id}
            onClose={() => setIsDsModalOpen(false)}
            onSubmitCreate={handleCreateDsSubmit}
            onSubmitUpdate={handleUpdateDsSubmit}
          />
        )}

        {editingDs && (
          <DataSourceModal
            organizationId={organization.id}
            dataSource={editingDs}
            onClose={() => setEditingDs(null)}
            onSubmitCreate={handleCreateDsSubmit}
            onSubmitUpdate={handleUpdateDsSubmit}
          />
        )}

        {introspectingDs && (
          <IntrospectionModal
            dataSourceId={introspectingDs.id}
            dataSourceName={introspectingDs.name}
            onClose={() => setIntrospectingDs(null)}
            onSuccess={loadOrgDetails}
          />
        )}

        {bootstrappingDs && (
          <BootstrapModal
            dataSourceId={bootstrappingDs.id}
            dataSourceName={bootstrappingDs.name}
            onClose={() => setBootstrappingDs(null)}
            onSuccess={loadOrgDetails}
          />
        )}

        {/* Schema Create/Edit Modal */}
        {isSchemaModalOpen && (
          <div className="modal-backdrop">
            <div className="modal-container" style={{ maxWidth: "500px" }}>
              <div className="modal-header">
                <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
                  {editingSchema ? `Editar Schema: ${editingSchema.publicName}` : "Novo Schema Manual"}
                </h3>
                <button onClick={() => setIsSchemaModalOpen(false)} className="btn-icon">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveSchema} style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {!editingSchema ? (
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
                  ) : null}

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
                      placeholder="Pedidos de Venda"
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
                    />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                  <button type="button" onClick={() => setIsSchemaModalOpen(false)} className="btn btn-secondary">
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingSchema}>
                    {savingSchema ? "Salvando..." : editingSchema ? "Atualizar Schema" : "Criar Schema"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete DS Modal */}
        {deletingDs && (
          <div className="modal-backdrop">
            <div className="modal-container" style={{ maxWidth: "450px" }}>
              <div className="modal-header">
                <h3 style={{ margin: 0, color: "var(--danger-500)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ShieldAlert size={20} /> Excluir DataSource
                </h3>
                <button onClick={() => setDeletingDs(null)} className="btn-icon">
                  <X size={20} />
                </button>
              </div>
              <div style={{ padding: "1.25rem" }}>
                <p style={{ margin: "0 0 1rem 0" }}>
                  Excluir o DataSource <strong>{deletingDs.name}</strong>?
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button onClick={() => setDeletingDs(null)} className="btn btn-secondary" disabled={deletingDsLoading}>
                    Cancelar
                  </button>
                  <button onClick={handleDeleteDsConfirm} className="btn btn-danger" disabled={deletingDsLoading}>
                    {deletingDsLoading ? "Excluindo..." : "Excluir"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Schema Modal */}
        {deletingSchema && (
          <div className="modal-backdrop">
            <div className="modal-container" style={{ maxWidth: "450px" }}>
              <div className="modal-header">
                <h3 style={{ margin: 0, color: "var(--danger-500)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ShieldAlert size={20} /> Excluir Schema
                </h3>
                <button onClick={() => setDeletingSchema(null)} className="btn-icon">
                  <X size={20} />
                </button>
              </div>
              <div style={{ padding: "1.25rem" }}>
                <p style={{ margin: "0 0 1rem 0" }}>
                  Excluir o schema <strong>{deletingSchema.publicName}</strong>?
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button onClick={() => setDeletingSchema(null)} className="btn btn-secondary" disabled={deletingSchemaLoading}>
                    Cancelar
                  </button>
                  <button onClick={handleDeleteSchemaConfirm} className="btn btn-danger" disabled={deletingSchemaLoading}>
                    {deletingSchemaLoading ? "Excluindo..." : "Excluir"}
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
