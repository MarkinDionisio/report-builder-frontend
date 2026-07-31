import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "../../../shared/components/Navbar";
import { Alert } from "../../../shared/components/Alert";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { catalogApi } from "../../catalog/api/catalogApi";
import { creatorApi } from "../api/creatorApi";
import { isErr } from "../../../shared/result/result";
import type { DataSource } from "../../catalog/types/catalogTypes";
import type { ReportContentV1, DesignerCatalog, DesignerSchema, DesignerField } from "../types/creatorTypes";
import { Database, Plus, X, ChevronRight, Check } from "lucide-react";
import { useAuth } from "../../auth/context/AuthContext";

function availableAggregations(field: DesignerField): string[] {
  if (!field.aggregatable) return [];
  return field.allowedAggregations || [];
}

function synchronizeGroupBy(select: any[], catalog: DesignerCatalog | null): any[] {
  const hasAggregation = select.some(item => Boolean(item.aggregation));
  if (!hasAggregation || !catalog) return [];

  const seen = new Set<string>();
  const groupBy: any[] = [];

  for (const item of select) {
    if (item.aggregation) continue;
    const key = `${item.joinAlias ?? ""}:${item.fieldId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    
    let isGroupable = false;
    for (const schema of catalog.schemas) {
      const field = schema.fields.find((f: any) => f.id === item.fieldId);
      if (field && field.groupable) {
        isGroupable = true;
        break;
      }
    }
    
    if (isGroupable) {
      groupBy.push({ fieldId: item.fieldId, joinAlias: item.joinAlias });
    }
  }

  return groupBy.slice(0, 5);
}

interface OrderByCompatibility {
  compatible: boolean;
  reason?: "fieldNotSortable" | "aggregationNotAllowed" | "aggregatedOrderRequiresGroupedQuery" | "fieldNotGrouped";
}

function referenceKey(reference: any): string {
  if (reference.target === "rows") return "TARGET_ROWS";
  return `${reference.joinAlias?.trim() ?? ""}:${reference.fieldId}`;
}

function validateOrderBy(
  item: any,
  select: any[],
  groupBy: any[],
  field: any,
): OrderByCompatibility {
  const isGroupedQuery = select.some(selected => Boolean(selected.aggregation)) || groupBy.length > 0;

  if (!item.aggregation && !field.sortable) {
    return { compatible: false, reason: "fieldNotSortable" };
  }

  if (item.aggregation && (!field.aggregatable || !field.allowedAggregations?.includes(item.aggregation))) {
    return { compatible: false, reason: "aggregationNotAllowed" };
  }

  if (!isGroupedQuery && item.aggregation) {
    return { compatible: false, reason: "aggregatedOrderRequiresGroupedQuery" };
  }

  if (isGroupedQuery && !item.aggregation) {
    const grouped = new Set(groupBy.map(referenceKey));
    if (!grouped.has(referenceKey(item))) {
      return { compatible: false, reason: "fieldNotGrouped" };
    }
  }

  return { compatible: true };
}

function normalizeWhereValues(conditions: any[]): any[] {
  return conditions.map(c => {
    const isNoValue = c.operator === "isNull" || c.operator === "isNotNull";
    if (isNoValue) {
      const { value, ...rest } = c;
      return rest;
    }
    
    if (c.operator === "in" || c.operator === "between") {
      if (typeof c.value === "string") {
        const arr = c.value.split(",").map((s: string) => s.trim()).filter(Boolean);
        return { ...c, value: c.operator === "between" ? arr.slice(0, 2) : arr };
      }
    }
    
    // Attempt parsing number/boolean for single values
    if (typeof c.value === "string" && (c.operator !== "in" && c.operator !== "between")) {
      const v = c.value.trim();
      if (v === "true") return { ...c, value: true };
      if (v === "false") return { ...c, value: false };
      if (!isNaN(Number(v)) && v !== "") return { ...c, value: Number(v) };
    }
    
    return c;
  });
}

export const ReportDesignerPage: React.FC = () => {
  const { organizationId, reportId } = useParams<{ organizationId: string; reportId?: string }>();
  const navigate = useNavigate();
  const { state } = useAuth();
  const isRoot = state.user?.globalRole === "root";

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Setup state
  const [availableDataSources, setAvailableDataSources] = useState<DataSource[]>([]);
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string>("");
  
  // Designer state
  const [catalog, setCatalog] = useState<DesignerCatalog | null>(null);
  const [reportContent, setReportContent] = useState<ReportContentV1 | null>(null);
  
  // Wizard State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedSchemaIds, setSelectedSchemaIds] = useState<string[]>([]);
  
  // Search state
  const [schemaSearch, setSchemaSearch] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [exactMatch, setExactMatch] = useState(false);
  const [expandedSchemas, setExpandedSchemas] = useState<Record<string, boolean>>({});

  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);

  // Save state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [visibilityScope, setVisibilityScope] = useState<"private" | "organization" | "global">("private");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDevJson, setShowDevJson] = useState(false);

  // 1. Initial Load
  useEffect(() => {
    const loadInitialState = async () => {
      setLoading(true);
      setErrorMsg(null);

      if (!organizationId) {
        setErrorMsg("Organização não especificada.");
        setLoading(false);
        return;
      }

      const dsRes = await catalogApi.listDataSources(organizationId);
      if (isErr(dsRes)) {
        setErrorMsg(dsRes.error.detail || "Erro ao carregar fontes de dados.");
        setLoading(false);
        return;
      }
      setAvailableDataSources(dsRes.value);

      if (reportId) {
        const reportRes = await creatorApi.getReport(reportId);
        if (isErr(reportRes)) {
          setErrorMsg(reportRes.error.detail || "Erro ao carregar relatório.");
          setLoading(false);
          return;
        }
        
        const r = reportRes.value;
        setReportTitle(r.title);
        setVisibilityScope(r.visibilityScope as any);
        setReportContent(r.content);
        
        // Recover dataSourceId from saved content, or fallback to first DS if there is only 1
        let dsId = (r.content.dataset as any).dataSourceId;
        if (!dsId && dsRes.value.length === 1) {
          dsId = dsRes.value[0].id;
        }
        
        if (dsId) {
          setSelectedDataSourceId(dsId);
          const catRes = await creatorApi.getDesignerCatalog(organizationId, dsId);
          if (isErr(catRes)) {
            setErrorMsg("Erro ao carregar catálogo para o relatório.");
          } else {
            setCatalog(catRes.value);
            // Rebuild selected schema IDs
            const selectedIds = [r.content.dataset.schemaId];
            r.content.dataset.joins?.forEach(j => {
              const tmpl = catRes.value.joins.find(t => t.joinTemplateId === j.joinTemplateId);
              if (tmpl) selectedIds.push(tmpl.toSchemaId);
            });
            setSelectedSchemaIds(Array.from(new Set(selectedIds)));
          }
        }
        
        setLoading(false);
      } else {
        setLoading(false);
      }
    };
    loadInitialState();
  }, [organizationId, reportId]);

  // 2. Load Catalog
  const handleSelectDataSource = async (dsId: string) => {
    if (!organizationId) return;
    
    setSelectedDataSourceId(dsId);
    setLoading(true);
    
    const res = await creatorApi.getDesignerCatalog(organizationId, dsId);
    setLoading(false);

    if (isErr(res)) {
      setErrorMsg(res.error.detail || "Erro ao carregar o catálogo.");
      setSelectedDataSourceId("");
    } else {
      setCatalog(res.value);
      setReportContent({
        version: 1,
        dataset: { schemaId: "", select: [] }
      });
    }
  };

  // Helper: Match String
  const matchStr = (text: string, query: string) => {
    if (!query) return true;
    if (exactMatch) return matchCase ? text === query : text.toLowerCase() === query.toLowerCase();
    return matchCase ? text.includes(query) : text.toLowerCase().includes(query.toLowerCase());
  };

  // --- WIZARD LOGIC ---
  const canSelectSchema = (schemaId: string) => {
    if (selectedSchemaIds.length === 0) return true;
    if (selectedSchemaIds.includes(schemaId)) return true;
    
    // Só pode ver/selecionar as schemas que fazem join com a Base (primeira selecionada)
    const baseSchemaId = selectedSchemaIds[0];
    return catalog?.joins.some(j => j.fromSchemaId === baseSchemaId && j.toSchemaId === schemaId) || false;
  };

  const handleToggleSchema = (schemaId: string) => {
    if (!reportContent) return;
    const isSelected = selectedSchemaIds.includes(schemaId);
    let newSelected = [...selectedSchemaIds];

    if (isSelected) {
      newSelected = newSelected.filter(id => id !== schemaId);
      // Se remover a base, limpa tudo
      if (schemaId === reportContent.dataset.schemaId) {
        newSelected = [];
        setReportContent({ ...reportContent, dataset: { schemaId: "", select: [], joins: [] } });
      } else {
        // Remover join
        const joinToRemove = catalog?.joins.find(j => j.fromSchemaId === reportContent.dataset.schemaId && j.toSchemaId === schemaId);
        if (joinToRemove) {
          const removedAlias = reportContent.dataset.joins?.find(j => j.joinTemplateId === joinToRemove.joinTemplateId)?.alias;
          const joins = (reportContent.dataset.joins || []).filter(j => j.joinTemplateId !== joinToRemove.joinTemplateId);
          const select = reportContent.dataset.select.filter(s => s.joinAlias !== removedAlias);
          setReportContent({ ...reportContent, dataset: { ...reportContent.dataset, joins, select } });
        }
      }
    } else {
      // Adding schema
      if (newSelected.length === 0) {
        setReportContent({ ...reportContent, dataset: { ...reportContent.dataset, schemaId } });
      } else {
        const baseSchemaId = reportContent.dataset.schemaId;
        const directJoin = catalog?.joins.find(j => j.fromSchemaId === baseSchemaId && j.toSchemaId === schemaId);
        if (directJoin) {
          const joins = [...(reportContent.dataset.joins || [])];
          let alias = directJoin.suggestedAlias || "j";
          let counter = 1;
          while (joins.some(j => j.alias === alias)) {
            alias = `${directJoin.suggestedAlias || "j"}${counter}`;
            counter++;
          }
          joins.push({ joinTemplateId: directJoin.joinTemplateId, alias });
          setReportContent({ ...reportContent, dataset: { ...reportContent.dataset, joins } });
        }
      }
      newSelected.push(schemaId);
    }
    setSelectedSchemaIds(newSelected);
  };

  const handleAddFieldToSelect = (schema: DesignerSchema, field: DesignerField, aggregation?: string) => {
    if (!reportContent) return;
    const baseSchemaId = reportContent.dataset.schemaId;
    
    let joinAlias = "";
    if (schema.id !== baseSchemaId) {
      const directJoin = catalog?.joins.find(j => j.fromSchemaId === baseSchemaId && j.toSchemaId === schema.id);
      if (directJoin) {
        const existingJoin = reportContent.dataset.joins?.find(j => j.joinTemplateId === directJoin.joinTemplateId);
        if (existingJoin) joinAlias = existingJoin.alias;
      }
    }

    const isDuplicate = (reportContent.dataset.select || []).some(
      s => s.fieldId === field.id && (s.joinAlias || "") === joinAlias && (s.aggregation || "") === (aggregation || "")
    );
    if (isDuplicate) return;

    const newItem: any = { fieldId: field.id, joinAlias };
    if (aggregation) {
      newItem.aggregation = aggregation;
      newItem.alias = `Total de ${field.name}`;
    }

    setReportContent({
      ...reportContent,
      dataset: {
        ...reportContent.dataset,
        select: [...(reportContent.dataset.select || []), newItem]
      }
    });
  };

  const getFieldDetails = (fieldId?: string, target?: string) => {
    if (target === "rows") return { schemaName: "Sistema", fieldName: "Linhas" };
    for (const schema of catalog?.schemas || []) {
      const field = schema.fields.find(f => f.id === fieldId);
      if (field) return { schemaName: schema.name, fieldName: field.name };
    }
    return { schemaName: "Unknown", fieldName: "Unknown" };
  };

  const handleSaveReport = async () => {
    if (!organizationId || !reportContent || !reportTitle.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    
    const contentToSave = { ...reportContent };
    contentToSave.dataset.groupBy = synchronizeGroupBy(contentToSave.dataset.select || [], catalog);
    if (contentToSave.dataset.where?.conditions) {
      contentToSave.dataset.where.conditions = normalizeWhereValues(contentToSave.dataset.where.conditions);
    }
    
    const req = {
      title: reportTitle.trim(),
      visibilityScope,
      organizationId,
      content: {
        ...contentToSave,
        dataset: {
          ...contentToSave.dataset,
          dataSourceId: selectedDataSourceId
        }
      }
    };
    
    let res;
    if (reportId) {
      res = await creatorApi.updateReport(reportId, req);
    } else {
      res = await creatorApi.createReport(req);
    }
    
    setIsSaving(false);
    
    if (isErr(res)) {
      setSaveError(res.error.detail || "Erro ao salvar relatório.");
    } else {
      setShowSaveModal(false);
      navigate(`/organizations/${organizationId}/creator`);
    }
  };

  // UI: DataSource Selection Screen
  if (!selectedDataSourceId && !reportId) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <main style={{ maxWidth: "800px", width: "100%", margin: "4rem auto", padding: "0 1.5rem", flex: 1 }}>
          <div className="card">
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Database size={24} style={{ color: "var(--primary-500)" }} />
              Selecione o DataSource
            </h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
              Para criar um novo relatório, primeiro escolha qual fonte de dados servirá como base.
            </p>
            {errorMsg && <div style={{ marginBottom: "1.5rem" }}><Alert type="error" message={errorMsg} /></div>}
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}><NeutralLoader /></div>
            ) : availableDataSources.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", background: "var(--background-color)", borderRadius: "8px" }}>
                <p style={{ color: "var(--text-secondary)" }}>Nenhum DataSource disponível.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {availableDataSources.map(ds => (
                  <button key={ds.id} className="btn btn-secondary" style={{ justifyContent: "flex-start", padding: "1rem", textAlign: "left", width: "100%" }} onClick={() => handleSelectDataSource(ds.id)}>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text-color)" }}>{ds.name}</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Provedor: {ds.provider}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // WIZARD RENDERING
  const renderBreadcrumbs = () => {
    const steps = [
      { id: 1, label: "Tabelas" },
      { id: 2, label: "Colunas" },
      { id: 3, label: "Filtros & Ordenação" },
      { id: 4, label: "Preview" }
    ];
    
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "1rem 1.5rem", background: "var(--surface-color)", borderBottom: "1px solid var(--border-color)" }}>
        {steps.map((s, idx) => {
          const isActive = currentStep === s.id;
          const isPassed = currentStep > s.id;
          const isClickable = s.id === 1 || (s.id === 2 && selectedSchemaIds.length > 0) || (s.id === 3 && (reportContent?.dataset.select.length || 0) > 0) || (s.id === 4 && (reportContent?.dataset.select.length || 0) > 0);
          
          return (
            <React.Fragment key={s.id}>
              <div 
                style={{ 
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  color: isActive ? "var(--primary-400)" : isPassed ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: isActive ? 600 : 400,
                  cursor: isClickable ? "pointer" : "not-allowed",
                  opacity: isClickable ? 1 : 0.5
                }}
                onClick={() => isClickable && setCurrentStep(s.id as any)}
              >
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: isActive ? "var(--primary-500)" : isPassed ? "var(--bg-input)" : "transparent", border: `1px solid ${isActive || isPassed ? "var(--primary-500)" : "var(--border-color)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: isActive || isPassed ? "#fff" : "inherit" }}>
                  {isPassed ? <Check size={14} color="#fff" /> : s.id}
                </div>
                {s.label}
              </div>
              {idx < steps.length - 1 && <ChevronRight size={16} style={{ color: "var(--border-color)" }} />}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderSearchBox = (value: string, onChange: (val: string) => void) => (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
      <div style={{ position: "relative" }}>
        <input 
          type="text" 
          placeholder="Buscar..."
          className="form-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={value ? { paddingRight: "2.5rem" } : {}}
        />
        {value && (
          <button onClick={() => onChange("")} style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0.2rem", display: "flex", alignItems: "center", justifyContent: "center" }} title="Limpar busca">
            <X size={16} />
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", padding: "0 0.25rem" }}>
        <button onClick={() => setMatchCase(!matchCase)} style={{ background: matchCase ? "rgba(168, 85, 247, 0.2)" : "transparent", color: matchCase ? "var(--accent)" : "var(--text-muted)", border: `1px solid ${matchCase ? "var(--accent-border)" : "var(--border-color)"}`, borderRadius: "4px", padding: "0.15rem 0.4rem", fontSize: "0.7rem", cursor: "pointer", fontWeight: 600 }} title="Diferenciar Maiúsculas/Minúsculas">Aa</button>
        <button onClick={() => setExactMatch(!exactMatch)} style={{ background: exactMatch ? "rgba(168, 85, 247, 0.2)" : "transparent", color: exactMatch ? "var(--accent)" : "var(--text-muted)", border: `1px solid ${exactMatch ? "var(--accent-border)" : "var(--border-color)"}`, borderRadius: "4px", padding: "0.15rem 0.4rem", fontSize: "0.7rem", cursor: "pointer", fontWeight: 600 }} title="Palavra Inteira (Expressão Exata)">ab</button>
      </div>
    </div>
  );

  const renderStep1 = () => {
    // Determine the groups based on current selection
    const isBaseSelected = selectedSchemaIds.length > 0;
    
    let selectedGroup: DesignerSchema[] = [];
    let availableGroup: DesignerSchema[] = [];

    (catalog?.schemas || []).forEach(s => {
      if (selectedSchemaIds.includes(s.id)) {
        // Selecionadas sempre aparecem
        selectedGroup.push(s);
      } else if (!isBaseSelected) {
        // Nada selecionado ainda: mostra todas disponíveis, respeitando o filtro
        if (!schemaSearch || matchStr(s.name, schemaSearch)) {
          availableGroup.push(s);
        }
      } else {
        // Já tem base selecionada
        if (canSelectSchema(s.id)) {
          // Opções de Join aparecem independente do filtro (conforme pedido)
          availableGroup.push(s);
        }
        // Incompatíveis são ignorados (não aparecem)
      }
    });

    const renderSchemaCard = (s: DesignerSchema, isSelected: boolean, isDisabled: boolean) => {
      const isBase = s.id === selectedSchemaIds[0];
      return (
        <div 
          key={s.id} 
          onClick={() => !isDisabled && handleToggleSchema(s.id)}
          style={{ 
            background: isSelected ? "rgba(168, 85, 247, 0.1)" : "var(--surface-color)", 
            border: `1px solid ${isSelected ? "var(--primary-500)" : "var(--border-color)"}`, 
            padding: "1rem", borderRadius: "8px", cursor: isDisabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
            opacity: isDisabled ? 0.4 : 1
          }}
          title={isDisabled ? "Esta tabela não possui relação (Join) com a Tabela Base selecionada." : ""}
        >
          <div>
            <div style={{ fontWeight: 600, color: isSelected ? "var(--text-primary)" : "var(--text-secondary)" }}>{s.name}</div>
            {isBase && <div style={{ fontSize: "0.75rem", color: "var(--primary-500)", marginTop: "0.2rem", fontWeight: 600 }}>Tabela Base</div>}
            {isSelected && !isBase && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Tabela Relacionada (Join)</div>}
            {isDisabled && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Sem relação com a base</div>}
          </div>
          <div style={{ width: "20px", height: "20px", borderRadius: "4px", border: `1px solid ${isSelected ? "var(--primary-500)" : "var(--border-color)"}`, background: isSelected ? "var(--primary-500)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {isSelected && <Check size={14} color="#fff" />}
          </div>
        </div>
      );
    };

    return (
      <div style={{ width: "100%", height: "100%", overflowY: "auto", padding: "1.5rem" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", paddingBottom: "2rem" }}>
          <h3 style={{ marginBottom: "0.5rem", fontWeight: 600 }}>Tabelas</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
            {!isBaseSelected 
              ? "Selecione a tabela principal (Base) para iniciar a construção do relatório." 
              : "Agora selecione as tabelas relacionadas que farão Join automático com a tabela base."}
          </p>
        
        {renderSearchBox(schemaSearch, setSchemaSearch)}
        
        {isBaseSelected && selectedGroup.length > 0 && (
          <div style={{ marginBottom: "2rem" }}>
            <h4 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Selecionadas</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
              {selectedGroup.map(s => renderSchemaCard(s, true, false))}
            </div>
          </div>
        )}

        {availableGroup.length > 0 && (
          <div style={{ marginBottom: "2rem" }}>
            {isBaseSelected && <h4 style={{ fontSize: "0.9rem", color: "var(--primary-400)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Opções de Join Disponíveis</h4>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
              {availableGroup.map(s => renderSchemaCard(s, false, false))}
            </div>
          </div>
        )}
        
        <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-primary" disabled={selectedSchemaIds.length === 0} onClick={() => setCurrentStep(2)}>
            Próximo: Escolher Colunas
          </button>
        </div>
        </div>
      </div>
    );
  };

  const renderStep2 = () => {
    const activeSchemas = (catalog?.schemas || []).filter(s => selectedSchemaIds.includes(s.id));
    
    return (
      <div style={{ display: "flex", height: "100%", gap: "2rem", width: "100%", padding: "1.5rem" }}>
        {/* Left: Fields List */}
        <div style={{ width: "350px", display: "flex", flexDirection: "column", borderRight: "1px solid var(--border-color)", paddingRight: "1rem" }}>
          <h3 style={{ marginBottom: "0.5rem", fontWeight: 600 }}>Campos Disponíveis</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", fontSize: "0.85rem" }}>
            Clique no + para adicionar como coluna.
          </p>
          {renderSearchBox(fieldSearch, setFieldSearch)}
          <div style={{ flex: 1, overflowY: "auto", paddingRight: "0.5rem" }}>
            {activeSchemas.map(s => {
              const fields = s.fields.filter(f => !fieldSearch || matchStr(f.name, fieldSearch) || matchStr(s.name, fieldSearch));
              if (fields.length === 0) return null;
              const isExpanded = expandedSchemas[s.id] || fieldSearch;
              return (
                <div key={s.id} style={{ marginBottom: "0.5rem" }}>
                  <button onClick={() => setExpandedSchemas(prev => ({ ...prev, [s.id]: !prev[s.id] }))} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem", background: isExpanded ? "rgba(255, 255, 255, 0.05)" : "transparent", border: "none", borderRadius: "6px", cursor: "pointer", textAlign: "left", color: "var(--text)" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{s.name}</span>
                    <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>{isExpanded ? "▼" : "▶"}</span>
                  </button>
                  {isExpanded && (
                    <div style={{ paddingLeft: "1.25rem", paddingRight: "0.5rem", marginTop: "0.25rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {fields.map(f => (
                        <div key={f.id} style={{ padding: "0.3rem 0", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)" }}>
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "70%" }} title={f.name}>{f.name}</span>
                          <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "60%" }}>
                            {availableAggregations(f).length > 0 && (
                              <select
                                className="form-input"
                                style={{ padding: "0.1rem 0.5rem", fontSize: "0.7rem", height: "auto", border: "1px solid var(--primary-500)", color: "var(--primary-500)", background: "rgba(168, 85, 247, 0.05)", borderRadius: "4px", width: "auto", cursor: "pointer" }}
                                value=""
                                onChange={(e) => { if (e.target.value) handleAddFieldToSelect(s, f, e.target.value); }}
                              >
                                <option value="">+ Agreg.</option>
                                {availableAggregations(f).map(agg => (
                                  <option key={agg} value={agg}>{agg === "count_distinct" ? "DISTINCT" : agg.toUpperCase()}</option>
                                ))}
                              </select>
                            )}
                            <button className="btn-icon" style={{ padding: "0.2rem" }} title="Adicionar" onClick={() => handleAddFieldToSelect(s, f)}>
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Columns */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <h3 style={{ marginBottom: "0.5rem", fontWeight: 600 }}>Colunas Selecionadas</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", fontSize: "0.85rem" }}>
            Estas colunas aparecerão no seu relatório.
          </p>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {(!reportContent?.dataset.select || reportContent.dataset.select.length === 0) ? (
              <div style={{ padding: "3rem", textAlign: "center", background: "var(--surface-color)", borderRadius: "8px", border: "1px dashed var(--border-color)" }}>
                <p style={{ color: "var(--text-secondary)" }}>Nenhuma coluna selecionada.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "600px", paddingBottom: "1rem" }}>
                {reportContent.dataset.select.map((col, index) => {
                  const details = getFieldDetails(col.fieldId, (col as any).target);
                  return (
                    <div key={`${col.fieldId}-${index}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-color)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                          {col.aggregation ? <span style={{ color: "var(--primary-500)", marginRight: "0.3rem", fontSize: "0.8rem", padding: "0.1rem 0.3rem", border: "1px solid var(--primary-500)", borderRadius: "4px" }}>{col.aggregation === "count_distinct" ? "DISTINCT" : col.aggregation.toUpperCase()}</span> : null}
                          {details.fieldName}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                          {details.schemaName} {col.joinAlias ? `(Join: ${col.joinAlias})` : "(Base)"}
                        </div>
                      </div>
                      <button className="btn-icon" style={{ padding: "0.3rem", color: "var(--danger-500)" }} title="Remover" onClick={() => {
                        const newContent = { ...reportContent };
                        newContent.dataset.select = newContent.dataset.select.filter((_, i) => i !== index);
                        setReportContent(newContent);
                      }}>
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <button 
              className="btn btn-secondary" 
              style={{ alignSelf: "flex-start", marginTop: "1rem" }}
              onClick={() => {
                if (!reportContent) return;
                const newSelect = [...(reportContent.dataset.select || []), { target: "rows", aggregation: "count", alias: "Quantidade de Registros" } as any];
                setReportContent({ ...reportContent, dataset: { ...reportContent.dataset, select: newSelect } });
              }}
            >
              + Adicionar Contagem de Registros
            </button>
          </div>
          
          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end", gap: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
            <button className="btn btn-secondary" onClick={() => setCurrentStep(1)}>Voltar</button>
            <button className="btn btn-primary" disabled={!reportContent?.dataset.select?.length} onClick={() => setCurrentStep(3)}>
              Próximo: Filtros & Ordenação
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    const activeSchemas = (catalog?.schemas || []).filter(s => selectedSchemaIds.includes(s.id));
    
    const filterFieldOptions: { label: string; fieldId: string; joinAlias: string }[] = [];
    const orderByFieldOptions: { label: string; fieldId: string; joinAlias: string; aggregation?: string }[] = [];

    activeSchemas.forEach(s => {
      let joinAlias = "";
      if (reportContent && s.id !== reportContent.dataset.schemaId) {
        const directJoin = catalog?.joins.find(j => j.fromSchemaId === reportContent.dataset.schemaId && j.toSchemaId === s.id);
        if (directJoin) {
          const existingJoin = reportContent.dataset.joins?.find(j => j.joinTemplateId === directJoin.joinTemplateId);
          if (existingJoin) joinAlias = existingJoin.alias;
        }
      }
      s.fields.forEach(f => {
        if (f.filterable !== false) {
          filterFieldOptions.push({
            label: `${f.name} (${s.name}${joinAlias ? ` - ${joinAlias}` : ''})`,
            fieldId: f.id,
            joinAlias
          });
        }
        if (f.sortable !== false) {
          const item = { fieldId: f.id, joinAlias };
          const currentGroupBy = synchronizeGroupBy(reportContent?.dataset.select || [], catalog);
          const compat = validateOrderBy(item, reportContent?.dataset.select || [], currentGroupBy, f);
          if (compat.compatible) {
            orderByFieldOptions.push({
              label: `${f.name} (${s.name}${joinAlias ? ` - ${joinAlias}` : ''})`,
              fieldId: f.id,
              joinAlias
            });
          }
        }
      });
    });

    reportContent?.dataset.select?.forEach(sel => {
      if (sel.aggregation) {
        if ((sel as any).target === "rows") {
          orderByFieldOptions.push({
            label: `${sel.aggregation.toUpperCase()}: ${sel.alias || "Linhas"} (Sistema)`,
            fieldId: "ROWS",
            joinAlias: "",
            aggregation: sel.aggregation
          });
          return;
        }

        // Encontrar nome do campo original
        let fieldName = "Desconhecido";
        let schemaName = "Desconhecido";
        let schemaId = reportContent.dataset.schemaId;
        if (sel.joinAlias) {
          const joinInfo = reportContent.dataset.joins?.find(j => j.alias === sel.joinAlias);
          if (joinInfo) {
            const joinTemplate = catalog?.joins.find(j => j.joinTemplateId === joinInfo.joinTemplateId);
            if (joinTemplate) schemaId = joinTemplate.toSchemaId;
          }
        }
        const schema = catalog?.schemas.find(s => s.id === schemaId);
        let field: any = null;
        if (schema) {
          schemaName = schema.name;
          field = schema.fields.find(f => f.id === sel.fieldId);
          if (field) fieldName = field.name;
        }

        if (field) {
          const item = { fieldId: sel.fieldId, joinAlias: sel.joinAlias || "", aggregation: sel.aggregation };
          const currentGroupBy = synchronizeGroupBy(reportContent?.dataset.select || [], catalog);
          const compat = validateOrderBy(item, reportContent?.dataset.select || [], currentGroupBy, field);
          if (compat.compatible) {
            orderByFieldOptions.push({
              label: `${sel.aggregation.toUpperCase()}: ${fieldName} (${schemaName}${sel.joinAlias ? ` - ${sel.joinAlias}` : ''})`,
              fieldId: sel.fieldId,
              joinAlias: sel.joinAlias || "",
              ...({ aggregation: sel.aggregation })
            } as any);
          }
        }
      }
    });

    const conditions = reportContent?.dataset.where?.conditions || [];
    const orderBys = reportContent?.dataset.orderBy || [];

    const handleAddFilter = () => {
      if (!reportContent || filterFieldOptions.length === 0) return;
      const newFilter = { fieldId: filterFieldOptions[0].fieldId, joinAlias: filterFieldOptions[0].joinAlias, operator: "=", value: "" };
      
      const newWhere = reportContent.dataset.where 
        ? { ...reportContent.dataset.where, conditions: [...(reportContent.dataset.where.conditions || []), newFilter] }
        : { operator: "and", conditions: [newFilter] };
        
      setReportContent({ ...reportContent, dataset: { ...reportContent.dataset, where: newWhere } });
    };

    const handleUpdateFilter = (index: number, key: string, value: any) => {
      if (!reportContent?.dataset.where?.conditions) return;
      const newConditions = [...reportContent.dataset.where.conditions];
      
      if (key === "field") {
        const [fieldId, joinAlias] = value.split("|");
        newConditions[index] = { ...newConditions[index], fieldId, joinAlias: joinAlias || undefined };
      } else {
        newConditions[index] = { ...newConditions[index], [key]: value };
      }
      
      setReportContent({ ...reportContent, dataset: { ...reportContent.dataset, where: { ...reportContent.dataset.where, conditions: newConditions } } });
    };

    const handleRemoveFilter = (index: number) => {
      if (!reportContent?.dataset.where?.conditions) return;
      const newConditions = reportContent.dataset.where.conditions.filter((_, i) => i !== index);
      setReportContent({ ...reportContent, dataset: { ...reportContent.dataset, where: { ...reportContent.dataset.where, conditions: newConditions } } });
    };

    const handleAddOrderBy = () => {
      if (!reportContent || orderByFieldOptions.length === 0) return;
      const opt = orderByFieldOptions[0] as any;
      const newOrder: any = { fieldId: opt.fieldId, joinAlias: opt.joinAlias, direction: "asc" as "asc" | "desc" };
      if (opt.aggregation) newOrder.aggregation = opt.aggregation;
      setReportContent({ ...reportContent, dataset: { ...reportContent.dataset, orderBy: [...(reportContent.dataset.orderBy || []), newOrder] } });
    };

    const handleUpdateOrderBy = (index: number, key: string, value: any) => {
      if (!reportContent?.dataset.orderBy) return;
      const newOrderBys = [...reportContent.dataset.orderBy];
      
      if (key === "field") {
        const [fieldId, joinAlias, aggregation] = value.split("|");
        if (fieldId === "ROWS") {
          newOrderBys[index] = { ...newOrderBys[index], target: "rows", aggregation: aggregation || "count" };
          delete newOrderBys[index].fieldId;
          delete newOrderBys[index].joinAlias;
        } else {
          newOrderBys[index] = { ...newOrderBys[index], fieldId, joinAlias: joinAlias || undefined };
          if (aggregation && aggregation !== "undefined") {
            newOrderBys[index].aggregation = aggregation;
          } else {
            delete newOrderBys[index].aggregation;
          }
          delete newOrderBys[index].target;
        }
      } else {
        newOrderBys[index] = { ...newOrderBys[index], [key]: value };
      }
      
      setReportContent({ ...reportContent, dataset: { ...reportContent.dataset, orderBy: newOrderBys } });
    };

    const handleRemoveOrderBy = (index: number) => {
      if (!reportContent?.dataset.orderBy) return;
      const newOrderBys = reportContent.dataset.orderBy.filter((_, i) => i !== index);
      setReportContent({ ...reportContent, dataset: { ...reportContent.dataset, orderBy: newOrderBys } });
    };

    return (
      <div style={{ width: "100%", height: "100%", overflowY: "auto", padding: "1.5rem" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", paddingBottom: "2rem" }}>
          
          <div style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ marginBottom: "0.25rem", fontWeight: 600 }}>Filtros (WHERE)</h3>
                <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>
                  Adicione condições para restringir os resultados do relatório.
                </p>
              </div>
              <button className="btn btn-secondary" onClick={handleAddFilter}>
                <Plus size={16} style={{ marginRight: "0.5rem" }} /> Adicionar Filtro
              </button>
            </div>
            
            {conditions.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", background: "var(--surface-color)", borderRadius: "8px", border: "1px dashed var(--border-color)" }}>
                <p style={{ color: "var(--text-secondary)" }}>Nenhum filtro aplicado. Todos os registros serão retornados.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {conditions.map((c, index) => {
                  let field: any = null;
                  const activeSchemas = (catalog?.schemas || []).filter(s => selectedSchemaIds.includes(s.id));
                  for (const s of activeSchemas) {
                    const f = s.fields.find((f: any) => f.id === c.fieldId);
                    if (f) {
                      field = f;
                      break;
                    }
                  }

                  const allowedOps = field?.allowedOperators || ["=", "!=", ">", "<", ">=", "<=", "like", "not like", "in", "isNull", "isNotNull", "between"];
                  const opLabel = (op: string) => {
                    const labels: Record<string, string> = {
                      "=": "Igual a (=)", "!=": "Diferente de (!=)", ">": "Maior que (>)", "<": "Menor que (<)",
                      ">=": "Maior ou igual (>=)", "<=": "Menor ou igual (<=)", "like": "Contém", "not like": "Não contém",
                      "in": "Na lista (IN)", "isNull": "É Nulo", "isNotNull": "Não é Nulo", "between": "Entre (Between)"
                    };
                    return labels[op] || op;
                  };

                  const isNoValue = c.operator === "isNull" || c.operator === "isNotNull";

                  return (
                    <div key={index} style={{ display: "flex", gap: "0.5rem", alignItems: "center", background: "var(--surface-color)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                      <span style={{ fontWeight: 600, color: "var(--primary-400)", minWidth: "40px", fontSize: "0.85rem" }}>
                        {index === 0 ? "WHERE" : "AND"}
                      </span>
                      <select 
                        className="form-input" 
                        style={{ flex: 2 }}
                        value={`${c.fieldId}|${c.joinAlias || ""}`}
                        onChange={(e) => handleUpdateFilter(index, "field", e.target.value)}
                      >
                        {filterFieldOptions.map(opt => <option key={`${opt.fieldId}|${opt.joinAlias}`} value={`${opt.fieldId}|${opt.joinAlias}`}>{opt.label}</option>)}
                      </select>
                      <select 
                        className="form-input" 
                        style={{ flex: 1 }}
                        value={c.operator}
                        onChange={(e) => handleUpdateFilter(index, "operator", e.target.value)}
                      >
                        {allowedOps.map((op: string) => <option key={op} value={op}>{opLabel(op)}</option>)}
                      </select>
                      {!isNoValue && (
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ flex: 2 }}
                          placeholder={c.operator === "in" || c.operator === "between" ? "Valores separados por vírgula..." : "Valor..."}
                          value={Array.isArray(c.value) ? c.value.join(", ") : (c.value as string || "")}
                          onChange={(e) => handleUpdateFilter(index, "value", e.target.value)}
                        />
                      )}
                      <button className="btn-icon" style={{ color: "var(--danger-500)" }} onClick={() => handleRemoveFilter(index)}>
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ marginBottom: "0.25rem", fontWeight: 600 }}>Ordenação (ORDER BY)</h3>
                <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>
                  Defina a ordem em que os resultados aparecerão.
                </p>
              </div>
              <button className="btn btn-secondary" onClick={handleAddOrderBy}>
                <Plus size={16} style={{ marginRight: "0.5rem" }} /> Adicionar Ordenação
              </button>
            </div>
            
            {orderBys.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", background: "var(--surface-color)", borderRadius: "8px", border: "1px dashed var(--border-color)" }}>
                <p style={{ color: "var(--text-secondary)" }}>Nenhuma ordenação aplicada. A ordem será padrão do banco.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {orderBys.map((o, index) => {
                  let field: any = null;
                  const activeSchemas = (catalog?.schemas || []).filter(s => selectedSchemaIds.includes(s.id));
                  for (const s of activeSchemas) {
                    const f = s.fields.find((f: any) => f.id === o.fieldId);
                    if (f) {
                      field = f;
                      break;
                    }
                  }

                  let compat: OrderByCompatibility = { compatible: true };
                  if (field) {
                    const currentGroupBy = synchronizeGroupBy(reportContent?.dataset.select || [], catalog);
                    compat = validateOrderBy(o, reportContent?.dataset.select || [], currentGroupBy, field);
                  }

                  const backendWarning = previewData?.warnings?.find((w: any) => w.code === "report_execution.order_by_ignored" && w.itemIndex === index);
                  
                  return (
                    <div key={index}>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", background: "var(--surface-color)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                        <span style={{ fontWeight: 600, color: "var(--primary-400)", minWidth: "40px", fontSize: "0.85rem" }}>
                          {index === 0 ? "ORDER BY" : "THEN BY"}
                        </span>
                        <select 
                          className="form-input" 
                          style={{ flex: 2, borderColor: (!compat.compatible || backendWarning) ? "var(--warning-500)" : undefined }}
                          value={`${(o as any).target === "rows" ? "ROWS" : o.fieldId}|${o.joinAlias || ""}|${o.aggregation || ""}`}
                          onChange={(e) => handleUpdateOrderBy(index, "field", e.target.value)}
                        >
                          {orderByFieldOptions.map((opt: any) => <option key={`${opt.fieldId}|${opt.joinAlias}|${opt.aggregation || ""}`} value={`${opt.fieldId}|${opt.joinAlias}|${opt.aggregation || ""}`}>{opt.label}</option>)}
                        </select>
                        <select 
                          className="form-input" 
                          style={{ flex: 1 }}
                          value={o.direction}
                          onChange={(e) => handleUpdateOrderBy(index, "direction", e.target.value as "asc" | "desc")}
                        >
                          <option value="asc">Ascendente (A-Z, 0-9)</option>
                          <option value="desc">Descendente (Z-A, 9-0)</option>
                        </select>
                        <button className="btn-icon" style={{ color: "var(--danger-500)" }} onClick={() => handleRemoveOrderBy(index)}>
                          <X size={16} />
                        </button>
                      </div>
                      {(!compat.compatible || backendWarning) && (
                        <div style={{ fontSize: "0.8rem", color: "var(--warning-500)", marginTop: "0.25rem", marginLeft: "0.25rem" }}>
                          {backendWarning ? backendWarning.message : `Campo ignorado ou incompatível com a forma atual da consulta (${compat.reason})`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between" }}>
              <button className="btn btn-secondary" onClick={() => setCurrentStep(2)}>Voltar</button>
              <button className="btn btn-primary" onClick={() => setCurrentStep(4)}>
                Próximo: Preview
              </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
    const handleExecutePreview = async () => {
      if (!organizationId || !reportContent) return;
      setPreviewLoading(true);
      setPreviewError(null);
      
      const contentForPreview = { ...reportContent };
      contentForPreview.dataset.groupBy = synchronizeGroupBy(contentForPreview.dataset.select || [], catalog);
      if (contentForPreview.dataset.where?.conditions) {
        contentForPreview.dataset.where.conditions = normalizeWhereValues(contentForPreview.dataset.where.conditions);
      }
      
      const req = {
        organizationId,
        content: contentForPreview,
        filters: [],
        page: 1,
        pageSize: 50
      };
      
      const res = await creatorApi.previewReport(req);
      if (isErr(res)) {
        setPreviewError(res.error.detail || "Erro ao gerar preview.");
      } else {
        setPreviewData(res.value);
      }
      setPreviewLoading(false);
    };

    const getColumnDisplayName = (col: any) => {
      if (!catalog || !reportContent) return col.alias;
      if (col.fieldId || col.target === "rows") {
        let schemaId = reportContent.dataset.schemaId;
        if (col.target === "rows") return col.alias || "Contagem de Linhas";
        if (col.joinAlias) {
          const joinInfo = reportContent.dataset.joins?.find(j => j.alias === col.joinAlias);
          if (joinInfo) {
            const joinTemplate = catalog.joins.find(j => j.joinTemplateId === joinInfo.joinTemplateId);
            if (joinTemplate) schemaId = joinTemplate.toSchemaId;
          }
        }
        const schema = catalog.schemas.find(s => s.id === schemaId);
        if (schema) {
          const field = schema.fields.find(f => f.id === col.fieldId);
          if (field) {
            return col.joinAlias ? `${field.name} (${schema.name})` : field.name;
          }
        }
      }
      return col.alias;
    };

    const formatCellValue = (val: any, type: string) => {
      if (val === null || val === undefined) return "";
      
      const typeLower = (type || "").toLowerCase();
      
      if (typeLower.includes("date") || typeLower.includes("timestamp") || typeLower.includes("time")) {
        try {
          const date = new Date(val);
          if (isNaN(date.getTime())) return String(val);
          if (typeLower === "date") {
            return date.toLocaleDateString("pt-BR");
          }
          return date.toLocaleString("pt-BR");
        } catch {
          return String(val);
        }
      }
      
      if (typeLower.includes("decimal") || typeLower.includes("numeric") || typeLower.includes("float") || typeLower.includes("double") || typeLower.includes("real") || typeLower.includes("number")) {
        try {
          return Number(val).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
        } catch {
          return String(val);
        }
      }
      
      if (typeLower.includes("int")) {
        try {
          return Number(val).toLocaleString("pt-BR");
        } catch {
          return String(val);
        }
      }
      
      if (typeof val === "boolean" || typeLower.includes("bool")) {
        return val ? "Sim" : "Não";
      }
      
      return String(val);
    };

    return (
      <div style={{ width: "100%", height: "100%", overflowY: "auto", padding: "1.5rem" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div>
              <h3 style={{ marginBottom: "0.25rem", fontWeight: 600 }}>Preview dos Dados</h3>
              <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.95rem" }}>
                Visualize o resultado parcial da query gerada.
              </p>
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowDevJson(!showDevJson)}
                title="Visualizar a estrutura declarativa que será enviada para a API"
              >
                {showDevJson ? "Ocultar JSON" : "Ver JSON Gerado"}
              </button>
              <button className="btn btn-primary" onClick={handleExecutePreview} disabled={previewLoading}>
                {previewLoading ? "Executando..." : "Executar Query"}
              </button>
            </div>
          </div>
          
          {showDevJson && reportContent && (
            <div style={{ marginBottom: "1.5rem", background: "#1e1e1e", borderRadius: "8px", border: "1px solid #444", overflow: "hidden", animation: "fadeIn 0.2s ease" }}>
              <div style={{ background: "#2d2d2d", padding: "0.5rem 1rem", borderBottom: "1px solid #444", color: "#e5e7eb", fontSize: "0.85rem", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Payload Declarativo (ReportContentV1)</span>
                <span style={{ fontSize: "0.75rem", color: "#999", fontWeight: 400 }}>Apenas visível para Creators</span>
              </div>
              <pre style={{ margin: 0, padding: "1rem", color: "#a6e22e", overflowX: "auto", fontSize: "0.85rem", maxHeight: "400px", overflowY: "auto" }}>
                {JSON.stringify({
                  ...reportContent, 
                  dataset: {
                    ...reportContent.dataset,
                    groupBy: synchronizeGroupBy(reportContent.dataset.select || [], catalog)
                  }
                }, null, 2)}
              </pre>
            </div>
          )}
          
          {previewError && (
            <div style={{ position: "relative", marginBottom: "1rem" }}>
              <Alert type="error" message={previewError} />
              <button 
                onClick={() => setPreviewError(null)} 
                style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.7 }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {previewData?.warnings && previewData.warnings.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              {previewData.warnings.map((w: any, idx: number) => (
                <div key={idx} style={{ marginBottom: idx < previewData.warnings!.length - 1 ? "0.5rem" : 0 }}>
                  <Alert type="warning" message={w.message} />
                </div>
              ))}
            </div>
          )}
          
          <div style={{ display: "flex", flexDirection: "column", background: "var(--surface-color)", borderRadius: "8px", border: "1px solid var(--border-color)", overflow: "hidden", minHeight: "300px" }}>
            {!previewData && !previewLoading && (
              <div style={{ padding: "4rem 2rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ color: "var(--text-secondary)" }}>Clique em Executar para visualizar os dados.</p>
              </div>
            )}
            
            {previewLoading && (
              <div style={{ padding: "4rem 2rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <NeutralLoader />
                <p style={{ marginTop: "1rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>Executando query no banco...</p>
              </div>
            )}
            
            {previewData && !previewLoading && (
              <div style={{ width: "100%", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead style={{ background: "var(--surface-color)" }}>
                    <tr>
                      {previewData.columns.map((col: any, idx: number) => (
                        <th key={idx} style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                          {getColumnDisplayName(col)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.length === 0 ? (
                      <tr>
                        <td colSpan={previewData.columns.length} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                          Nenhum registro retornado.
                        </td>
                      </tr>
                    ) : (
                      previewData.rows.map((row: any, rIdx: number) => (
                        <tr key={rIdx} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          {previewData.columns.map((col: any, cIdx: number) => (
                            <td key={cIdx} style={{ padding: "0.75rem 1rem", fontSize: "0.9rem", whiteSpace: "nowrap" }}>
                              {formatCellValue(row[col.alias], col.type)}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {previewData && !previewLoading && (
              <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border-color)", fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between", background: "rgba(0,0,0,0.1)" }}>
                <span>Mostrando {previewData.rows.length} de {previewData.rowCount} registros totais</span>
                <span>Tempo de execução: {previewData.durationMs}ms</span>
              </div>
            )}
          </div>
          <div style={{ 
            position: "sticky", 
            bottom: "-1.5rem", 
            padding: "1rem 0", 
            background: "var(--bg-primary)", 
            display: "flex", 
            justifyContent: "space-between",
            borderTop: "1px solid var(--border-color)",
            marginTop: "2rem",
            zIndex: 10
          }}>
              <button className="btn btn-secondary" onClick={() => setCurrentStep(3)}>Voltar</button>
              <button className="btn btn-primary" style={{ background: "var(--success-500)", border: "none" }} onClick={() => setShowSaveModal(true)}>Salvar Relatório</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Navbar />
      
      {errorMsg && (
        <div style={{ padding: "1rem 1.5rem", background: "var(--surface-color)", borderBottom: "1px solid var(--border-color)" }}>
          <Alert type="error" message={errorMsg} />
        </div>
      )}

      {/* Header toolbar */}
      <header style={{ background: "var(--surface-color)", borderBottom: "1px solid var(--border-color)", padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>Report Designer</h2>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{reportId ? "Editando" : "Novo Relatório"}</span>
        </div>
      </header>

      {renderBreadcrumbs()}

      <main style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </main>

      {showSaveModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div style={{ background: "var(--bg-primary)", padding: "2rem", borderRadius: "12px", width: "100%", maxWidth: "450px", border: "1px solid var(--border-color)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
            <h3 style={{ marginBottom: "1rem", fontWeight: 600, fontSize: "1.25rem" }}>Salvar Relatório</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
              Dê um nome ao seu relatório para salvá-lo no Creator Workspace.
            </p>
            
            {saveError && (
              <div style={{ marginBottom: "1rem" }}>
                <Alert type="error" message={saveError} />
              </div>
            )}
            
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem" }}>Nome do Relatório</label>
              <input 
                type="text" 
                className="form-input" 
                style={{ width: "100%" }} 
                value={reportTitle} 
                onChange={e => setReportTitle(e.target.value)} 
                placeholder="Ex: Análise de Vendas 2026" 
                autoFocus
              />
            </div>
            
            <div style={{ marginBottom: "2rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem" }}>Visibilidade</label>
              <select className="form-input" style={{ width: "100%" }} value={visibilityScope} onChange={e => setVisibilityScope(e.target.value as any)}>
                <option value="private">Privado (Apenas Eu)</option>
                <option value="organization">Organização (Compartilhado)</option>
                {isRoot && <option value="global">Global (Todo o Sistema)</option>}
              </select>
            </div>
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button className="btn btn-secondary" onClick={() => setShowSaveModal(false)} disabled={isSaving}>Cancelar</button>
              <button className="btn btn-primary" style={{ background: "var(--success-500)", border: "none" }} onClick={handleSaveReport} disabled={isSaving || !reportTitle.trim()}>
                {isSaving ? "Salvando..." : "Confirmar e Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
