import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import type { RootReportField, UpsertReportFieldRequest } from "../types/catalogTypes";
import { catalogApi } from "../api/catalogApi";
import { isErr } from "../../../shared/result/result";
import { Navbar } from "../../../shared/components/Navbar";
import { Alert } from "../../../shared/components/Alert";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { ArrowLeft, List, Plus, Edit2, Trash2, ShieldAlert, X, EyeOff, Search } from "lucide-react";

const OPERATOR_OPTIONS = [
  { value: "eq", label: "Igual (eq)" },
  { value: "ne", label: "Diferente (ne)" },
  { value: "gt", label: "Maior que (gt)" },
  { value: "gte", label: "Maior ou igual (gte)" },
  { value: "lt", label: "Menor que (lt)" },
  { value: "lte", label: "Menor ou igual (lte)" },
  { value: "contains", label: "Contém (contains)" },
  { value: "in", label: "Contido em (in)" },
  { value: "is_null", label: "É Nulo (is_null)" },
];

const AGGREGATION_OPTIONS = [
  { value: "count", label: "Contagem (count)" },
  { value: "sum", label: "Soma (sum)" },
  { value: "avg", label: "Média (avg)" },
  { value: "min", label: "Mínimo (min)" },
  { value: "max", label: "Máximo (max)" },
];

