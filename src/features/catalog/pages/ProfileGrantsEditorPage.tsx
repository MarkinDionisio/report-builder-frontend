import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import type {
  AvailableCatalogSchema,
  DataSource,
  Profile,
  ProfileFieldGrant,
  ProfileGrants,
  ProfileSchemaGrant,
} from "../types/catalogTypes";
import { catalogApi } from "../api/catalogApi";
import { isErr } from "../../../shared/result/result";
import { canManageOrganization } from "../../../shared/utils/roles";
import { Navbar } from "../../../shared/components/Navbar";
import { Alert } from "../../../shared/components/Alert";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { Key, ArrowLeft, CheckSquare, ShieldAlert, Database, Layers, CheckCircle2 } from "lucide-react";

export const ProfileGrantsEditorPage: React.FC = () => {
  const { organizationId, profileId } = useParams<{ organizationId: string; profileId: string }>();
  const { state, refreshUser } = useAuth();
  const user = state.status === "authenticated" ? state.user : null;

  const canManage = Boolean(user && organizationId && canManageOrganization(user, organizationId));

  const [profile, setProfile] = useState<Profile | null>(null);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string>("");

  const [availableCatalog, setAvailableCatalog] = useState<AvailableCatalogSchema[]>([]);
  const [grants, setGrants] = useState<ProfileGrants>({ schemas: [] });

  const [loading, setLoading] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Initial load: Profile, DataSources & existing Grants for this Organization
  const initLoad = useCallback(async () => {
    if (!organizationId || !profileId) return;
    if (!canManage) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const [profRes, dsRes, grantsRes] = await Promise.all([
      catalogApi.getProfile(organizationId, profileId),
      catalogApi.listDataSources(organizationId),
      catalogApi.getProfileGrants(organizationId, profileId),
    ]);

    setLoading(false);

    if (isErr(profRes)) {
      if (profRes.error.status === 403 || profRes.error.code === "report_catalog.grant_management_forbidden") {
        setAccessDenied(true);
        refreshUser();
      } else {
        setErrorMsg(profRes.error.detail || "Erro ao carregar perfil.");
      }
      return;
    }

    setProfile(profRes.value);
    if (!isErr(grantsRes)) {
      setGrants(grantsRes.value);
    }

    if (!isErr(dsRes)) {
      setDataSources(dsRes.value);
      if (dsRes.value.length > 0) {
        setSelectedDataSourceId(dsRes.value[0].id);
      }
    }
  }, [organizationId, profileId, canManage, refreshUser]);

  useEffect(() => {
    initLoad();
  }, [initLoad]);

  // Load available catalog when a DataSource is selected in the cascade
  const loadAvailableCatalog = useCallback(async () => {
    if (!organizationId || !selectedDataSourceId) {
      setAvailableCatalog([]);
      return;
    }
    setLoadingCatalog(true);
    setErrorMsg(null);

    const res = await catalogApi.getAvailableCatalog(organizationId, selectedDataSourceId);
    setLoadingCatalog(false);

    if (isErr(res)) {
      if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      } else {
        setErrorMsg(res.error.detail || "Erro ao carregar catálogo disponível do DataSource.");
      }
    } else {
      setAvailableCatalog(res.value);
    }
  }, [organizationId, selectedDataSourceId, refreshUser]);

  useEffect(() => {
    if (selectedDataSourceId) {
      loadAvailableCatalog();
    }
  }, [selectedDataSourceId, loadAvailableCatalog]);

  const findFieldGrant = (schemaId: string, fieldId: string): ProfileFieldGrant | undefined => {
    const schemaGrant = grants.schemas.find((s) => s.schemaId === schemaId);
    return schemaGrant?.fields.find((f) => f.fieldId === fieldId);
  };

  // Level 1: Grant ALL Schemas of the selected DataSource at once (POST /grant-all)
  const handleGrantAllDataSource = async () => {
    if (!organizationId || !profileId || !selectedDataSourceId) return;
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await catalogApi.grantAllProfileSchemas(organizationId, profileId, selectedDataSourceId);
    setSaving(false);

    if (isErr(res)) {
      if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      } else {
        setErrorMsg(res.error.detail || "Erro ao conceder todas as permissões do DataSource.");
      }
    } else {
      setGrants(res.value);
      setSuccessMsg("Todos os schemas e campos disponíveis no DataSource foram liberados com sucesso!");
    }
  };

  // Level 2: Grant ALL Fields of a SPECIFIC Schema at once (PUT snapshot update)
  const handleGrantEntireSchema = async (targetSchema: AvailableCatalogSchema) => {
    if (!organizationId || !profileId) return;
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const nextSchemas: ProfileSchemaGrant[] = JSON.parse(JSON.stringify(grants.schemas));
    let schemaGrant = nextSchemas.find((s) => s.schemaId === targetSchema.id);

    if (!schemaGrant) {
      schemaGrant = { schemaId: targetSchema.id, fields: [] };
      nextSchemas.push(schemaGrant);
    }

    // Grant all capabilities permitted by the available catalog for every field in this schema
    schemaGrant.fields = targetSchema.fields.map((field) => ({
      fieldId: field.id,
      selectable: field.selectable,
      filterable: field.filterable,
      sortable: field.sortable,
      groupable: field.groupable,
      aggregatable: field.aggregatable,
    }));

    const cleanedSchemas = nextSchemas.filter((s) => s.fields.length > 0);
    const snapshotPayload = { schemas: cleanedSchemas };

    const res = await catalogApi.updateProfileGrants(organizationId, profileId, snapshotPayload);
    setSaving(false);

    if (isErr(res)) {
      if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      } else {
        setErrorMsg(res.error.detail || "Erro ao liberar todos os campos do schema.");
      }
    } else {
      setGrants(res.value);
      setSuccessMsg(`Todos os campos do schema "${targetSchema.name}" foram liberados!`);
    }
  };

  // Level 3: Grant or Revoke individual field capability (PUT snapshot update)
  const handleToggleCapability = async (
    schemaId: string,
    fieldId: string,
    capability: keyof Omit<ProfileFieldGrant, "fieldId">
  ) => {
    if (!organizationId || !profileId) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const nextSchemas: ProfileSchemaGrant[] = JSON.parse(JSON.stringify(grants.schemas));
    let schemaGrant = nextSchemas.find((s) => s.schemaId === schemaId);

    if (!schemaGrant) {
      schemaGrant = { schemaId, fields: [] };
      nextSchemas.push(schemaGrant);
    }

    let fieldGrant = schemaGrant.fields.find((f) => f.fieldId === fieldId);
    if (!fieldGrant) {
      fieldGrant = {
        fieldId,
        selectable: false,
        filterable: false,
        sortable: false,
        groupable: false,
        aggregatable: false,
      };
      schemaGrant.fields.push(fieldGrant);
    }

    // Toggle target capability
    fieldGrant[capability] = !fieldGrant[capability];

    // Remove empty fields or empty schemas to keep clean payload
    schemaGrant.fields = schemaGrant.fields.filter(
      (f) => f.selectable || f.filterable || f.sortable || f.groupable || f.aggregatable
    );
    const cleanedSchemas = nextSchemas.filter((s) => s.fields.length > 0);

    const snapshotPayload = { schemas: cleanedSchemas };

    setSaving(true);
    const res = await catalogApi.updateProfileGrants(organizationId, profileId, snapshotPayload);
    setSaving(false);

    if (isErr(res)) {
      if (res.error.code === "report_catalog.grant_not_available") {
        setErrorMsg("Um ou mais privilégios concedidos não estão mais disponíveis no catálogo.");
        loadAvailableCatalog();
      } else if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      } else {
        setErrorMsg(res.error.detail || "Erro ao atualizar permissão individual.");
      }
    } else {
      setGrants(res.value);
    }
  };

  const currentDs = dataSources.find((d) => d.id === selectedDataSourceId);

  if (accessDenied || (!canManage && !loading)) {
    return (
      <>
        <Navbar />
        <main className="container" style={{ padding: "2rem 1rem" }}>
          <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
            <ShieldAlert size={48} style={{ color: "var(--danger-500)", marginBottom: "1rem" }} />
            <h2>Acesso Negado</h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto 1.5rem auto" }}>
              Apenas o papel <code>root</code> ou o papel de <code>administrator</code> na organização podem gerenciar os Grants do perfil.
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
          <Link
            to={`/organizations/${organizationId}/profiles`}
            className="btn btn-secondary"
            style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
          >
            <ArrowLeft size={16} /> Voltar para Perfis
          </Link>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.25rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Key size={28} className="text-accent" /> Editor de Grants: {profile?.name}
            </h1>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>
              Libere permissões por <strong>DataSource em lote</strong>, por <strong>Schema completo</strong> ou <strong>individualmente por campo</strong>.
            </p>
          </div>

          {selectedDataSourceId && availableCatalog.length > 0 && (
            <button
              onClick={handleGrantAllDataSource}
              className="btn btn-primary"
              disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              title="Liberar 100% dos Schemas e Campos deste DataSource de uma vez"
            >
              <CheckSquare size={18} /> Liberar Todos os Schemas do DataSource
            </button>
          )}
        </div>

        {errorMsg && <Alert type="error" message={errorMsg} style={{ marginBottom: "1.25rem" }} />}
        {successMsg && <Alert type="success" message={successMsg} style={{ marginBottom: "1.25rem" }} />}

        {loading ? (
          <NeutralLoader message="Carregando matriz de permissões em cascata..." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Cascading Selector Step 1 */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.75rem" }}>
                <Layers size={18} className="text-accent" /> Seleção do DataSource da Organização ({profile?.organizationName})
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>
                  <Database size={18} className="text-accent" /> DataSource:
                </div>
                <select
                  className="form-select"
                  style={{ maxWidth: "380px" }}
                  value={selectedDataSourceId}
                  onChange={(e) => setSelectedDataSourceId(e.target.value)}
                >
                  <option value="">-- Selecione um DataSource --</option>
                  {dataSources.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {ds.name} ({ds.provider})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cascading Step 2 Display */}
            {!selectedDataSourceId ? (
              <div className="card" style={{ textAlign: "center", padding: "3.5rem 1.5rem", color: "var(--text-secondary)" }}>
                <Database size={48} style={{ opacity: 0.3, marginBottom: "0.75rem" }} />
                <h3>Selecione um DataSource</h3>
                {dataSources.length === 0 ? (
                  <p style={{ maxWidth: "500px", margin: "0 auto", color: "var(--danger-500)" }}>
                    A organização <strong>{profile?.organizationName}</strong> não possui nenhum DataSource cadastrado. Cadastre um DataSource primeiro.
                  </p>
                ) : (
                  <p style={{ maxWidth: "500px", margin: "0 auto" }}>
                    Selecione um dos <strong>{dataSources.length} DataSources</strong> da organização <strong>{profile?.organizationName}</strong> acima para visualizar os schemas e liberar permissões para o perfil <strong>{profile?.name}</strong>.
                  </p>
                )}
              </div>
            ) : loadingCatalog ? (
              <NeutralLoader message={`Carregando catálogo do DataSource ${currentDs?.name}...`} />
            ) : availableCatalog.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "3.5rem 1.5rem", color: "var(--text-secondary)" }}>
                <Key size={48} style={{ opacity: 0.3, marginBottom: "0.75rem" }} />
                <h3>Nenhum schema disponível no DataSource selecionado</h3>
                <p style={{ maxWidth: "480px", margin: "0 auto" }}>
                  O DataSource <strong>{currentDs?.name}</strong> ainda não possui schemas habilitados no catálogo. Importe schemas para este DataSource para liberar permissões aos perfis.
                </p>
              </div>
            ) : (
              /* Step 2: Grant Matrix with Multi-Level Release */
              availableCatalog.map((schema) => (
                <div key={schema.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                  <div
                    style={{
                      background: "var(--surface-color)",
                      padding: "0.85rem 1.25rem",
                      borderBottom: "1px solid var(--border-color)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>{schema.name}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginLeft: "0.75rem" }}>
                        DataSource: {schema.dataSourceName} (Org: {profile?.organizationName})
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span className="badge badge-info">{schema.type}</span>

                      {/* Level 2: Grant ALL Fields of this Schema */}
                      <button
                        onClick={() => handleGrantEntireSchema(schema)}
                        className="btn btn-secondary"
                        disabled={saving}
                        style={{ padding: "0.3rem 0.6rem", fontSize: "0.775rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
                        title="Liberar todas as capacidades de todos os campos deste schema de uma vez"
                      >
                        <CheckCircle2 size={14} className="text-accent" /> Liberar Schema Completo
                      </button>
                    </div>
                  </div>

                  <table className="table" style={{ width: "100%", margin: 0, fontSize: "0.85rem" }}>
                    <thead>
                      <tr>
                        <th>Campo do Catálogo</th>
                        <th>Tipo</th>
                        <th style={{ textAlign: "center" }}>Selectable</th>
                        <th style={{ textAlign: "center" }}>Filterable</th>
                        <th style={{ textAlign: "center" }}>Sortable</th>
                        <th style={{ textAlign: "center" }}>Groupable</th>
                        <th style={{ textAlign: "center" }}>Aggregatable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schema.fields.map((field) => {
                        const fieldGrant = findFieldGrant(schema.id, field.id);
                        return (
                          <tr key={field.id}>
                            <td>
                              <strong>{field.name}</strong>
                            </td>
                            <td>
                              <code>{field.type}</code>
                            </td>

                            {/* Selectable */}
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                disabled={!field.selectable || saving}
                                checked={Boolean(fieldGrant?.selectable)}
                                onChange={() => handleToggleCapability(schema.id, field.id, "selectable")}
                                style={{ width: "16px", height: "16px", cursor: field.selectable ? "pointer" : "not-allowed" }}
                              />
                            </td>

                            {/* Filterable */}
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                disabled={!field.filterable || saving}
                                checked={Boolean(fieldGrant?.filterable)}
                                onChange={() => handleToggleCapability(schema.id, field.id, "filterable")}
                                style={{ width: "16px", height: "16px", cursor: field.filterable ? "pointer" : "not-allowed" }}
                              />
                            </td>

                            {/* Sortable */}
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                disabled={!field.sortable || saving}
                                checked={Boolean(fieldGrant?.sortable)}
                                onChange={() => handleToggleCapability(schema.id, field.id, "sortable")}
                                style={{ width: "16px", height: "16px", cursor: field.sortable ? "pointer" : "not-allowed" }}
                              />
                            </td>

                            {/* Groupable */}
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                disabled={!field.groupable || saving}
                                checked={Boolean(fieldGrant?.groupable)}
                                onChange={() => handleToggleCapability(schema.id, field.id, "groupable")}
                                style={{ width: "16px", height: "16px", cursor: field.groupable ? "pointer" : "not-allowed" }}
                              />
                            </td>

                            {/* Aggregatable */}
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                disabled={!field.aggregatable || saving}
                                checked={Boolean(fieldGrant?.aggregatable)}
                                onChange={() => handleToggleCapability(schema.id, field.id, "aggregatable")}
                                style={{ width: "16px", height: "16px", cursor: field.aggregatable ? "pointer" : "not-allowed" }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </>
  );
};
