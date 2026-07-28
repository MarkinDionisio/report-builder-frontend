import React, { useState } from "react";
import { X, Lock, FileKey, Server } from "lucide-react";
import type {
  ClientCertificateUpdate,
  CreateDataSourceRequest,
  DataSource,
  DataSourceProvider,
  ExecutionCredentialMode,
  UpdateDataSourceRequest,
} from "../types/catalogTypes";
import { Alert } from "../../../shared/components/Alert";

interface DataSourceModalProps {
  organizationId: string;
  organizations?: { id: string; name: string }[];
  dataSource?: DataSource | null;
  onClose: () => void;
  onSubmitCreate: (data: CreateDataSourceRequest) => Promise<boolean>;
  onSubmitUpdate: (id: string, data: UpdateDataSourceRequest) => Promise<boolean>;
}

export const DataSourceModal: React.FC<DataSourceModalProps> = ({
  organizationId,
  organizations = [],
  dataSource,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}) => {
  const isEditing = Boolean(dataSource);

  const [selectedOrgId, setSelectedOrgId] = useState(dataSource?.organizationId || organizationId);
  const [name, setName] = useState(dataSource?.name || "");
  const [provider] = useState<DataSourceProvider>("postgresql");
  const [executionCredentialMode, setExecutionCredentialMode] = useState<ExecutionCredentialMode>(
    dataSource?.executionCredentialMode || "existingReadOnlyUser"
  );
  const [isEnabled, setIsEnabled] = useState(dataSource?.isEnabled ?? true);

  // Transient secret fields - cleared after submit
  const [adminConnectionString, setAdminConnectionString] = useState("");
  const [executionConnectionString, setExecutionConnectionString] = useState("");
  const [pfxBase64, setPfxBase64] = useState("");
  const [certPassword, setCertPassword] = useState("");

  // Edit mode certificate operation
  const [certOperation, setCertOperation] = useState<"keep" | "remove" | "replace">("keep");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setErrorMsg("O arquivo PFX excede o limite máximo permitido de 1 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1] || result;
      setPfxBase64(base64Data);
      setErrorMsg(null);
    };
    reader.onerror = () => {
      setErrorMsg("Erro ao ler o arquivo PFX.");
    };
    reader.readAsDataURL(file);
  };

  const clearSecrets = () => {
    setAdminConnectionString("");
    setExecutionConnectionString("");
    setPfxBase64("");
    setCertPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("O nome do DataSource é obrigatório.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      if (!isEditing) {
        if (!adminConnectionString.trim() || !executionConnectionString.trim()) {
          setErrorMsg("As Connection Strings administrativa e de execução são obrigatórias na criação.");
          setLoading(false);
          return;
        }

        const createPayload: CreateDataSourceRequest = {
          organizationId: selectedOrgId,
          name: name.trim(),
          provider,
          adminConnectionString: adminConnectionString.trim(),
          executionConnectionString: executionConnectionString.trim(),
          executionCredentialMode,
          isEnabled,
          clientCertificate: pfxBase64
            ? { pfxBase64: pfxBase64.trim(), password: certPassword.trim() || null }
            : null,
        };

        const success = await onSubmitCreate(createPayload);
        clearSecrets();
        if (success) onClose();
      } else {
        let certUpdate: ClientCertificateUpdate | null = null;
        if (certOperation === "keep") {
          certUpdate = { operation: "keep" };
        } else if (certOperation === "remove") {
          certUpdate = { operation: "remove" };
        } else if (certOperation === "replace") {
          if (!pfxBase64) {
            setErrorMsg("Selecione um arquivo PFX Base64 para a substituição do certificado.");
            setLoading(false);
            return;
          }
          certUpdate = {
            operation: "replace",
            pfxBase64: pfxBase64.trim(),
            password: certPassword.trim() || null,
          };
        }

        const updatePayload: UpdateDataSourceRequest = {
          name: name.trim(),
          executionCredentialMode,
          isEnabled,
          clientCertificateUpdate: certUpdate,
        };

        const success = await onSubmitUpdate(dataSource!.id, updatePayload);
        clearSecrets();
        if (success) onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.detail || "Ocorreu um erro ao salvar o DataSource.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container" style={{ maxWidth: "600px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Server size={20} className="text-accent" />
            <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
              {isEditing ? `Editar DataSource: ${dataSource?.name}` : "Novo DataSource"}
            </h3>
          </div>
          <button onClick={onClose} className="btn-icon" aria-label="Fechar modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1.25rem" }}>
          {errorMsg && <Alert type="error" message={errorMsg} style={{ marginBottom: "1rem" }} />}

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {!isEditing && organizations.length > 0 && (
              <div>
                <label className="form-label" htmlFor="ds-org">
                  Organização Proprietária *
                </label>
                <select
                  id="ds-org"
                  className="form-select"
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  required
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="form-label" htmlFor="ds-name">
                Nome do DataSource *
              </label>
              <input
                id="ds-name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Produção PostgreSQL"
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="form-label" htmlFor="ds-provider">
                  Provider (BD)
                </label>
                <select id="ds-provider" className="form-select" value={provider} disabled>
                  <option value="postgresql">PostgreSQL</option>
                </select>
              </div>

              <div>
                <label className="form-label" htmlFor="ds-credential-mode">
                  Modo de Credencial
                </label>
                <select
                  id="ds-credential-mode"
                  className="form-select"
                  value={executionCredentialMode}
                  onChange={(e) => setExecutionCredentialMode(e.target.value as ExecutionCredentialMode)}
                >
                  <option value="existingReadOnlyUser">Usuário Read-Only Existente</option>
                  <option value="managedReadOnlyUser">Usuário Read-Only Gerenciado</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "0.25rem 0" }}>
              <input
                id="ds-enabled"
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "var(--primary-500)" }}
              />
              <label htmlFor="ds-enabled" style={{ fontSize: "0.9rem", cursor: "pointer", fontWeight: 500 }}>
                DataSource Habilitado
              </label>
            </div>

            {!isEditing && (
              <>
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                  <label className="form-label" htmlFor="ds-admin-conn">
                    <Lock size={14} style={{ display: "inline", marginRight: "4px" }} />
                    Connection String Administrativa (Transitório) *
                  </label>
                  <input
                    id="ds-admin-conn"
                    type="password"
                    className="form-input"
                    value={adminConnectionString}
                    onChange={(e) => setAdminConnectionString(e.target.value)}
                    placeholder="Host=localhost;Database=mydb;User Id=admin;Password=secret;"
                    required
                  />
                  <small style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                    Mantida apenas durante o envio. Nunca é salva nem retornada em texto claro.
                  </small>
                </div>

                <div>
                  <label className="form-label" htmlFor="ds-exec-conn">
                    <Lock size={14} style={{ display: "inline", marginRight: "4px" }} />
                    Connection String de Execução (Transitório) *
                  </label>
                  <input
                    id="ds-exec-conn"
                    type="password"
                    className="form-input"
                    value={executionConnectionString}
                    onChange={(e) => setExecutionConnectionString(e.target.value)}
                    placeholder="Host=localhost;Database=mydb;User Id=readonly;Password=secret;"
                    required
                  />
                </div>
              </>
            )}

            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.5rem" }}>
                <FileKey size={16} style={{ display: "inline", marginRight: "6px" }} />
                Certificado Cliente PFX (Opcional, Máx 1MB)
              </div>

              {isEditing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label className="form-label">Operação de Certificado</label>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <label style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <input
                        type="radio"
                        name="certOp"
                        checked={certOperation === "keep"}
                        onChange={() => setCertOperation("keep")}
                      />
                      Manter existente
                    </label>
                    <label style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <input
                        type="radio"
                        name="certOp"
                        checked={certOperation === "replace"}
                        onChange={() => setCertOperation("replace")}
                      />
                      Substituir
                    </label>
                    <label style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <input
                        type="radio"
                        name="certOp"
                        checked={certOperation === "remove"}
                        onChange={() => setCertOperation("remove")}
                      />
                      Remover
                    </label>
                  </div>
                </div>
              ) : null}

              {(!isEditing || certOperation === "replace") && (
                <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div>
                    <label className="form-label">Selecione Arquivo PFX</label>
                    <input
                      type="file"
                      accept=".pfx,.p12"
                      onChange={handleFileUpload}
                      className="form-input"
                      style={{ padding: "0.4rem" }}
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="cert-pass">
                      Senha do Certificado PFX
                    </label>
                    <input
                      id="cert-pass"
                      type="password"
                      className="form-input"
                      value={certPassword}
                      onChange={(e) => setCertPassword(e.target.value)}
                      placeholder="Senha do arquivo PFX (opcional)"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              marginTop: "1.5rem",
              paddingTop: "1rem",
              borderTop: "1px solid var(--border-color)",
            }}
          >
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Salvando..." : isEditing ? "Atualizar DataSource" : "Criar DataSource"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
