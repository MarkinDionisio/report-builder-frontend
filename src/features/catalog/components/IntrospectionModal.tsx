import React, { useState, useEffect } from "react";
import { X, Search, Database, CheckCircle2, RefreshCw } from "lucide-react";
import type {
  ImportReportSchemaRequest,
  ImportSchemaPreview,
  ImportSchemaResponse,
  IntrospectionField,
  IntrospectionObject,
  CreateReportSchemaRequest,
  UpsertReportFieldRequest,
} from "../types/catalogTypes";
import { catalogApi } from "../api/catalogApi";
import { isErr } from "../../../shared/result/result";
import { Alert } from "../../../shared/components/Alert";

interface IntrospectionModalProps {
  dataSourceId: string;
  dataSourceName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const IntrospectionModal: React.FC<IntrospectionModalProps> = ({
  dataSourceId,
  dataSourceName,
  onClose,
  onSuccess,
}) => {
  const [objects, setObjects] = useState<IntrospectionObject[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(true);
  const [selectedObject, setSelectedObject] = useState<IntrospectionObject | null>(null);

  const [fields, setFields] = useState<IntrospectionField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);

  const [publicName, setPublicName] = useState("");
  const publicType = "object";

  const [preview, setPreview] = useState<ImportSchemaPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  const [importResult, setImportResult] = useState<ImportSchemaResponse | null>(null);
  const [importing, setImporting] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadObjects() {
      setLoadingObjects(true);
      setErrorMsg(null);
      const res = await catalogApi.listIntrospectionObjects(dataSourceId);
      setLoadingObjects(false);
      if (isErr(res)) {
        setErrorMsg(res.error.detail || "Erro ao consultar objetos do banco de dados.");
      } else {
        setObjects(res.value);
      }
    }
    loadObjects();
  }, [dataSourceId]);

  const handleSelectObject = async (obj: IntrospectionObject) => {
    setSelectedObject(obj);
    setPublicName(obj.objectName);
    setPreview(null);
    setImportResult(null);
    setLoadingFields(true);
    setErrorMsg(null);

    const res = await catalogApi.listIntrospectionFields(dataSourceId, obj.schemaName, obj.objectName);
    setLoadingFields(false);
    if (isErr(res)) {
      setErrorMsg(res.error.detail || "Erro ao listar campos do objeto.");
    } else {
      setFields(res.value);
    }
  };

  const handleGeneratePreview = async () => {
    if (!selectedObject) return;

    if (!publicName.trim()) {
      setErrorMsg("O Nome Público do Schema é obrigatório.");
      return;
    }

    setLoadingPreview(true);
    setErrorMsg(null);
    setImportResult(null);

    const req: ImportReportSchemaRequest = {
      dataSourceId,
      internalSchemaName: selectedObject.schemaName,
      internalObjectName: selectedObject.objectName,
      publicName: publicName.trim(),
      publicType,
    };

    const res = await catalogApi.previewImportSchema(req);
    setLoadingPreview(false);
    if (isErr(res)) {
      setErrorMsg(res.error.detail || "Erro ao gerar prévia da importação.");
    } else {
      setPreview(res.value);
      setSelectedFields(new Set(res.value.fields.map((f) => f.internalFieldName)));
    }
  };

  const handleFieldPublicNameChange = (internalFieldName: string, newName: string) => {
    setPreview((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.map((f) =>
          f.internalFieldName === internalFieldName ? { ...f, publicName: newName } : f
        ),
      };
    });
  };

  const handleToggleField = (internalFieldName: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(internalFieldName)) next.delete(internalFieldName);
      else next.add(internalFieldName);
      return next;
    });
  };

  const handleToggleAllFields = (checked: boolean) => {
    if (checked && preview) {
      setSelectedFields(new Set(preview.fields.map((f) => f.internalFieldName)));
    } else {
      setSelectedFields(new Set());
    }
  };

  const handleExecuteImport = async () => {
    if (!selectedObject || !preview) return;

    if (selectedFields.size === 0) {
      setErrorMsg("Selecione pelo menos um campo para importar.");
      return;
    }

    const fieldsToProcess = preview.fields.filter((f) => selectedFields.has(f.internalFieldName));
    if (fieldsToProcess.some((f) => !f.publicName.trim())) {
      setErrorMsg("Todos os campos selecionados devem possuir um Nome Público preenchido.");
      return;
    }

    setImporting(true);
    setErrorMsg(null);

    let schemaId = preview.existingSchemaId;
    if (!schemaId) {
      const reqSchema: CreateReportSchemaRequest = {
        dataSourceId,
        internalSchemaName: selectedObject.schemaName,
        internalObjectName: selectedObject.objectName,
        publicName: publicName.trim(),
        publicType,
        isEnabled: true,
      };
      const resSchema = await catalogApi.createReportSchema(reqSchema);
      if (isErr(resSchema)) {
        setErrorMsg(resSchema.error.detail || "Erro ao criar schema.");
        setImporting(false);
        return;
      }
      schemaId = resSchema.value.id;
    }

    let createdCount = 0;
    let existingCount = 0;

    for (const field of fieldsToProcess) {
      const reqField: UpsertReportFieldRequest = {
        internalFieldName: field.internalFieldName,
        publicName: field.publicName,
        publicType: field.publicType,
        isNullable: field.isNullable,
        isSelectable: field.isSelectable,
        isFilterable: field.isFilterable,
        isSortable: field.isSortable,
        isGroupable: field.isGroupable,
        isAggregatable: field.isAggregatable,
        isSensitive: field.isSensitive,
        isEnabled: field.isEnabled,
        allowedOperators: field.allowedOperators,
        allowedAggregations: field.allowedAggregations,
      };

      if (field.alreadyExists && field.existingFieldId) {
        const resField = await catalogApi.updateReportField(field.existingFieldId, reqField);
        if (isErr(resField)) {
          setErrorMsg(`Erro ao atualizar campo ${field.internalFieldName}: ${resField.error.detail}`);
          setImporting(false);
          return;
        }
        existingCount++;
      } else {
        const resField = await catalogApi.createReportField(schemaId, reqField);
        if (isErr(resField)) {
          setErrorMsg(`Erro ao criar campo ${field.internalFieldName}: ${resField.error.detail}`);
          setImporting(false);
          return;
        }
        createdCount++;
      }
    }

    setImporting(false);
    setImportResult({
      schema: { publicName: publicName.trim() || selectedObject.objectName } as any,
      createdFields: new Array(createdCount),
      existingFields: new Array(existingCount)
    } as any);
    onSuccess();
  };

  const filteredObjects = objects.filter(
    (o) =>
      o.objectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.schemaName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="modal-backdrop">
      <div className="modal-container" style={{ maxWidth: "1000px", height: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Database size={20} className="text-accent" />
            <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
              Introspecção & Importação: {dataSourceName}
            </h3>
          </div>
          <button onClick={onClose} className="btn-icon" aria-label="Fechar modal">
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "1.5rem", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>

          {importResult ? (
            <div style={{ textAlign: "center", padding: "1.5rem 1rem" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(34, 197, 94, 0.15)",
                  color: "#22c55e",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem" }}>Importação Concluída com Sucesso!</h4>
              <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                Schema <strong>{importResult.schema.publicName}</strong> catalogado com sucesso.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                <div className="badge badge-success">
                  {importResult.createdFields.length} novos campos criados
                </div>
                <div className="badge badge-info">
                  {importResult.existingFields.length} campos já existiam
                </div>
              </div>
              <button onClick={onClose} className="btn btn-primary">
                Fechar
              </button>
            </div>
          ) : (
            <div className="responsive-grid-sidebar">
              {/* Left Column: Objects List */}
              <div style={{ borderRight: "1px solid var(--border-color)", paddingRight: "1rem", display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem", flexShrink: 0 }}>
                  Objetos Descobertos ({objects.length})
                </div>
                <div style={{ position: "relative", marginBottom: "0.75rem", flexShrink: 0 }}>
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Filtrar tabela/view..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: "30px", paddingRight: "30px", fontSize: "0.85rem", width: "100%" }}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", padding: 0 }}
                      title="Limpar busca"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {loadingObjects ? (
                  <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-secondary)" }}>
                    <RefreshCw className="animate-spin" size={20} style={{ margin: "0 auto 0.5rem auto" }} />
                    Carregando tabelas...
                  </div>
                ) : filteredObjects.length === 0 ? (
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center", padding: "1rem 0" }}>
                    Nenhum objeto encontrado.
                  </div>
                ) : (
                  <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {filteredObjects.map((obj) => {
                      const isSelected =
                        selectedObject?.schemaName === obj.schemaName &&
                        selectedObject?.objectName === obj.objectName;
                      return (
                        <button
                          key={`${obj.schemaName}.${obj.objectName}`}
                          onClick={() => handleSelectObject(obj)}
                          className={`btn ${isSelected ? "btn-primary" : "btn-secondary"}`}
                          style={{
                            justifyContent: "space-between",
                            textAlign: "left",
                            padding: "0.5rem 0.75rem",
                            fontSize: "0.825rem",
                            borderRadius: "6px",
                          }}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <span style={{ opacity: 0.6, fontSize: "0.75rem" }}>{obj.schemaName}.</span>
                            <strong>{obj.objectName}</strong>
                          </span>
                          <span style={{ fontSize: "0.7rem", opacity: 0.7, textTransform: "uppercase" }}>
                            {obj.objectType}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Details & Preview */}
              <div style={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
                {!selectedObject ? (
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-secondary)",
                      padding: "3rem 1rem",
                      textAlign: "center",
                    }}
                  >
                    {errorMsg ? (
                      <div style={{ maxWidth: "400px" }}>
                        <Alert type="error" message={errorMsg} />
                      </div>
                    ) : (
                      <>
                        <Database size={48} style={{ opacity: 0.2, marginBottom: "1rem" }} />
                        <p>Selecione um objeto à esquerda para configurar a importação.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: 1, minHeight: 0 }}>
                    <div style={{ background: "var(--surface-color)", padding: "1rem", borderRadius: "8px", flexShrink: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.75rem" }}>
                        Configuração do Schema Público
                      </div>
                      <div className="responsive-grid-2col">
                        <div>
                          <label className="form-label">Nome Público</label>
                          <input
                            type="text"
                            className="form-input"
                            value={publicName}
                            onChange={(e) => setPublicName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="form-label">Tipo Público</label>
                          <input type="text" className="form-input" value={publicType} disabled />
                        </div>
                      </div>
                      <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ color: "var(--danger-500)", fontSize: "0.85rem", fontWeight: 500, flex: 1, paddingRight: "1rem" }}>
                          {!preview && errorMsg && <span>{errorMsg}</span>}
                        </div>
                        <button
                          onClick={handleGeneratePreview}
                          className="btn btn-secondary"
                          disabled={loadingPreview}
                        >
                          {loadingPreview ? "Gerando Prévia..." : "Gerar Prévia da Importação"}
                        </button>
                      </div>
                    </div>

                    {/* Preview / Fields display */}
                    {preview ? (
                      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem", flexShrink: 0 }}>
                          <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                            Prévia da Importação ({preview.fields.length} campos)
                          </span>
                          {preview.schemaExists ? (
                            <span className="badge badge-warning">Schema já catalogado</span>
                          ) : (
                            <span className="badge badge-success">Novo Schema</span>
                          )}
                        </div>

                        <div style={{ flex: 1, overflow: "auto", border: "1px solid var(--border-color)", borderRadius: "6px" }}>
                          <table className="table" style={{ fontSize: "0.8rem", width: "100%" }}>
                            <thead>
                              <tr>
                                <th style={{ width: "40px", textAlign: "center" }}>
                                  <input
                                    type="checkbox"
                                    checked={preview.fields.length > 0 && selectedFields.size === preview.fields.length}
                                    onChange={(e) => handleToggleAllFields(e.target.checked)}
                                  />
                                </th>
                                <th>Nome Público</th>
                                <th>Tipo DB / Público</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {preview.fields.map((f) => {
                                const isSelected = selectedFields.has(f.internalFieldName);
                                return (
                                  <tr key={f.internalFieldName} style={{ opacity: isSelected ? 1 : 0.5 }}>
                                    <td style={{ textAlign: "center" }}>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleField(f.internalFieldName)}
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="text"
                                        className="form-input"
                                        style={{ 
                                          padding: "0.25rem 0.5rem", 
                                          fontSize: "0.85rem", 
                                          height: "auto",
                                          borderColor: isSelected && !f.publicName.trim() ? "var(--danger-500)" : undefined,
                                          backgroundColor: isSelected && !f.publicName.trim() ? "rgba(239, 68, 68, 0.1)" : undefined
                                        }}
                                        value={f.publicName}
                                        onChange={(e) => handleFieldPublicNameChange(f.internalFieldName, e.target.value)}
                                        disabled={!isSelected}
                                      />
                                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                                        DB: <code>{f.internalFieldName}</code>
                                      </div>
                                    </td>
                                    <td style={{ whiteSpace: "nowrap" }}>{f.databaseType} &rarr; {f.publicType}</td>
                                    <td>
                                      {f.alreadyExists ? (
                                        <span className="badge badge-info">Existente</span>
                                      ) : (
                                        <span className="badge badge-success">Novo</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                          <div style={{ color: "var(--danger-500)", fontSize: "0.85rem", fontWeight: 500, flex: 1 }}>
                            {preview && errorMsg && <span>{errorMsg}</span>}
                          </div>
                          <button
                            onClick={handleExecuteImport}
                            className="btn btn-primary"
                            disabled={importing}
                          >
                            {importing ? "Importando..." : "Confirmar Importação"}
                          </button>
                        </div>
                      </div>
                    ) : loadingFields ? (
                      <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                        Carregando campos do objeto...
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem", flexShrink: 0 }}>
                          Campos Descobertos no BD ({fields.length})
                        </div>
                        <div style={{ flex: 1, overflow: "auto", border: "1px solid var(--border-color)", borderRadius: "6px" }}>
                          <table className="table" style={{ fontSize: "0.8rem", width: "100%" }}>
                            <thead>
                              <tr>
                                <th>Campo no Banco</th>
                                <th>Tipo de Dado</th>
                                <th>Nulo?</th>
                                <th>Tipo Sugerido</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fields.map((f) => (
                                <tr key={f.fieldName}>
                                  <td><code>{f.fieldName}</code></td>
                                  <td style={{ whiteSpace: "nowrap" }}>{f.databaseType}</td>
                                  <td>{f.isNullable ? "Sim" : "Não"}</td>
                                  <td style={{ whiteSpace: "nowrap" }}>{f.suggestedPublicType}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
