import React, { useState } from "react";
import { X, Layers, CheckCircle2 } from "lucide-react";
import type {
  BootstrapPreview,
  BootstrapRequest,
  BootstrapResult,
} from "../types/catalogTypes";
import { catalogApi } from "../api/catalogApi";
import { isErr } from "../../../shared/result/result";
import { Alert } from "../../../shared/components/Alert";

interface BootstrapModalProps {
  dataSourceId: string;
  dataSourceName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const BootstrapModal: React.FC<BootstrapModalProps> = ({
  dataSourceId,
  dataSourceName,
  onClose,
  onSuccess,
}) => {
  const [schemaNamesInput, setSchemaNamesInput] = useState("");
  const [includeTables, setIncludeTables] = useState(true);
  const [includeViews, setIncludeViews] = useState(true);
  const [publicType] = useState("object");

  const [preview, setPreview] = useState<BootstrapPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [result, setResult] = useState<BootstrapResult | null>(null);
  const [executing, setExecuting] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const buildRequestPayload = (): BootstrapRequest => {
    const schemas = schemaNamesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const objectTypes: string[] = [];
    if (includeTables) objectTypes.push("table");
    if (includeViews) objectTypes.push("view");

    return {
      dataSourceId,
      schemaNames: schemas,
      objectTypes,
      publicType,
    };
  };

  const handleGeneratePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingPreview(true);
    setErrorMsg(null);
    setResult(null);

    const payload = buildRequestPayload();
    const res = await catalogApi.previewBootstrap(payload);
    setLoadingPreview(false);

    if (isErr(res)) {
      setErrorMsg(res.error.detail || "Erro ao gerar prévia do bootstrap.");
    } else {
      setPreview(res.value);
    }
  };

  const handleExecuteBootstrap = async () => {
    setExecuting(true);
    setErrorMsg(null);

    const payload = buildRequestPayload();
    const res = await catalogApi.executeBootstrap(payload);
    setExecuting(false);

    if (isErr(res)) {
      setErrorMsg(res.error.detail || "Erro ao executar bootstrap.");
    } else {
      setResult(res.value);
      onSuccess();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container" style={{ maxWidth: "800px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Layers size={20} className="text-accent" />
            <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
              Bootstrap em Massa: {dataSourceName}
            </h3>
          </div>
          <button onClick={onClose} className="btn-icon" aria-label="Fechar modal">
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "1.25rem", overflowY: "auto", flex: 1 }}>
          {errorMsg && <Alert type="error" message={errorMsg} style={{ marginBottom: "1rem" }} />}

