import { ContentSkeleton } from "../../../shared/components/ContentSkeleton";
import { ClearSearchButton } from "../../../shared/components/ClearSearchButton";
import { useModalFocus } from "../../../shared/hooks/useModalFocus";
import { ConfirmDeleteModal } from "../../organizations/components/ConfirmDeleteModal";
import { SourceActionMenu } from "../components/SourceActionMenu";
import { SearchMatchOptions } from "../../../shared/components/SearchMatchOptions";
import { matchesTextSearch } from "../../../shared/utils/textSearch";
import React, { useState, useEffect, useCallback, useRef } from "react";
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

export const ReportFieldsPage: React.FC<{ embedded?: boolean; schemaId?: string; tableName?: string; physicalName?: string; tableActions?: React.ReactNode; onChanged?: () => void }> = ({ embedded = false, schemaId: suppliedSchemaId, tableName, physicalName, tableActions, onChanged }) => {
  const Container = embedded ? "section" : "main";
  const { schemaId: routeSchemaId } = useParams<{ schemaId: string }>();
  const schemaId = suppliedSchemaId ?? routeSchemaId;
  const navigate = useNavigate();
  const { state, refreshUser } = useAuth();
  const user = state.status === "authenticated" ? state.user : null;
  const isRoot = user?.globalRole === "root";

  const [fields, setFields] = useState<RootReportField[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [matchCase,setMatchCase]=useState(false), [exactMatch,setExactMatch]=useState(false), [page,setPage]=useState(0), [statusFilter,setStatusFilter]=useState("all"), [selected,setSelected]=useState(new Set<string>()), [batchBusy,setBatchBusy]=useState(false);
  const filteredFields=fields.filter(f=>(statusFilter==="all" || (statusFilter==="enabled"?f.isEnabled:statusFilter==="disabled"?!f.isEnabled:f.isSensitive)) && [f.name,f.internalFieldName].some(v=>matchesTextSearch(v,searchTerm,{matchCase,exactMatch})));
  const currentPage=Math.min(page,Math.max(0,Math.ceil(filteredFields.length/25)-1));
  async function bulk(enabled:boolean){ if(batchBusy)return;setBatchBusy(true);setErrorMsg(null);let failures=0;for(const f of fields.filter(f=>selected.has(f.id))){try{const r=await catalogApi.updateReportField(f.id,{internalFieldName:f.internalFieldName,publicName:f.name,publicType:f.type,isNullable:f.nullable,isSelectable:f.selectable,isFilterable:f.filterable,isSortable:f.sortable,isGroupable:f.groupable,isAggregatable:f.aggregatable,isSensitive:f.isSensitive,isEnabled:enabled,allowedOperators:f.allowedOperators,allowedAggregations:f.allowedAggregations});if(isErr(r))failures++;}catch{failures++;}}await loadFields();setBatchBusy(false);setSelected(new Set());onChanged?.();if(failures)setErrorMsg(failures+" campos não puderam ser atualizados. Consulte o estado dos campos antes de tentar novamente.");}
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<RootReportField | null>(null);
  const [deletingField, setDeletingField] = useState<RootReportField | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteError,setDeleteError]=useState("");
  const saveLock=useRef(false);
  const formDialogRef=useModalFocus(isModalOpen,()=>setIsModalOpen(false),saving);

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
    if(saveLock.current)return;
    if (!schemaId) return;
    if (!publicName.trim()) {
      setErrorMsg("O nome público do campo é obrigatório.");
      return;
    }

    saveLock.current=true;
    try {
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
        onChanged?.();
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
        onChanged?.();
      }
    }
    } catch {setErrorMsg("Não foi possível salvar. Verifique os dados e tente novamente.");}
    finally {saveLock.current=false;setSaving(false);}
  };

  const handleDeleteConfirm = async () => {
    if (!deletingField) return false;
    setDeleteError("");
    setErrorMsg(null);

    const res = await catalogApi.deleteReportField(deletingField.id);


    if (isErr(res)) {
      if (res.error.status === 403) {
        void refreshUser();
      }
      setDeleteError(res.error.detail || "Erro ao excluir campo.");
      return false;
    } else {
      await loadFields();
      onChanged?.();
      return true;
    }
  };

  if (accessDenied || (!isRoot && !loading)) {
    return (
      <>
        {!embedded && <Navbar />}
        <Container className={embedded ? "source-embedded" : "container"} style={{ padding: "2rem 1rem" }}>
          <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
            <ShieldAlert size={48} style={{ color: "var(--danger-500)", marginBottom: "1rem" }} />
            <h2>Acesso Negado</h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto 1.5rem auto" }}>
              Apenas usuários Root podem gerenciar os campos do catálogo.
            </p>
          </div>
        </Container>
      </>
    );
  }

  return (
    <>
      {!embedded && <Navbar />}
      <Container className={embedded ? "source-embedded" : "container"} style={{ padding: "2rem 1rem" }}>
        {!embedded && <button onClick={()=>navigate(-1)} className="btn btn-secondary"><ArrowLeft size={16}/> Voltar para tabelas</button>}
        <header className="source-fields-heading"><div>{embedded?<h3>{tableName || "Campos da tabela"}</h3>:<h1>Campos da tabela</h1>}<p>{loading?"Consultando campos…":fields.length+" campos"}{physicalName&&<> · <code>{physicalName}</code></>}</p></div><SourceActionMenu label="Opções da tabela"><button className="btn btn-secondary" onClick={openCreateModal}>Adicionar campo manualmente</button>{tableActions}</SourceActionMenu></header>
        <div className="source-fields-toolbar"><div className="source-fields-search"><div className="search-input-clear"><Search size={16} aria-hidden="true"/><input type="search" className="form-input" aria-label="Buscar campo" placeholder="Buscar campo…" value={searchTerm} onChange={e=>{setSearchTerm(e.target.value);setPage(0);}}/><ClearSearchButton value={searchTerm} onClear={()=>{setSearchTerm("");setPage(0);}}/></div><SearchMatchOptions matchCase={matchCase} exactMatch={exactMatch} onMatchCaseChange={setMatchCase} onExactMatchChange={setExactMatch}/></div><div className="source-fields-tools"><SourceActionMenu label={statusFilter==="all"?"Filtros":"Filtros (1)"}><label className="source-fields-filter-label">Mostrar campos<select className="form-input" aria-label="Filtrar campos" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(0);}}><option value="all">Todos</option><option value="enabled">Habilitados</option><option value="disabled">Desabilitados</option><option value="sensitive">Sensíveis</option></select></label></SourceActionMenu><button className="btn btn-secondary" aria-pressed={selectionMode||selected.size>0} onClick={()=>{setSelectionMode(v=>!v);setSelected(new Set());}}>Selecionar</button></div></div>
        {(selectionMode||selected.size>0)&&<div className="source-bulk-toolbar"><span>{selected.size>0?selected.size+" campos selecionados, incluindo outras páginas e filtros":"Marque os campos ou selecione todos os resultados."}</span><SourceActionMenu label="Ações de seleção"><button className="btn btn-secondary" disabled={batchBusy} onClick={()=>setSelected(new Set([...selected,...filteredFields.map(f=>f.id)]))}>Marcar resultados</button><button className="btn btn-secondary" disabled={batchBusy||selected.size===0} onClick={()=>setSelected(new Set([...selected].filter(id=>!filteredFields.some(f=>f.id===id))))}>Desmarcar resultados</button><button className="btn btn-secondary" disabled={batchBusy||selected.size===0} onClick={()=>void bulk(true)}>Habilitar selecionados</button><button className="btn btn-secondary" disabled={batchBusy||selected.size===0} onClick={()=>void bulk(false)}>Desabilitar selecionados</button></SourceActionMenu></div>}
        {batchBusy&&<NeutralLoader compact message="Atualizando configurações dos campos selecionados…"/>}
        {errorMsg && !isModalOpen && <Alert type="error" message={errorMsg} style={{ marginBottom: "1.25rem" }} />}

        {loading ? (
          <ContentSkeleton variant="table" rows={6} columns={5} message="Consultando campos da tabela…"/>
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
          <div className="card source-fields-list" style={{ padding: 0 }}>
            {(() => {
              if (filteredFields.length === 0) {
                return (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                    Nenhum campo encontrado na busca.
                  </div>
                );
              }

              return (
                <table className="table source-fields-table" style={{ width: "100%", margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Campo</th>
                      <th>Tipo</th>
                      <th>Operações permitidas</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFields.slice(currentPage*25,currentPage*25+25).map((field) => (
                  <tr key={field.id}><td className="source-field-name"><div className="source-field-identity">{(selectionMode||selected.size>0)&&<input type="checkbox" aria-label={"Selecionar "+field.name} disabled={batchBusy} checked={selected.has(field.id)} onChange={e=>{const next=new Set(selected);if(e.target.checked)next.add(field.id);else next.delete(field.id);setSelected(next);}}/>}<div><strong>{field.name}</strong><code>{field.internalFieldName}</code></div></div></td>
                    <td className="source-field-type">
                      <span>{field.type}</span>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {field.nullable ? "Nulo" : "Não nulo"}
                      </div>
                    </td>
                    <td className="source-field-operations"><span>{[field.selectable&&"Selecionar",field.filterable&&"Filtrar",field.sortable&&"Ordenar",field.groupable&&"Agrupar",field.aggregatable&&"Agregar"].filter(Boolean).join(" · ") || "Nenhuma operação"}</span></td>
                    <td className="source-field-status">
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
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
                    <td className="source-field-actions" style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                        <button onClick={() => openEditModal(field)} className="btn-icon" title="Editar Campo" aria-label={"Editar "+field.name}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => {setDeleteError("");setDeletingField(field);}} className="btn-icon text-danger" title="Excluir Campo" aria-label={"Excluir "+field.name}>
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

        {filteredFields.length>25&&<nav className="source-actions" aria-label="Paginação de campos"><button className="btn btn-secondary" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Anterior</button><span>Página {currentPage+1} de {Math.ceil(filteredFields.length/25)}</span><button className="btn btn-secondary" disabled={(currentPage+1)*25>=filteredFields.length} onClick={()=>setPage(currentPage+1)}>Próxima</button></nav>}
        {/* Upsert Modal */}
        {isModalOpen && (
          <div className="modal-backdrop">
            <div ref={formDialogRef} tabIndex={-1} className="modal-container admin-form-dialog" role="dialog" aria-modal="true" aria-label={editingField ? "Editar campo" : "Adicionar campo"} style={{ maxWidth: "650px", maxHeight: "90vh", overflowY: "auto" }}>
              <div className="modal-header">
                <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
                  {editingField ? `Editar Campo: ${editingField.name}` : "Novo Campo no Schema"}
                </h3>
                <button aria-label="Fechar" disabled={saving} onClick={() => setIsModalOpen(false)} className="btn-icon">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveField} style={{ padding: "1.25rem" }}>
                {errorMsg&&<Alert type="error" message={errorMsg}/>}
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

                <div className="source-field-editor-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
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

        {deletingField && <ConfirmDeleteModal isOpen title="Excluir campo" itemName={deletingField.name} warningText="O campo e seus grants serão removidos do catálogo. A coluna e os dados do banco não serão excluídos." problem={null} errorMessage={deleteError} onClose={()=>{setDeletingField(null);setDeleteError("");}} onConfirm={handleDeleteConfirm}/>}
      </Container>
    </>
  );
};
