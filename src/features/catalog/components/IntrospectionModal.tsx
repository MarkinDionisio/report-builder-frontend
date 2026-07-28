import React, { useState, useEffect } from "react";
import { X, Search, Database, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import type {
  ImportReportSchemaRequest,
  ImportSchemaPreview,
  ImportSchemaResponse,
  IntrospectionField,
  IntrospectionObject,
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
    setLoadingPreview(true);
    setErrorMsg(null);
    setImportResult(null);

    const req: ImportReportSchemaRequest = {
      dataSourceId,
      internalSchemaName: selectedObject.schemaName,
      internalObjectName: selectedObject.objectName,
      publicName: publicName.trim() || selectedObject.objectName,
      publicType,
    };

    const res = await catalogApi.previewImportSchema(req);
    setLoadingPreview(false);
    if (isErr(res)) {
      setErrorMsg(res.error.detail || "Erro ao gerar prévia da importação.");
    } else {
      setPreview(res.value);
    }
  };

  const handleExecuteImport = async () => {
    if (!selectedObject) return;
    setImporting(true);
    setErrorMsg(null);

    const req: ImportReportSchemaRequest = {
      dataSourceId,
      internalSchemaName: selectedObject.schemaName,
      internalObjectName: selectedObject.objectName,
      publicName: publicName.trim() || selectedObject.objectName,
      publicType,
    };

    const res = await catalogApi.importSchema(req);
    setImporting(false);
    if (isErr(res)) {
      setErrorMsg(res.error.detail || "Erro ao importar schema.");
    } else {
      setImportResult(res.value);
      onSuccess();
    }
  };

  const filteredObjects = objects.filter(
    (o) =>
      o.objectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.schemaName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="modal-backdrop">
      <div className="modal-container" style={{ maxWidth: "850px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-header">
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

        <div style={{ padding: "1.25rem", overflowY: "auto", flex: 1 }}>
          {errorMsg && <Alert type="error" message={errorMsg} style={{ marginBottom: "1rem" }} />}

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
            <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1.25rem" }}>
              {/* Left Column: Objects List */}
              <div style={{ borderRight: "1px solid var(--border-color)", paddingRight: "1rem" }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                  Objetos Descobertos ({objects.length})
                </div>
                <div style={{ position: "relative", marginBottom: "0.75rem" }}>
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--text-secondary)" }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Filtrar tabela/view..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: "30px", fontSize: "0.85rem" }}
                  />
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
                  <div style={{ maxHeight: "400px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
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
              <div>
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
                    <ArrowRight size={32} style={{ opacity: 0.3, marginBottom: "0.75rem" }} />
                    <p style={{ margin: 0 }}>Selecione um objeto à esquerda para ver campos e pré-visualizar a importação.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ background: "var(--surface-color)", padding: "1rem", borderRadius: "8px" }}>
                      <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.75rem" }}>
                        Configuração do Schema Público
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
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
                      <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "flex-end" }}>
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
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                            Prévia da Importação ({preview.fields.length} campos)
                          </span>
                          {preview.schemaExists ? (
                            <span className="badge badge-warning">Schema já catalogado</span>
                          ) : (
                            <span className="badge badge-success">Novo Schema</span>
                          )}
                        </div>

                        <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "6px" }}>
                          <table className="table" style={{ fontSize: "0.8rem", width: "100%" }}>
                            <thead>
                              <tr>
                                <th>Campo Interno</th>
                                <th>Nome Público</th>
                                <th>Tipo DB / Público</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {preview.fields.map((f) => (
                                <tr key={f.internalFieldName}>
                                  <td><code>{f.internalFieldName}</code></td>
                                  <td>{f.publicName}</td>
                                  <td>{f.databaseType} &rarr; {f.publicType}</td>
                                  <td>
                                    {f.alreadyExists ? (
                                      <span className="badge badge-info">Existente</span>
                                    ) : (
                                      <span className="badge badge-success">Novo</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
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
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                          Campos Descobertos no BD ({fields.length})
                        </div>
                        <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "6px" }}>
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
                                  <td>{f.databaseType}</td>
                                  <td>{f.isNullable ? "Sim" : "Não"}</td>
                                  <td>{f.suggestedPublicType}</td>
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
