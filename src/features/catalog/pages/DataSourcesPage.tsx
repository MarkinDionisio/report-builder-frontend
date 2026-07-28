import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import type { DataSource, CreateDataSourceRequest, UpdateDataSourceRequest } from "../types/catalogTypes";
import type { Organization } from "../../organizations/types";
import { catalogApi } from "../api/catalogApi";
import { organizationsApi } from "../../organizations/api/organizationsApi";
import { isErr } from "../../../shared/result/result";
import { Navbar } from "../../../shared/components/Navbar";
import { Alert } from "../../../shared/components/Alert";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { DataSourceModal } from "../components/DataSourceModal";
import { IntrospectionModal } from "../components/IntrospectionModal";
import { BootstrapModal } from "../components/BootstrapModal";
import { Server, Plus, RefreshCw, Layers, Database, Trash2, Edit2, ShieldAlert, X, Building2 } from "lucide-react";

export const DataSourcesPage: React.FC = () => {
  const { state, refreshUser } = useAuth();
  const user = state.status === "authenticated" ? state.user : null;
  const isRoot = user?.globalRole === "root";

  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDataSource, setEditingDataSource] = useState<DataSource | null>(null);
  const [introspectingDataSource, setIntrospectingDataSource] = useState<DataSource | null>(null);
  const [bootstrappingDataSource, setBootstrappingDataSource] = useState<DataSource | null>(null);
  const [deletingDataSource, setDeletingDataSource] = useState<DataSource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Action in progress state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!isRoot) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const [dsRes, orgsRes] = await Promise.all([
      catalogApi.listDataSources(selectedOrgFilter || undefined),
      organizationsApi.list(),
    ]);

    setLoading(false);

    if (isErr(dsRes)) {
      if (dsRes.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      } else {
        setErrorMsg(dsRes.error.detail || "Erro ao carregar DataSources.");
      }
    } else {
      setDataSources(dsRes.value);
    }

    if (!isErr(orgsRes)) {
      setOrganizations(orgsRes.value);
    }
  }, [isRoot, selectedOrgFilter, refreshUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateSubmit = async (data: CreateDataSourceRequest): Promise<boolean> => {
    const res = await catalogApi.createDataSource(data);
    if (isErr(res)) {
      if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      }
      setErrorMsg(res.error.detail || "Erro ao criar DataSource.");
      return false;
    }
    await loadData();
    return true;
  };

  const handleUpdateSubmit = async (id: string, data: UpdateDataSourceRequest): Promise<boolean> => {
    const res = await catalogApi.updateDataSource(id, data);
    if (isErr(res)) {
      if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      }
      setErrorMsg(res.error.detail || "Erro ao atualizar DataSource.");
      return false;
    }
    await loadData();
    return true;
  };

  const handleVerifyReadOnly = async (ds: DataSource) => {
    setVerifyingId(ds.id);
    setErrorMsg(null);
    const res = await catalogApi.verifyReadOnlyDataSource(ds.id);
    setVerifyingId(null);

    if (isErr(res)) {
      if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      }
      setErrorMsg(res.error.detail || "Erro ao verificar conexão read-only.");
    } else {
      setDataSources((prev) => prev.map((item) => (item.id === ds.id ? res.value : item)));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDataSource) return;
    setIsDeleting(true);
    setErrorMsg(null);

    const res = await catalogApi.deleteDataSource(deletingDataSource.id);
    setIsDeleting(false);

    if (isErr(res)) {
      if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      }
      setErrorMsg(res.error.detail || "Erro ao excluir DataSource.");
    } else {
      setDeletingDataSource(null);
      await loadData();
    }
  };

  const getOrganizationName = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    return org ? org.name : orgId;
  };

  const getStatusBadge = (status: DataSource["readOnlyVerificationStatus"]) => {
    switch (status) {
      case "verified":
        return <span className="badge badge-success">Verificado</span>;
      case "failed":
        return <span className="badge badge-error">Falhou</span>;
      case "suspicious":
        return <span className="badge badge-warning">Suspeito</span>;
      case "pending":
      default:
        return <span className="badge badge-info">Pendente</span>;
    }
  };

  if (accessDenied || (!isRoot && !loading)) {
    return (
      <>
        <Navbar />
        <main className="container" style={{ padding: "2rem 1rem" }}>
          <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
            <ShieldAlert size={48} style={{ color: "var(--danger-500)", marginBottom: "1rem" }} />
            <h2>Acesso Negado</h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto 1.5rem auto" }}>
              Apenas administradores globais (<code>root</code>) possuem permissão para gerenciar os DataSources do sistema.
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
              <Server size={28} className="text-accent" /> DataSources Administrativos
            </h1>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>
              Gerencie conexões de banco de dados vinculadas às organizações.
            </p>
          </div>
          <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Plus size={18} /> Novo DataSource
          </button>
        </div>

        {/* Organization Filter Bar */}
        {organizations.length > 0 && (
          <div className="card" style={{ padding: "0.85rem 1.25rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>
              <Building2 size={16} className="text-accent" /> Filtrar por Organização:
            </div>
            <select
              className="form-select"
              style={{ maxWidth: "320px", fontSize: "0.85rem" }}
              value={selectedOrgFilter}
              onChange={(e) => setSelectedOrgFilter(e.target.value)}
            >
              <option value="">Todas as Organizações ({organizations.length})</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {errorMsg && <Alert type="error" message={errorMsg} style={{ marginBottom: "1.25rem" }} />}

        {loading ? (
          <NeutralLoader message="Carregando DataSources..." />
        ) : dataSources.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem", color: "var(--text-secondary)" }}>
            <Server size={40} style={{ opacity: 0.4, marginBottom: "0.75rem" }} />
            <h3>Nenhum DataSource cadastrado</h3>
            <p style={{ marginBottom: "1.5rem" }}>Cadastre conexões com bancos de dados PostgreSQL vinculadas a uma organização.</p>
            <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary">
              <Plus size={16} /> Cadastrar Primeiro DataSource
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr>
                  <th>Nome / Provider</th>
                  <th>Organização Proprietária</th>
                  <th>Status Verificação</th>
                  <th>Credencial / Certificado</th>
                  <th>Status Geral</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {dataSources.map((ds) => (
                  <tr key={ds.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{ds.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        Provider: <code>{ds.provider}</code>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                        {getOrganizationName(ds.organizationId)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {getStatusBadge(ds.readOnlyVerificationStatus)}
                        <button
                          onClick={() => handleVerifyReadOnly(ds)}
                          className="btn-icon"
                          title="Testar Conexão Read-Only"
                          disabled={verifyingId === ds.id}
                        >
                          <RefreshCw size={14} className={verifyingId === ds.id ? "animate-spin" : ""} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.8rem" }}>
                        Mode: <code>{ds.executionCredentialMode}</code>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        Certificado PFX: {ds.hasClientCertificate ? "Sim" : "Não"}
                      </div>
                    </td>
                    <td>
                      {ds.isEnabled ? (
                        <span className="badge badge-success">Habilitado</span>
                      ) : (
                        <span className="badge badge-warning">Desabilitado</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                        <button
                          onClick={() => setIntrospectingDataSource(ds)}
                          className="btn btn-secondary"
                          style={{ padding: "0.35rem 0.6rem", fontSize: "0.775rem" }}
                          title="Introspecção / Importação Unitária"
                        >
                          <Database size={14} /> Introspecção
                        </button>
                        <button
                          onClick={() => setBootstrappingDataSource(ds)}
                          className="btn btn-secondary"
                          style={{ padding: "0.35rem 0.6rem", fontSize: "0.775rem" }}
                          title="Bootstrap em Massa"
                        >
                          <Layers size={14} /> Bootstrap
                        </button>
                        <button
                          onClick={() => setEditingDataSource(ds)}
                          className="btn-icon"
                          title="Editar DataSource"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingDataSource(ds)}
                          className="btn-icon text-danger"
                          title="Excluir DataSource"
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

        {/* Create Modal */}
        {isCreateOpen && (
          <DataSourceModal
            organizationId={selectedOrgFilter || organizations[0]?.id || user?.organizations[0]?.id || ""}
            organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
            onClose={() => setIsCreateOpen(false)}
            onSubmitCreate={handleCreateSubmit}
            onSubmitUpdate={handleUpdateSubmit}
          />
        )}

        {/* Edit Modal */}
        {editingDataSource && (
          <DataSourceModal
            organizationId={editingDataSource.organizationId}
            organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
            dataSource={editingDataSource}
            onClose={() => setEditingDataSource(null)}
            onSubmitCreate={handleCreateSubmit}
            onSubmitUpdate={handleUpdateSubmit}
          />
        )}

        {/* Introspection Modal */}
        {introspectingDataSource && (
          <IntrospectionModal
            dataSourceId={introspectingDataSource.id}
            dataSourceName={introspectingDataSource.name}
            onClose={() => setIntrospectingDataSource(null)}
            onSuccess={loadData}
          />
        )}

        {/* Bootstrap Modal */}
        {bootstrappingDataSource && (
          <BootstrapModal
            dataSourceId={bootstrappingDataSource.id}
            dataSourceName={bootstrappingDataSource.name}
            onClose={() => setBootstrappingDataSource(null)}
            onSuccess={loadData}
          />
        )}

        {/* Delete Confirmation Modal */}
        {deletingDataSource && (
          <div className="modal-backdrop">
            <div className="modal-container" style={{ maxWidth: "450px" }}>
              <div className="modal-header">
                <h3 style={{ margin: 0, color: "var(--danger-500)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ShieldAlert size={20} /> Confirmar Exclusão Reforçada
                </h3>
                <button onClick={() => setDeletingDataSource(null)} className="btn-icon">
                  <X size={20} />
                </button>
              </div>
              <div style={{ padding: "1.25rem" }}>
                <p style={{ margin: "0 0 1rem 0", fontSize: "0.95rem" }}>
                  Tem certeza que deseja excluir o DataSource <strong>{deletingDataSource.name}</strong> (Organização: {getOrganizationName(deletingDataSource.organizationId)})?
                </p>
                <div style={{ background: "rgba(239, 68, 68, 0.1)", padding: "0.75rem", borderRadius: "6px", fontSize: "0.85rem", color: "var(--danger-500)", marginBottom: "1.25rem" }}>
                  <strong>Atenção:</strong> Esta ação excluirá permanentemente todos os schemas, fields, grants, denies, políticas de linha e credenciais vinculadas a este DataSource.
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button onClick={() => setDeletingDataSource(null)} className="btn btn-secondary" disabled={isDeleting}>
                    Cancelar
                  </button>
                  <button onClick={handleDeleteConfirm} className="btn btn-danger" disabled={isDeleting}>
                    {isDeleting ? "Excluindo..." : "Sim, Excluir DataSource"}
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