          {result ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ textAlign: "center", padding: "1rem" }}>
                <CheckCircle2 size={40} style={{ color: "#22c55e", marginBottom: "0.5rem" }} />
                <h4 style={{ margin: 0, fontSize: "1.2rem" }}>Resultado do Bootstrap</h4>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  Objetos descobertos: {result.objectsDiscovered} | Schemas Criados: {result.schemasCreated} | Campos Criados: {result.fieldsCreated}
                </p>
              </div>

              {/* Items breakdown evaluating succeeded and error per item */}
              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Detalhamento por Objeto</div>
              <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "6px" }}>
                <table className="table" style={{ fontSize: "0.8rem", width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Objeto DB</th>
                      <th>Tipo</th>
                      <th>Status</th>
                      <th>Mensagem / Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.schemas.map((item, idx) => (
                      <tr key={idx} style={{ background: item.succeeded ? "transparent" : "rgba(239, 68, 68, 0.05)" }}>
                        <td><code>{item.internalSchemaName}.{item.internalObjectName}</code></td>
                        <td>{item.objectType}</td>
                        <td>
                          {item.succeeded ? (
                            <span className="badge badge-success">Sucesso</span>
                          ) : (
                            <span className="badge badge-error">Falha</span>
                          )}
                        </td>
                        <td style={{ color: item.succeeded ? "var(--text-secondary)" : "#ef4444" }}>
                          {item.succeeded
                            ? item.import ? `Schema importado (${item.import.createdFields.length} campos criados)` : "OK"
                            : item.error || "Erro desconhecido"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button onClick={onClose} className="btn btn-primary">
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <form onSubmit={handleGeneratePreview} style={{ background: "var(--surface-color)", padding: "1rem", borderRadius: "8px" }}>
                <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.75rem" }}>
                  Filtros da Introspecção em Massa
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label" htmlFor="bootstrap-schemas">
                      Nomes de Esquemas DB (Opcional, sep. por vírgula)
                    </label>
                    <input
                      id="bootstrap-schemas"
                      type="text"
                      className="form-input"
                      value={schemaNamesInput}
                      onChange={(e) => setSchemaNamesInput(e.target.value)}
                      placeholder="public, sales (vazio = todos)"
                    />
                  </div>

                  <div>
                    <label className="form-label">Tipos de Objeto</label>
                    <div style={{ display: "flex", gap: "1rem", marginTop: "0.4rem" }}>
                      <label style={{ fontSize: "0.85rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={includeTables}
                          onChange={(e) => setIncludeTables(e.target.checked)}
                          style={{ marginRight: "4px" }}
                        />
                        Tabelas (table)
                      </label>
                      <label style={{ fontSize: "0.85rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={includeViews}
                          onChange={(e) => setIncludeViews(e.target.checked)}
                          style={{ marginRight: "4px" }}
                        />
                        Views (view)
                      </label>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" className="btn btn-secondary" disabled={loadingPreview}>
                    {loadingPreview ? "Gerando Prévia..." : "Gerar Prévia do Bootstrap"}
                  </button>
                </div>
              </form>

              {preview && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem", textAlign: "center" }}>
                    <div style={{ background: "var(--surface-color)", padding: "0.75rem", borderRadius: "6px" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Objetos</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{preview.objectsDiscovered}</div>
                    </div>
                    <div style={{ background: "var(--surface-color)", padding: "0.75rem", borderRadius: "6px" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Schemas Novos</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#22c55e" }}>{preview.schemasToCreate}</div>
                    </div>
                    <div style={{ background: "var(--surface-color)", padding: "0.75rem", borderRadius: "6px" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Schemas Existentes</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#3b82f6" }}>{preview.schemasExisting}</div>
                    </div>
                    <div style={{ background: "var(--surface-color)", padding: "0.75rem", borderRadius: "6px" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Campos Novos</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#22c55e" }}>{preview.fieldsToCreate}</div>
                    </div>
                    <div style={{ background: "var(--surface-color)", padding: "0.75rem", borderRadius: "6px" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Campos Existentes</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#3b82f6" }}>{preview.fieldsExisting}</div>
                    </div>
                  </div>

                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Lista de Schemas a Catalogar ({preview.schemas.length})</div>
                  <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "6px" }}>
                    <table className="table" style={{ fontSize: "0.8rem", width: "100%" }}>
                      <thead>
                        <tr>
                          <th>Objeto DB</th>
                          <th>Tipo</th>
                          <th>Status Prévia</th>
                          <th>Detalhes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.schemas.map((item, idx) => (
                          <tr key={idx}>
                            <td><code>{item.internalSchemaName}.{item.internalObjectName}</code></td>
                            <td>{item.objectType}</td>
                            <td>
                              {item.succeeded ? (
                                item.schema?.schemaExists ? (
                                  <span className="badge badge-info">Existe</span>
                                ) : (
                                  <span className="badge badge-success">Novo Schema</span>
                                )
                              ) : (
                                <span className="badge badge-error">Erro</span>
                              )}
                            </td>
                            <td>
                              {item.succeeded && item.schema
                                ? `${item.schema.fields.length} campos descobertos`
                                : item.error || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                    <button onClick={onClose} className="btn btn-secondary" disabled={executing}>
                      Cancelar
                    </button>
                    <button onClick={handleExecuteBootstrap} className="btn btn-primary" disabled={executing}>
                      {executing ? "Executando Bootstrap..." : "Executar Bootstrap em Massa"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