export const ReportFieldsPage: React.FC = () => {
  const { schemaId } = useParams<{ schemaId: string }>();
  const navigate = useNavigate();
  const { state, refreshUser } = useAuth();
  const user = state.status === "authenticated" ? state.user : null;
  const isRoot = user?.globalRole === "root";

  const [fields, setFields] = useState<RootReportField[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<RootReportField | null>(null);
  const [deletingField, setDeletingField] = useState<RootReportField | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [internalFieldName, setInternalFieldName] = useState("");
  const [publicName, setPublicName] = useState("");
  const [publicType, setPublicType] = useState("string");
  const [isNullable, setIsNullable] = useState(false);
  const [isSelectable, setIsSelectable] = useState(true);
  const [isFilterable, setIsFilterable] = useState(true);
  const [isSortable, setIsSortable] = useState(true);
  const [isGroupable, setIsGroupable] = useState(false);
  const [isAggregatable, setIsAggregatable] = useState(false);
  const [isSensitive, setIsSensitive] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [allowedOperators, setAllowedOperators] = useState<string[]>(["eq", "ne"]);
  const [allowedAggregations, setAllowedAggregations] = useState<string[]>([]);

  const loadFields = useCallback(async () => {
    if (!schemaId) return;
    if (!isRoot) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await catalogApi.listReportFields(schemaId);
    setLoading(false);

    if (isErr(res)) {
      if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      } else {
        setErrorMsg(res.error.detail || "Erro ao carregar campos do schema.");
      }
    } else {
      setFields(res.value);
    }
  }, [schemaId, isRoot, refreshUser]);

  useEffect(() => {
    loadFields();
  }, [loadFields]);

  const openCreateModal = () => {
    setEditingField(null);
    setInternalFieldName("");
    setPublicName("");
    setPublicType("string");
    setIsNullable(false);
    setIsSelectable(true);
    setIsFilterable(true);
    setIsSortable(true);
    setIsGroupable(false);
    setIsAggregatable(false);
    setIsSensitive(false);
    setIsEnabled(true);
    setAllowedOperators(["eq", "ne"]);
    setAllowedAggregations([]);
    setIsModalOpen(true);
  };

  const openEditModal = (field: RootReportField) => {
    setEditingField(field);
    setInternalFieldName(field.internalFieldName);
    setPublicName(field.name);
    setPublicType(field.type);
    setIsNullable(field.nullable);
    setIsSelectable(field.selectable);
    setIsFilterable(field.filterable);
    setIsSortable(field.sortable);
    setIsGroupable(field.groupable);
    setIsAggregatable(field.aggregatable);
    setIsSensitive(field.isSensitive);
    setIsEnabled(field.isEnabled);
    setAllowedOperators(field.allowedOperators || []);
    setAllowedAggregations(field.allowedAggregations || []);
    setIsModalOpen(true);
  };

  const handleToggleOperator = (op: string) => {
    setAllowedOperators((prev) =>
      prev.includes(op) ? prev.filter((item) => item !== op) : [...prev, op]
    );
  };

  const handleToggleAggregation = (agg: string) => {
    setAllowedAggregations((prev) =>
      prev.includes(agg) ? prev.filter((item) => item !== agg) : [...prev, agg]
    );
  };

  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schemaId) return;
    if (!publicName.trim()) {
      setErrorMsg("O nome público do campo é obrigatório.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const payload: UpsertReportFieldRequest = {
      internalFieldName: editingField ? editingField.internalFieldName : internalFieldName.trim(),
      publicName: publicName.trim(),
      publicType,
      isNullable,
      isSelectable,
      isFilterable,
      isSortable,
      isGroupable,
      isAggregatable,
      isSensitive,
      isEnabled,
      allowedOperators,
      allowedAggregations,
    };

    if (editingField) {
      const res = await catalogApi.updateReportField(editingField.id, payload);
      setSaving(false);

      if (isErr(res)) {
        if (res.error.status === 403) {
          setAccessDenied(true);
          refreshUser();
        }
        setErrorMsg(res.error.detail || "Erro ao atualizar campo.");
      } else {
        setIsModalOpen(false);
        setEditingField(null);
        await loadFields();
      }
    } else {
      if (!internalFieldName.trim()) {
        setErrorMsg("O nome interno do campo é obrigatório.");
        setSaving(false);
        return;
      }

      const res = await catalogApi.createReportField(schemaId, payload);
      setSaving(false);

      if (isErr(res)) {
        if (res.error.status === 403) {
          setAccessDenied(true);
          refreshUser();
        }
        setErrorMsg(res.error.detail || "Erro ao criar campo.");
      } else {
        setIsModalOpen(false);
        await loadFields();
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingField) return;
    setDeleting(true);
    setErrorMsg(null);

    const res = await catalogApi.deleteReportField(deletingField.id);
    setDeleting(false);

    if (isErr(res)) {
      if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      }
      setErrorMsg(res.error.detail || "Erro ao excluir campo.");
    } else {
      setDeletingField(null);
      await loadFields();
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
              Apenas administradores globais (<code>root</code>) possuem permissão para gerenciar os campos do catálogo.
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
        <div style={{ marginBottom: "1rem" }}>
          <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}>
            <ArrowLeft size={16} /> Voltar para Schemas
          </button>
        </div>

        <div className="responsive-flex-header" style={{ marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.25rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <List size={28} className="text-accent" /> Campos do Schema
            </h1>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>
              Defina capacidades (selecionável, filtrável, agrupável, agregável), tipo público e operadores.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
              <input
                type="text"
                className="form-input"
                placeholder="Buscar campo..."
                style={{ paddingLeft: "34px", paddingRight: "34px", width: "250px" }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", padding: 0 }}
                  title="Limpar busca"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button onClick={openCreateModal} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Plus size={18} /> Adicionar Campo
            </button>
          </div>
        </div>

        {errorMsg && <Alert type="error" message={errorMsg} style={{ marginBottom: "1.25rem" }} />}

        {loading ? (
          <NeutralLoader message="Carregando campos do schema..." />
        ) : fields.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem", color: "var(--text-secondary)" }}>
            <List size={40} style={{ opacity: 0.4, marginBottom: "0.75rem" }} />
            <h3>Nenhum campo cadastrado para este schema</h3>
            <p style={{ marginBottom: "1.5rem" }}>Adicione os campos que poderão ser utilizados na geração de relatórios.</p>
            <button onClick={openCreateModal} className="btn btn-primary">
              <Plus size={16} /> Adicionar Primeiro Campo
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {(() => {
              const st = searchTerm.toLowerCase();
              const filteredFields = fields.filter((f) =>
                f.name.toLowerCase().includes(st) ||
                f.internalFieldName.toLowerCase().includes(st)
              );

              if (filteredFields.length === 0) {
                return (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                    Nenhum campo encontrado na busca.
                  </div>
                );
              }

              return (
                <table className="table" style={{ width: "100%", margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Nome Público / Interno</th>
                      <th>Tipo / Nulo</th>
                      <th>Capacidade</th>
                      <th>Sensível / Status</th>
                      <th style={{ textAlign: "right" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFields.map((field) => (
                  <tr key={field.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{field.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        Campo DB: <code>{field.internalFieldName}</code>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{field.type}</span>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {field.nullable ? "Nulo" : "Não nulo"}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {field.selectable && <span className="badge badge-secondary" style={{ fontSize: "0.7rem" }}>Select</span>}
                        {field.filterable && <span className="badge badge-secondary" style={{ fontSize: "0.7rem" }}>Filter</span>}
                        {field.sortable && <span className="badge badge-secondary" style={{ fontSize: "0.7rem" }}>Sort</span>}
                        {field.groupable && <span className="badge badge-secondary" style={{ fontSize: "0.7rem" }}>Group</span>}
                        {field.aggregatable && <span className="badge badge-secondary" style={{ fontSize: "0.7rem" }}>Aggregate</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {field.isSensitive && (
                          <span className="badge badge-warning" style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <EyeOff size={12} /> Sensível
                          </span>
                        )}
                        {field.isEnabled ? (
                          <span className="badge badge-success">Ativo</span>
                        ) : (
                          <span className="badge badge-error">Inativo</span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                        <button onClick={() => openEditModal(field)} className="btn-icon" title="Editar Campo">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setDeletingField(field)} className="btn-icon text-danger" title="Excluir Campo">
                          <Trash2 size={16} />
                        </button>
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

        {/* Upsert Modal */}
        {isModalOpen && (
          <div className="modal-backdrop">
            <div className="modal-container" style={{ maxWidth: "650px", maxHeight: "90vh", overflowY: "auto" }}>
              <div className="modal-header">
                <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
                  {editingField ? `Editar Campo: ${editingField.name}` : "Novo Campo no Schema"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="btn-icon">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveField} style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="responsive-grid-2col">
                    <div>
                      <label className="form-label" htmlFor="field-internal-name">
                        Nome do Campo Interno (DB) *
                      </label>
                      <input
                        id="field-internal-name"
                        type="text"
                        className="form-input"
                        value={internalFieldName}
                        onChange={(e) => setInternalFieldName(e.target.value)}
                        placeholder="created_at"
                        disabled={Boolean(editingField)}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="field-public-name">
                        Nome Público *
                      </label>
                      <input
                        id="field-public-name"
                        type="text"
                        className="form-input"
                        value={publicName}
                        onChange={(e) => setPublicName(e.target.value)}
                        placeholder="Data de Criação"
                        required
                      />
                    </div>
                  </div>

                  <div className="responsive-grid-2col">
                    <div>
                      <label className="form-label" htmlFor="field-public-type">
                        Tipo Público *
                      </label>
                      <select
                        id="field-public-type"
                        className="form-select"
                        value={publicType}
                        onChange={(e) => setPublicType(e.target.value)}
                      >
                        <option value="string">Texto (string)</option>
                        <option value="number">Número (number)</option>
                        <option value="boolean">Booleano (boolean)</option>
                        <option value="date">Data (date)</option>
                        <option value="datetime">Data e Hora (datetime)</option>
                      </select>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginTop: "1.5rem" }}>
                      <label style={{ fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <input type="checkbox" checked={isNullable} onChange={(e) => setIsNullable(e.target.checked)} />
                        Permite Nulo
                      </label>
                      <label style={{ fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <input type="checkbox" checked={isSensitive} onChange={(e) => setIsSensitive(e.target.checked)} />
                        Sensível
                      </label>
                      <label style={{ fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
                        Ativo
                      </label>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem" }}>Capacidades Habilitadas</div>
                    <div className="responsive-grid-5col">
                      <label style={{ fontSize: "0.8rem", cursor: "pointer" }}>
                        <input type="checkbox" checked={isSelectable} onChange={(e) => setIsSelectable(e.target.checked)} /> Select
                      </label>
                      <label style={{ fontSize: "0.8rem", cursor: "pointer" }}>
                        <input type="checkbox" checked={isFilterable} onChange={(e) => setIsFilterable(e.target.checked)} /> Filter
                      </label>
                      <label style={{ fontSize: "0.8rem", cursor: "pointer" }}>
                        <input type="checkbox" checked={isSortable} onChange={(e) => setIsSortable(e.target.checked)} /> Sort
                      </label>
                      <label style={{ fontSize: "0.8rem", cursor: "pointer" }}>
                        <input type="checkbox" checked={isGroupable} onChange={(e) => setIsGroupable(e.target.checked)} /> Group
                      </label>
                      <label style={{ fontSize: "0.8rem", cursor: "pointer" }}>
                        <input type="checkbox" checked={isAggregatable} onChange={(e) => setIsAggregatable(e.target.checked)} /> Aggregate
                      </label>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem" }}>Operadores Permitidos</div>
                    <div className="responsive-grid-3col">
                      {OPERATOR_OPTIONS.map((op) => (
                        <label key={op.value} style={{ fontSize: "0.8rem", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={allowedOperators.includes(op.value)}
                            onChange={() => handleToggleOperator(op.value)}
                          />{" "}
                          {op.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem" }}>Agregações Permitidas</div>
                    <div className="responsive-grid-3col">
                      {AGGREGATION_OPTIONS.map((agg) => (
                        <label key={agg.value} style={{ fontSize: "0.8rem", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={allowedAggregations.includes(agg.value)}
                            onChange={() => handleToggleAggregation(agg.value)}
                          />{" "}
                          {agg.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary" disabled={saving}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Salvando..." : editingField ? "Atualizar Campo" : "Criar Campo"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingField && (
          <div className="modal-backdrop">
            <div className="modal-container" style={{ maxWidth: "450px" }}>
              <div className="modal-header">
                <h3 style={{ margin: 0, color: "var(--danger-500)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ShieldAlert size={20} /> Confirmar Exclusão
                </h3>
                <button onClick={() => setDeletingField(null)} className="btn-icon">
                  <X size={20} />
                </button>
              </div>
              <div style={{ padding: "1.25rem" }}>
                <p style={{ margin: "0 0 1rem 0", fontSize: "0.95rem" }}>
                  Tem certeza que deseja excluir o campo <strong>{deletingField.name}</strong>?
                </p>
                <div style={{ background: "rgba(239, 68, 68, 0.1)", padding: "0.75rem", borderRadius: "6px", fontSize: "0.85rem", color: "var(--danger-500)", marginBottom: "1.25rem" }}>
                  A exclusão revoga imediatamente quaisquer grants associados a este campo.
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button onClick={() => setDeletingField(null)} className="btn btn-secondary" disabled={deleting}>
                    Cancelar
                  </button>
                  <button onClick={handleDeleteConfirm} className="btn btn-danger" disabled={deleting}>
                    {deleting ? "Excluindo..." : "Sim, Excluir Campo"}
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
