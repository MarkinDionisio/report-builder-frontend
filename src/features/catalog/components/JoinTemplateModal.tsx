import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { useModalFocus } from "../../../shared/hooks/useModalFocus";
import React, { useState, useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import type {
  ReportJoinModel,
  CreateReportJoinModelRequest,
  RootReportSchema,
  RootReportField,
  JoinType,
  DataSource,
} from "../types/catalogTypes";
import { catalogApi } from "../api/catalogApi";
import { isErr } from "../../../shared/result/result";
import { Alert } from "../../../shared/components/Alert";

interface JoinTemplateModalProps {
  isOpen: boolean;
  organizationId: string;
  structureLocked?: boolean;
  title?: string;
  error?: string;
  sourceId?: string;
  onClose: () => void;
  onSubmit: (data: CreateReportJoinModelRequest) => Promise<boolean>;
  templateToEdit?: ReportJoinModel;
}

export const JoinTemplateModal: React.FC<JoinTemplateModalProps> = ({
  isOpen,
  organizationId,
  structureLocked=false,
  title,
  error,
  sourceId,
  onClose,
  onSubmit,
  templateToEdit,
}) => {
  const [name, setName] = useState("");
  const [suggestedAlias, setSuggestedAlias] = useState("");
  const [joinType, setJoinType] = useState<JoinType>("left");
  const [isEnabled, setIsEnabled] = useState(true);

  const [leftSchemaId, setLeftSchemaId] = useState("");
  const [leftFieldId, setLeftFieldId] = useState("");
  const [rightSchemaId, setRightSchemaId] = useState("");
  const [rightFieldId, setRightFieldId] = useState("");

  const [schemas, setSchemas] = useState<RootReportSchema[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [referenceDataSourceId, setReferenceDataSourceId] = useState("");

  const [leftFields, setLeftFields] = useState<RootReportField[]>([]);
  const [rightFields, setRightFields] = useState<RootReportField[]>([]);
  
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const submitLock=useRef(false);
  const dialogRef=useModalFocus(isOpen,onClose,submitting);

  // Filter schemas based on selected datasource
  const filteredSchemas = schemas.filter(s => s.dataSourceId === referenceDataSourceId);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setErrorMsg(null);
    setLoadingInitial(true);
    setName(templateToEdit?.name || "");
    setSuggestedAlias(templateToEdit?.suggestedAlias || "");
    setJoinType(templateToEdit?.joinType || "left");
    setIsEnabled(templateToEdit?.isEnabled ?? true);
    setSchemas([]);
    setDataSources([]);
    setLeftSchemaId("");
    setRightSchemaId("");
    setLeftFieldId("");
    setRightFieldId("");
    setReferenceDataSourceId(sourceId || "");
    void (async () => {
      try {
        const [sources, tables] = await Promise.all([
          catalogApi.listDataSources(organizationId), catalogApi.listReportSchemas(),
        ]);
        if (cancelled) return;
        if (isErr(sources) || isErr(tables)) {
          setErrorMsg("Não foi possível consultar fontes e tabelas da organização. Feche e tente novamente.");
          return;
        }
        const scopedSources = sources.value.filter(source => source.organizationId === organizationId);
        const sourceIds = new Set(scopedSources.map(source => source.id));
        const scopedTables = tables.value.filter(table => sourceIds.has(table.dataSourceId));
        setDataSources(scopedSources);
        setSchemas(scopedTables);
        if (templateToEdit) {
          const ordered = [...scopedTables].sort((a,b) => Number(b.dataSourceId === sourceId) - Number(a.dataSourceId === sourceId));
          const left = ordered.find(table => table.internalSchemaName === templateToEdit.leftInternalSchemaName && table.internalObjectName === templateToEdit.leftInternalObjectName);
          const right = ordered.find(table => table.dataSourceId === left?.dataSourceId && table.internalSchemaName === templateToEdit.rightInternalSchemaName && table.internalObjectName === templateToEdit.rightInternalObjectName);
          setReferenceDataSourceId(left?.dataSourceId || sourceId || "");
          setLeftSchemaId(left?.id || "");
          setRightSchemaId(right?.id || "");
          if (!left || !right) setErrorMsg("As tabelas deste modelo não estão disponíveis nesta fonte. Escolha outra fonte compatível para editar a estrutura; nome e alias podem ser atualizados em modelos em uso.");
        } else setReferenceDataSourceId(sourceId || scopedSources[0]?.id || "");
      } catch {
        if (!cancelled) setErrorMsg("Não foi possível consultar fontes e tabelas. Feche e tente novamente.");
      } finally { if (!cancelled) setLoadingInitial(false); }
    })();
    return () => { cancelled = true; };
  }, [isOpen, templateToEdit, organizationId, sourceId]);

  const [loadingLeft, setLoadingLeft] = useState(false);
  const [loadingRight, setLoadingRight] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLeftFields([]);
    setLeftFieldId("");
    if (!isOpen || !leftSchemaId) { setLoadingLeft(false); return; }
    setLoadingLeft(true);
    void catalogApi.listReportFields(leftSchemaId).then(result => {
      if (cancelled) return;
      if (isErr(result)) { setErrorMsg("Não foi possível consultar os campos da tabela esquerda. Selecione a tabela novamente para tentar."); return; }
      setLeftFields(result.value);
      const table = schemas.find(item => item.id === leftSchemaId);
      if (table?.internalSchemaName === templateToEdit?.leftInternalSchemaName && table?.internalObjectName === templateToEdit?.leftInternalObjectName)
        setLeftFieldId(result.value.find(field => field.internalFieldName === templateToEdit?.leftInternalFieldName)?.id || "");
    }).catch(() => { if (!cancelled) setErrorMsg("Falha ao consultar campos da tabela esquerda."); })
      .finally(() => { if (!cancelled) setLoadingLeft(false); });
    return () => { cancelled = true; };
  }, [isOpen, leftSchemaId, schemas, templateToEdit]);

  useEffect(() => {
    let cancelled = false;
    setRightFields([]);
    setRightFieldId("");
    if (!isOpen || !rightSchemaId) { setLoadingRight(false); return; }
    setLoadingRight(true);
    void catalogApi.listReportFields(rightSchemaId).then(result => {
      if (cancelled) return;
      if (isErr(result)) { setErrorMsg("Não foi possível consultar os campos da tabela direita. Selecione a tabela novamente para tentar."); return; }
      setRightFields(result.value);
      const table = schemas.find(item => item.id === rightSchemaId);
      if (table?.internalSchemaName === templateToEdit?.rightInternalSchemaName && table?.internalObjectName === templateToEdit?.rightInternalObjectName)
        setRightFieldId(result.value.find(field => field.internalFieldName === templateToEdit?.rightInternalFieldName)?.id || "");
    }).catch(() => { if (!cancelled) setErrorMsg("Falha ao consultar campos da tabela direita."); })
      .finally(() => { if (!cancelled) setLoadingRight(false); });
    return () => { cancelled = true; };
  }, [isOpen, rightSchemaId, schemas, templateToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(submitLock.current || loadingInitial || loadingLeft || loadingRight)return;
    if (!name.trim() || !suggestedAlias.trim()) {
      setErrorMsg("Nome e Alias sugerido são obrigatórios.");
      return;
    }
    if (!structureLocked && (!leftSchemaId || !leftFieldId || !rightSchemaId || !rightFieldId)) {
      setErrorMsg("Selecione os schemas e campos para os dois lados do Join.");
      return;
    }

    const leftSchema = schemas.find(s => s.id === leftSchemaId);
    const rightSchema = schemas.find(s => s.id === rightSchemaId);
    const leftField = leftFields.find(f => f.id === leftFieldId);
    const rightField = rightFields.find(f => f.id === rightFieldId);

    if (!structureLocked && (!leftSchema || !rightSchema || !leftField || !rightField)) {
      setErrorMsg("Seleção inválida.");
      return;
    }

    if (!structureLocked && leftSchema?.id === rightSchema?.id && leftField?.id === rightField?.id) {
      setErrorMsg("Os lados do Join devem ser diferentes.");
      return;
    }

    const payload: CreateReportJoinModelRequest = {
      name: name.trim(),
      suggestedAlias: suggestedAlias.trim().replace(/\s+/g, "_"),
      joinType,
      leftInternalSchemaName: structureLocked ? templateToEdit!.leftInternalSchemaName : leftSchema!.internalSchemaName,
      leftInternalObjectName: structureLocked ? templateToEdit!.leftInternalObjectName : leftSchema!.internalObjectName,
      leftInternalFieldName: structureLocked ? templateToEdit!.leftInternalFieldName : leftField!.internalFieldName,
      rightInternalSchemaName: structureLocked ? templateToEdit!.rightInternalSchemaName : rightSchema!.internalSchemaName,
      rightInternalObjectName: structureLocked ? templateToEdit!.rightInternalObjectName : rightSchema!.internalObjectName,
      rightInternalFieldName: structureLocked ? templateToEdit!.rightInternalFieldName : rightField!.internalFieldName,
      isEnabled,
    };

    submitLock.current=true;
    setSubmitting(true);
    setErrorMsg(null);
    try { if(await onSubmit(payload))onClose(); }
    catch {setErrorMsg("Não foi possível salvar o modelo. Tente novamente.");}
    finally {submitLock.current=false;setSubmitting(false);}
  };

  return (
    <div className="modal-backdrop">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title || (templateToEdit ? "Editar modelo de junção" : "Novo modelo de junção")} className="modal-container join-template-dialog" style={{ maxWidth: "600px", display: "flex", flexDirection: "column", overflow: "hidden", maxHeight: "90vh" }}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
            {title || (templateToEdit ? "Editar modelo de junção" : "Novo modelo de junção")}
          </h2>
          <button onClick={onClose} aria-label="Fechar" disabled={submitting} className="btn-icon">
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "1.25rem", overflowY: "auto", flex: 1 }}>
          {(errorMsg || error) && (
            <div style={{ marginBottom: "1rem" }}>
              <Alert type="error" message={errorMsg || error || ""} />
            </div>
          )}

          {(loadingInitial || loadingLeft || loadingRight)&&<NeutralLoader compact message="Consultando tabelas e campos da fonte de referência…"/>}
          {structureLocked&&<p className="source-notice">Este modelo é utilizado por relatórios. Você pode alterar o nome e alias sugerido; a estrutura e habilitação estão protegidas. Duplique para criar uma alternativa.</p>}
          <form id="join-template-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Reference DataSource */}
            <div style={{ background: "rgba(99, 102, 241, 0.05)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
              <label className="form-label" style={{ color: "var(--primary-600)" }}>
                Fonte de referência para escolher tabelas e campos
              </label>
              <select
                value={referenceDataSourceId}
                onChange={(e) => {
                  setReferenceDataSourceId(e.target.value);
                  setLeftSchemaId("");
                  setRightSchemaId("");
                }}
                className="form-input"
                aria-label="Fonte de referência"
                disabled={loadingInitial || structureLocked}
              >
                <option value="">Selecione um DataSource...</option>
                {dataSources.map((ds) => (
                  <option key={ds.id} value={ds.id}>{ds.name} ({ds.provider})</option>
                ))}
              </select>
              <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                O modelo pertence à organização e guarda os nomes internos das tabelas e campos. A fonte de referência apenas ajuda no cadastro; o modelo poderá ser usado nas fontes compatíveis desta organização.
              </p>
            </div>

            <div className="responsive-grid-2col">
              <div>
                <label className="form-label">Nome</label>
                <input
                  type="text"
                  required
                  aria-label="Nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  placeholder="Ex: Pedido - Cliente"
                />
              </div>
              <div>
                <label className="form-label">Alias Sugerido</label>
                <input
                  type="text"
                  required
                  aria-label="Alias sugerido"
                  value={suggestedAlias}
                  onChange={(e) => setSuggestedAlias(e.target.value.replace(/\s+/g, "_"))}
                  className="form-input"
                  placeholder="Ex: customer"
                />
              </div>
            </div>

            <div className="responsive-grid-2col">
              <div>
                <label className="form-label">Tipo de Join</label>
                <select
                  aria-label="Tipo de junção"
                  disabled={structureLocked}
                  value={joinType}
                  onChange={(e) => setJoinType(e.target.value as JoinType)}
                  className="form-input"
                >
                  <option value="left">Left Join</option>
                  <option value="inner">Inner Join</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", paddingTop: "1.5rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem", fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    disabled={structureLocked}
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  Habilitado
                </label>
              </div>
            </div>

            <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", padding: "1rem", background: "var(--surface-color)", marginTop: "0.5rem" }}>
              <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: 600 }}>Lado Esquerdo (Base)</h3>
              <div className="responsive-grid-2col">
                <div>
                  <label className="form-label">Schema</label>
                  <select
                    required
                    aria-label="Tabela esquerda"
                    value={leftSchemaId}
                    onChange={(e) => setLeftSchemaId(e.target.value)}
                    className="form-input"
                    disabled={structureLocked || loadingInitial || !referenceDataSourceId}
                  >
                    <option value="">Selecione um schema...</option>
                    {filteredSchemas.map((s) => (
                      <option key={s.id} value={s.id}>{s.publicName} ({s.internalObjectName})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Campo</label>
                  <select
                    required
                    aria-label="Campo esquerdo"
                    value={leftFieldId}
                    onChange={(e) => setLeftFieldId(e.target.value)}
                    className="form-input"
                    disabled={structureLocked || !leftSchemaId || leftFields.length === 0}
                  >
                    <option value="">Selecione um campo...</option>
                    {leftFields.map((f) => (
                      <option key={f.id} value={f.id}>{f.name} ({f.internalFieldName})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", padding: "1rem", background: "var(--surface-color)", marginTop: "0.5rem" }}>
              <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: 600 }}>Lado Direito (Alvo)</h3>
              <div className="responsive-grid-2col">
                <div>
                  <label className="form-label">Schema</label>
                  <select
                    required
                    aria-label="Tabela direita"
                    value={rightSchemaId}
                    onChange={(e) => setRightSchemaId(e.target.value)}
                    className="form-input"
                    disabled={structureLocked || loadingInitial || !referenceDataSourceId}
                  >
                    <option value="">Selecione um schema...</option>
                    {filteredSchemas.map((s) => (
                      <option key={s.id} value={s.id}>{s.publicName} ({s.internalObjectName})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Campo</label>
                  <select
                    required
                    aria-label="Campo direito"
                    value={rightFieldId}
                    onChange={(e) => setRightFieldId(e.target.value)}
                    className="form-input"
                    disabled={structureLocked || !rightSchemaId || rightFields.length === 0}
                  >
                    <option value="">Selecione um campo...</option>
                    {rightFields.map((f) => (
                      <option key={f.id} value={f.id}>{f.name} ({f.internalFieldName})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div style={{ padding: "1.25rem", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: "0.75rem", background: "var(--background-color)", borderRadius: "0 0 8px 8px", flexShrink: 0 }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="join-template-form"
            className="btn btn-primary"
            disabled={submitting || loadingInitial || loadingLeft || loadingRight}
            style={{ minWidth: "120px", justifyContent: "center" }}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {title?.startsWith("Duplicar")?"Criar cópia":templateToEdit ? "Atualizar" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
};
