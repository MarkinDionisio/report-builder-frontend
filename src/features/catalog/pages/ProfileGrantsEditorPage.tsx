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
import { 
  Key, ArrowLeft, CheckSquare, ShieldAlert, Database, Layers, CheckCircle2, 
  Save, ChevronDown, ChevronRight, Search, XCircle, Loader2
} from "lucide-react";

export const ProfileGrantsEditorPage: React.FC = () => {
  const { organizationId, profileId } = useParams<{ organizationId: string; profileId: string }>();
  const { state, refreshUser } = useAuth();
  const user = state.status === "authenticated" ? state.user : null;

  const canManage = Boolean(user && organizationId && canManageOrganization(user, organizationId));

  const [profile, setProfile] = useState<Profile | null>(null);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string>("");

  const [availableCatalog, setAvailableCatalog] = useState<AvailableCatalogSchema[]>([]);
  const [, setGrants] = useState<ProfileGrants>({ schemas: [] });
  const [draftGrants, setDraftGrants] = useState<ProfileGrants>({ schemas: [] });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSuccessBar, setShowSuccessBar] = useState(false);

  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyGranted, setShowOnlyGranted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAction, setSavingAction] = useState<"revokeAll" | "grantAll" | "save" | null>(null);
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
      setDraftGrants(grantsRes.value);
      setHasUnsavedChanges(false);
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
      // Opcional: Expandir o primeiro schema automaticamente para melhor UX
      if (res.value.length > 0) {
        setExpandedSchemas(new Set([res.value[0].id]));
      } else {
        setExpandedSchemas(new Set());
      }
    }
  }, [organizationId, selectedDataSourceId, refreshUser]);

  useEffect(() => {
    if (selectedDataSourceId) {
      loadAvailableCatalog();
    }
  }, [selectedDataSourceId, loadAvailableCatalog]);

  const findFieldGrant = (schemaId: string, fieldId: string): ProfileFieldGrant | undefined => {
    const schemaGrant = draftGrants.schemas.find((s) => s.schemaId === schemaId);
    return schemaGrant?.fields.find((f) => f.fieldId === fieldId);
  };

  const toggleSchemaExpansion = (schemaId: string) => {
    setExpandedSchemas((prev) => {
      const next = new Set(prev);
      if (next.has(schemaId)) {
        next.delete(schemaId);
      } else {
        next.add(schemaId);
      }
      return next;
    });
  };

  // Level 1: Grant ALL Schemas of the selected DataSource at once (POST /grant-all)
  const handleGrantAllDataSource = async () => {
    if (!organizationId || !profileId || !selectedDataSourceId) return;
    setSaving(true);
    setSavingAction("grantAll");
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await catalogApi.grantAllProfileSchemas(organizationId, profileId, selectedDataSourceId);
    setSaving(false);
    setSavingAction(null);

    if (isErr(res)) {
      if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      } else {
        setErrorMsg(res.error.detail || "Erro ao conceder todas as permissões do DataSource.");
      }
    } else {
      setGrants(res.value);
      setDraftGrants(res.value);
      setHasUnsavedChanges(false);
      setSuccessMsg("Todos os schemas e campos disponíveis no DataSource foram liberados com sucesso!");
    }
  };

  const handleRevokeAllProfileGrants = async () => {
    if (!organizationId || !profileId || !selectedDataSourceId) return;
    setSaving(true);
    setSavingAction("revokeAll");
    setErrorMsg(null);
    setSuccessMsg(null);

    const currentDsSchemaIds = new Set(availableCatalog.map(s => s.id));
    const nextSchemas = draftGrants.schemas.filter(s => !currentDsSchemaIds.has(s.schemaId));

    const res = await catalogApi.updateProfileGrants(organizationId, profileId, { schemas: nextSchemas });
    setSaving(false);
    setSavingAction(null);

    if (isErr(res)) {
      if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      } else {
        setErrorMsg(res.error.detail || "Erro ao revogar permissões do DataSource.");
      }
    } else {
      setGrants(res.value);
      setDraftGrants(res.value);
      setHasUnsavedChanges(false);
      setIsRevokingAll(false);
      setSuccessMsg("Todos os grants deste DataSource foram revogados com sucesso!");
    }
  };

  // Level 2: Grant ALL Fields of a SPECIFIC Schema at once (Updates Draft)
  const handleGrantEntireSchema = (targetSchema: AvailableCatalogSchema) => {
    const nextSchemas: ProfileSchemaGrant[] = JSON.parse(JSON.stringify(draftGrants.schemas));
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
    setDraftGrants({ schemas: cleanedSchemas });
    setHasUnsavedChanges(true);
  };

  // Level 2.5: Revoke ALL Fields of a SPECIFIC Schema at once (Updates Draft)
  const handleRevokeEntireSchema = (targetSchema: AvailableCatalogSchema) => {
    const nextSchemas: ProfileSchemaGrant[] = JSON.parse(JSON.stringify(draftGrants.schemas));
    const cleanedSchemas = nextSchemas.filter((s) => s.schemaId !== targetSchema.id);
    setDraftGrants({ schemas: cleanedSchemas });
    setHasUnsavedChanges(true);
  };

  // Level 3: Grant or Revoke individual field capability (Updates Draft)
  const handleToggleCapability = (
    schemaId: string,
    fieldId: string,
    capability: keyof Omit<ProfileFieldGrant, "fieldId">
  ) => {
    const nextSchemas: ProfileSchemaGrant[] = JSON.parse(JSON.stringify(draftGrants.schemas));
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

    setDraftGrants({ schemas: cleanedSchemas });
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    if (!organizationId || !profileId) return;
    setSaving(true);
    setSavingAction("save");
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await catalogApi.updateProfileGrants(organizationId, profileId, { schemas: draftGrants.schemas });
    setSaving(false);
    setSavingAction(null);

    if (isErr(res)) {
      if (res.error.code === "report_catalog.grant_not_available") {
        setErrorMsg("Um ou mais privilégios concedidos não estão mais disponíveis no catálogo.");
        loadAvailableCatalog();
      } else if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      } else {
        setErrorMsg(res.error.detail || "Erro ao salvar permissões.");
      }
    } else {
      setGrants(res.value);
      setDraftGrants(res.value);
      setHasUnsavedChanges(false);
      setSuccessMsg("Alterações salvas com sucesso!");
      setShowSuccessBar(true);
      setTimeout(() => {
        setShowSuccessBar(false);
      }, 3000);
    }
  };

  const currentDs = dataSources.find((d) => d.id === selectedDataSourceId);
  const filteredCatalog = availableCatalog.filter((schema) => {
    const matchesSearch = schema.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (showOnlyGranted) {
      const schemaGrant = draftGrants.schemas.find((s) => s.schemaId === schema.id);
      const grantedFieldsCount = schemaGrant?.fields.length || 0;
      return grantedFieldsCount > 0;
    }

    return true;
  });

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
      <main className="container" style={{ padding: "2rem 1rem", paddingBottom: hasUnsavedChanges ? "6rem" : "2rem" }}>
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

          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            {draftGrants.schemas.some(s => availableCatalog.some(c => c.id === s.schemaId)) && (
              <button
                onClick={() => setIsRevokingAll(true)}
                className="btn btn-danger"
                disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                title="Revogar todos os grants concedidos neste DataSource (Imediato)"
              >
                {savingAction === "revokeAll" ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                {savingAction === "revokeAll" ? "Revogando..." : "Revogar Tudo (Imediato)"}
              </button>
            )}

            {selectedDataSourceId && availableCatalog.length > 0 && (
              <button
                onClick={handleGrantAllDataSource}
                className="btn btn-secondary"
                disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                title="Liberar 100% dos Schemas e Campos deste DataSource de uma vez (Salva imediatamente no banco)"
              >
                {savingAction === "grantAll" ? <Loader2 size={18} className="animate-spin" /> : <CheckSquare size={18} />}
                {savingAction === "grantAll" ? "Liberando..." : "Liberar Tudo (Imediato)"}
              </button>
            )}

            {hasUnsavedChanges && (
              <button
                onClick={handleSaveChanges}
                className="btn btn-primary"
                disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                {savingAction === "save" ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {savingAction === "save" ? "Salvando..." : "Salvar Alterações"}
              </button>
            )}
          </div>
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
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                  <div style={{ position: "relative", flex: 1, minWidth: "300px", maxWidth: "600px" }}>
                    <Search size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                    <input
                      type="text"
                      placeholder="Buscar por nome do schema..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ 
                        width: "100%", 
                        padding: "0.6rem 1rem 0.6rem 2.75rem", 
                        border: "1px solid var(--border-color)", 
                        borderRadius: "6px", 
                        background: "var(--bg)", 
                        color: "var(--text)",
                        fontSize: "0.95rem"
                      }}
                    />
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.95rem", color: "var(--text-secondary)", userSelect: "none" }}>
                    <input 
                      type="checkbox" 
                      checked={showOnlyGranted}
                      onChange={(e) => setShowOnlyGranted(e.target.checked)}
                      style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--primary-500)" }}
                    />
                    Mostrar apenas schemas liberados
                  </label>
                </div>
                {filteredCatalog.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                    Nenhum schema encontrado com o termo "{searchTerm}".
                  </div>
                ) : (
                  filteredCatalog.map((schema) => {
                const isExpanded = expandedSchemas.has(schema.id);
                const schemaGrant = draftGrants.schemas.find(s => s.schemaId === schema.id);
                const grantedFieldsCount = schemaGrant?.fields.length || 0;
                const totalFieldsCount = schema.fields.length;

                return (
                  <div key={schema.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                    <div
                      style={{
                        background: "var(--surface-color)",
                        padding: "0.85rem 1.25rem",
                        borderBottom: isExpanded ? "1px solid var(--border-color)" : "none",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div 
                        style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", userSelect: "none" }}
                        onClick={() => toggleSchemaExpansion(schema.id)}
                      >
                        {isExpanded ? <ChevronDown size={20} className="text-accent" /> : <ChevronRight size={20} className="text-accent" />}
                        <div>
                          <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>{schema.name}</span>
                          <span 
                            style={{ 
                              marginLeft: "0.75rem", 
                              fontSize: "0.7rem", 
                              padding: "0.2rem 0.4rem",
                              borderRadius: "4px",
                              backgroundColor: grantedFieldsCount > 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                              color: grantedFieldsCount > 0 ? "var(--success-500, #10b981)" : "var(--text-secondary)",
                              border: `1px solid ${grantedFieldsCount > 0 ? "rgba(16, 185, 129, 0.3)" : "var(--border-color)"}`
                            }}
                          >
                            {grantedFieldsCount === 0 ? "Nenhum acesso" : `${grantedFieldsCount}/${totalFieldsCount} campos com acesso`}
                          </span>
                          <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                            DataSource: {schema.dataSourceName}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span className="badge badge-info">{schema.type}</span>

                        {/* Level 2: Grant ALL Fields of this Schema */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGrantEntireSchema(schema);
                          }}
                          className="btn btn-secondary"
                          disabled={saving}
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.775rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
                          title="Liberar todas as capacidades de todos os campos deste schema de uma vez"
                        >
                          <CheckCircle2 size={14} className="text-accent" /> Liberar Schema
                        </button>

                        {/* Level 2.5: Revoke ALL Fields of this Schema */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRevokeEntireSchema(schema);
                          }}
                          className="btn btn-secondary"
                          disabled={saving || grantedFieldsCount === 0}
                          style={{ 
                            padding: "0.3rem 0.6rem", 
                            fontSize: "0.775rem", 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "0.3rem", 
                            color: grantedFieldsCount === 0 ? "var(--text-muted)" : "var(--danger-500)", 
                            borderColor: grantedFieldsCount === 0 ? "var(--border-color)" : "var(--danger-500)" 
                          }}
                          title={grantedFieldsCount === 0 ? "Schema já está revogado" : "Revogar todas as capacidades de todos os campos deste schema de uma vez"}
                        >
                          <XCircle size={14} /> Revogar Schema
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
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
                    )}
                  </div>
                );
              })
            )}
            </>
          )}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {isRevokingAll && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, color: "var(--danger-500)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ShieldAlert size={20} /> Confirmar Revogação
              </h3>
              <button onClick={() => setIsRevokingAll(false)} className="btn-icon" disabled={saving}>
                <XCircle size={20} />
              </button>
            </div>
            <div style={{ padding: "1.25rem" }}>
              <p style={{ margin: "0 0 1rem 0", fontSize: "0.95rem" }}>
                Tem certeza que deseja revogar os acessos deste perfil para <strong>todos os schemas e campos do DataSource selecionado</strong>?
              </p>
              <div style={{ background: "rgba(239, 68, 68, 0.1)", padding: "0.75rem", borderRadius: "6px", fontSize: "0.85rem", color: "var(--danger-500)", marginBottom: "1.25rem" }}>
                Esta ação limpará apenas as permissões associadas a este DataSource e será aplicada imediatamente no banco de dados.
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button onClick={() => setIsRevokingAll(false)} className="btn btn-secondary" disabled={saving}>
                  Cancelar
                </button>
                <button onClick={handleRevokeAllProfileGrants} className="btn btn-danger" disabled={saving}>
                  {savingAction === "revokeAll" ? <Loader2 size={18} className="animate-spin" /> : null}
                  {savingAction === "revokeAll" ? "Revogando..." : "Sim, Revogar Tudo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Save Button Bar / Success Toast */}
      {(hasUnsavedChanges || showSuccessBar) && (
        <div style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: showSuccessBar ? "var(--success-500, #10b981)" : "var(--bg-card, #111)",
          borderTop: showSuccessBar ? "none" : "1px solid var(--border-color)",
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          boxShadow: "0 -4px 12px rgba(0,0,0,0.5)",
          zIndex: 9999,
          color: showSuccessBar ? "#fff" : "var(--text-primary)"
        }}>
          {showSuccessBar ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "bold" }}>
              <CheckCircle2 size={20} />
              Alterações salvas com sucesso!
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <div>
                <strong>Você possui alterações não salvas.</strong> Lembre-se de salvar antes de sair.
              </div>
              <button
                onClick={handleSaveChanges}
                className="btn btn-primary"
                disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                {savingAction === "save" ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {savingAction === "save" ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
