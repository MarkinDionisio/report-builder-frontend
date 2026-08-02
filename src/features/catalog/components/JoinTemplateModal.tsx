import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import type {
  ReportJoinTemplate,
  CreateReportJoinTemplateRequest,
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
  onClose: () => void;
  onSubmit: (data: CreateReportJoinTemplateRequest) => Promise<boolean>;
  templateToEdit?: ReportJoinTemplate;
}

export const JoinTemplateModal: React.FC<JoinTemplateModalProps> = ({
  isOpen,
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

  // Filter schemas based on selected datasource
  const filteredSchemas = schemas.filter(s => s.dataSourceId === referenceDataSourceId);

  // Initialize form
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (templateToEdit) {
        setName(templateToEdit.name);
        setSuggestedAlias(templateToEdit.suggestedAlias);
        setJoinType(templateToEdit.joinType);
        setIsEnabled(templateToEdit.isEnabled);
        
        // We will need to map internalSchemaName to schemaId based on fetched schemas
        setLeftSchemaId(templateToEdit.leftInternalSchemaName);
        setRightSchemaId(templateToEdit.rightInternalSchemaName);
        setLeftFieldId(templateToEdit.leftInternalFieldName);
        setRightFieldId(templateToEdit.rightInternalFieldName);
      } else {
        setName("");
        setSuggestedAlias("");
        setJoinType("left");
        setIsEnabled(true);
        setLeftSchemaId("");
        setRightSchemaId("");
        setLeftFieldId("");
        setRightFieldId("");
      }
      loadInitialData();
    }
  }, [isOpen, templateToEdit]);

  const loadInitialData = async () => {
    setLoadingInitial(true);
    // Fetch data sources and all schemas
    const [dsRes, schemasRes] = await Promise.all([
      catalogApi.listDataSources(),
      catalogApi.listReportSchemas()
    ]);
    
    setLoadingInitial(false);
    
    if (!isErr(dsRes)) {
      setDataSources(dsRes.value);
    } else {
      setErrorMsg("Erro ao carregar DataSources.");
    }

    if (!isErr(schemasRes)) {
      setSchemas(schemasRes.value);
      
      // If editing, map internal names to IDs and find the reference datasource
      if (templateToEdit && schemasRes.value.length > 0) {
        const leftSch = schemasRes.value.find(s => s.internalSchemaName === templateToEdit.leftInternalSchemaName && s.internalObjectName === templateToEdit.leftInternalObjectName);
        const rightSch = schemasRes.value.find(s => s.internalSchemaName === templateToEdit.rightInternalSchemaName && s.internalObjectName === templateToEdit.rightInternalObjectName);
        
        if (leftSch) {
          setReferenceDataSourceId(leftSch.dataSourceId);
          setLeftSchemaId(leftSch.id);
        } else if (rightSch) {
          setReferenceDataSourceId(rightSch.dataSourceId);
        }
        
        if (rightSch) setRightSchemaId(rightSch.id);
      } else if (dsRes && !isErr(dsRes) && dsRes.value.length > 0) {
        // Automatically select the first datasource if not editing
        setReferenceDataSourceId(dsRes.value[0].id);
      }
    } else {
      setErrorMsg("Erro ao carregar schemas para o formulário.");
    }
  };

  const [hasLoadedLeftInitial, setHasLoadedLeftInitial] = useState(false);
  useEffect(() => {
    if (leftSchemaId) {
      if (hasLoadedLeftInitial || !templateToEdit) {
        setLeftFieldId("");
      }
      setHasLoadedLeftInitial(true);
    }
    const loadFields = async () => {
      if (!leftSchemaId) {
        setLeftFields([]);
        return;
      }
      setLeftFields([]);
      const res = await catalogApi.listReportFields(leftSchemaId);
      if (!isErr(res)) {
        setLeftFields(res.value);
        if (templateToEdit && !hasLoadedLeftInitial) {
          const field = res.value.find(f => f.internalFieldName === templateToEdit.leftInternalFieldName);
          if (field) setLeftFieldId(field.id);
        }
      }
    };
    if (isOpen) loadFields();
  }, [leftSchemaId, isOpen]);

  const [hasLoadedRightInitial, setHasLoadedRightInitial] = useState(false);
  useEffect(() => {
    if (rightSchemaId) {
      if (hasLoadedRightInitial || !templateToEdit) {
        setRightFieldId("");
      }
      setHasLoadedRightInitial(true);
    }
    const loadFields = async () => {
      if (!rightSchemaId) {
        setRightFields([]);
        return;
      }
      setRightFields([]);
      const res = await catalogApi.listReportFields(rightSchemaId);
      if (!isErr(res)) {
        setRightFields(res.value);
        if (templateToEdit && !hasLoadedRightInitial) {
          const field = res.value.find(f => f.internalFieldName === templateToEdit.rightInternalFieldName);
          if (field) setRightFieldId(field.id);
        }
      }
    };
    if (isOpen) loadFields();
  }, [rightSchemaId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !suggestedAlias.trim()) {
      setErrorMsg("Nome e Alias sugerido são obrigatórios.");
      return;
    }
    if (!leftSchemaId || !leftFieldId || !rightSchemaId || !rightFieldId) {
      setErrorMsg("Selecione os schemas e campos para os dois lados do Join.");
      return;
    }

    const leftSchema = schemas.find(s => s.id === leftSchemaId);
    const rightSchema = schemas.find(s => s.id === rightSchemaId);
    const leftField = leftFields.find(f => f.id === leftFieldId);
    const rightField = rightFields.find(f => f.id === rightFieldId);

    if (!leftSchema || !rightSchema || !leftField || !rightField) {
      setErrorMsg("Seleção inválida.");
      return;
    }

    if (leftSchema.id === rightSchema.id && leftField.id === rightField.id) {
      setErrorMsg("Os lados do Join devem ser diferentes.");
      return;
    }

    const payload: CreateReportJoinTemplateRequest = {
      name: name.trim(),
      suggestedAlias: suggestedAlias.trim().replace(/\s+/g, "_"),
      joinType,
      leftInternalSchemaName: leftSchema.internalSchemaName,
      leftInternalObjectName: leftSchema.internalObjectName,
      leftInternalFieldName: leftField.internalFieldName,
      rightInternalSchemaName: rightSchema.internalSchemaName,
      rightInternalObjectName: rightSchema.internalObjectName,
      rightInternalFieldName: rightField.internalFieldName,
      isEnabled,
    };

    setSubmitting(true);
    setErrorMsg(null);
    const success = await onSubmit(payload);
    setSubmitting(false);

    if (success) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container" style={{ maxWidth: "600px", display: "flex", flexDirection: "column", overflow: "hidden", maxHeight: "90vh" }}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
            {templateToEdit ? "Editar Join Template" : "Novo Join Template"}
          </h2>
          <button onClick={onClose} className="btn-icon">
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "1.25rem", overflowY: "auto", flex: 1 }}>
          {errorMsg && (
            <div style={{ marginBottom: "1rem" }}>
              <Alert type="error" message={errorMsg} />
            </div>
          )}

          <form id="join-template-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Reference DataSource */}
            <div style={{ background: "rgba(99, 102, 241, 0.05)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
              <label className="form-label" style={{ color: "var(--primary-600)" }}>
                DataSource de Referência (Apenas para Autocompletar Schemas)
              </label>
              <select
                value={referenceDataSourceId}
                onChange={(e) => {
                  setReferenceDataSourceId(e.target.value);
                  setLeftSchemaId("");
                  setRightSchemaId("");
                }}
                className="form-input"
                disabled={loadingInitial}
              >
                <option value="">Selecione um DataSource...</option>
                {dataSources.map((ds) => (
                  <option key={ds.id} value={ds.id}>{ds.name} ({ds.provider})</option>
                ))}
              </select>
              <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                O Join Template salvará apenas os nomes internos das tabelas, tornando-se agnóstico e aplicável a qualquer DataSource que possua essas mesmas tabelas.
              </p>
            </div>

            <div className="responsive-grid-2col">
              <div>
                <label className="form-label">Nome</label>
                <input
                  type="text"
                  required
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
                    value={leftSchemaId}
                    onChange={(e) => setLeftSchemaId(e.target.value)}
                    className="form-input"
                    disabled={loadingInitial || !referenceDataSourceId}
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
                    value={leftFieldId}
                    onChange={(e) => setLeftFieldId(e.target.value)}
                    className="form-input"
                    disabled={!leftSchemaId || leftFields.length === 0}
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
                    value={rightSchemaId}
                    onChange={(e) => setRightSchemaId(e.target.value)}
                    className="form-input"
                    disabled={loadingInitial || !referenceDataSourceId}
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
                    value={rightFieldId}
                    onChange={(e) => setRightFieldId(e.target.value)}
                    className="form-input"
                    disabled={!rightSchemaId || rightFields.length === 0}
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
            disabled={submitting}
            style={{ minWidth: "120px", justifyContent: "center" }}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {templateToEdit ? "Atualizar" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
};
