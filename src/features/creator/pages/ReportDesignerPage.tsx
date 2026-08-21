import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Navbar } from "../../../shared/components/Navbar";
import { Alert, KNOWN_ERROR_CODES } from "../../../shared/components/Alert";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { creatorApi } from "../api/creatorApi";
import { isErr } from "../../../shared/result/result";
import type { ReportContentV1, DesignerCatalog, DesignerSchema, DesignerField, CreatorDataSourceOption, DateGranularity, ReportDetail } from "../types/creatorTypes";
import { Database, Plus, X, ChevronRight, Check, Filter, ChevronDown, ArrowUpDown } from "lucide-react";
import { useAuth } from "../../auth/context/AuthContext";
import { FilterRow } from "../components/FilterRow";
import { FilterEditorModal } from "../components/FilterEditorModal";
import { OrderBySummaryRow } from "../components/OrderBySummaryRow";
import { OrderByEditorModal, type OrderByDraft } from "../components/OrderByEditorModal";
import { ParameterEditor } from "../components/ParameterEditor";
import { ExecutionParameterForm } from "../components/ExecutionParameterForm";
import { ReportPresentationRenderer } from "../components/ReportPresentationRenderer";
import { ReportPresentationEditor } from "../components/ReportPresentationEditor";
import { ReportAccessBlockPanel } from "../components/ReportAccessBlockPanel";
import { requiredParametersMissing, validateParameters } from "../utils/parameterUtils";
import { collectParameterReferences, removeEmptyLogicalGroups, removeOrphanParameters } from "../utils/filterParameterUtils";
import { defaultAggregationAlias, fillMissingColumnAliases, nextAvailableAlias, validateColumnAliases } from "../utils/columnAliasUtils";
import { synchronizeGroupedTableOrderBy, validateReportPresentation } from "../utils/reportPresentationUtils";
import type { ReportParameterDefinition, WhereNode } from "../types/creatorTypes";



function availableAggregations(field: DesignerField): string[] {
  if (!field.aggregatable) return [];
  return field.allowedAggregations || [];
}

function resolveCatalogFieldName(fieldId: string | undefined, joinAlias: string | undefined, content: ReportContentV1, catalog: DesignerCatalog): string {
  if (!fieldId) return "Coluna";
  let schemaId = content.dataset.schemaId;
  if (joinAlias) {
    const selectedJoin = content.dataset.joins?.find((join) => join.alias === joinAlias);
    const template = selectedJoin && catalog.joins.find((join) => join.joinTemplateId === selectedJoin.joinTemplateId);
    if (template) schemaId = template.toSchemaId;
  }
  const schema = catalog.schemas.find((item) => item.id === schemaId);
  return schema?.fields.find((field) => field.id === fieldId)?.name
    || catalog.schemas.flatMap((item) => item.fields).find((field) => field.id === fieldId)?.name
    || "Coluna";
}

function synchronizeGroupBy(select: any[], catalog: DesignerCatalog | null): any[] {
  const hasAggregation = select.some(item => Boolean(item.aggregation));
  if (!hasAggregation || !catalog) return [];

  const seen = new Set<string>();
  const groupBy: any[] = [];

  for (const item of select) {
    if (item.aggregation) continue;
    const key = `${item.joinAlias ?? ""}:${item.fieldId}:${item.dateGranularity ?? ""}`;
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
      groupBy.push({ fieldId: item.fieldId, joinAlias: item.joinAlias, ...(item.dateGranularity ? { dateGranularity: item.dateGranularity } : {}) });
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
  return `${reference.joinAlias?.trim() ?? ""}:${reference.fieldId}:${reference.dateGranularity ?? ""}`;
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

import { getFieldTypeInfo, formatDateTimeValue } from "../utils/dateUtils";

function normalizeWhereValues(conditions: any[], catalog?: DesignerCatalog | null, baseSchemaId?: string, joins?: any[]): any[] {
  let newConditions: any[] = [];
  
  conditions.forEach(c => {
    if (Array.isArray(c.conditions)) {
      newConditions.push({ ...c, conditions: normalizeWhereValues(c.conditions, catalog, baseSchemaId, joins) });
      return;
    }
    const isNoValue = c.operator === "isNull" || c.operator === "isNotNull";
    if (isNoValue) {
      const rest = { ...c };
      delete rest.value;
      newConditions.push(rest);
      return;
    }

    let val = c.value;

    if (c.operator === "in" || c.operator === "between") {
      if (typeof val === "string") {
        val = val.split(",").map((s: string) => s.trim()).filter(Boolean);
        val = c.operator === "between" ? val.slice(0, 2) : val;
      }
    }

    const fieldType = getFieldTypeInfo(c.fieldId || "", c.joinAlias, catalog, baseSchemaId, joins);

    // Format dates correctly based on field type
    if (Array.isArray(val)) {
      val = val.map((v, idx) => {
        if (typeof v === "string") {
          // If it's between and the second value, treat it as endDate
          const isEnd = c.operator === "between" && idx === 1;
          return formatDateTimeValue(v, fieldType, isEnd);
        }
        return v;
      });
    } else if (typeof val === "string") {
      val = formatDateTimeValue(val, fieldType);
      
      // Attempt parsing number/boolean for single values if it's not a date/time type
      if (fieldType === "string" && c.operator !== "in" && c.operator !== "between") {
        const vTrim = val.trim();
        if (vTrim === "true") val = true;
        else if (vTrim === "false") val = false;
        else if (!isNaN(Number(vTrim)) && vTrim !== "") val = Number(vTrim);
      }
    }

    // Special expansion for datetime with "="
    if (fieldType === "datetime" && c.operator === "=" && typeof val === "string" && !val.startsWith("{{")) {
      newConditions.push({
        operator: "and",
        conditions: [
          { fieldId: c.fieldId, joinAlias: c.joinAlias, operator: ">=", value: val },
          { fieldId: c.fieldId, joinAlias: c.joinAlias, operator: "<", value: formatDateTimeValue(c.value, fieldType, true) }
        ]
      });
      return;
    }
    
    newConditions.push({ ...c, value: val });
  });
  
  return newConditions;
}

function collectParameterNames(value: unknown, result = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((item) => collectParameterNames(item, result));
  else if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (typeof object.parameter === "string") result.add(object.parameter);
    else Object.values(object).forEach((item) => collectParameterNames(item, result));
  }
  return result;
}

export const ReportDesignerPage: React.FC = () => {
  const { organizationId, reportId } = useParams<{ organizationId: string; reportId?: string }>();
  const navigate = useNavigate();
  const { state } = useAuth();
  const isRoot = state.user?.globalRole === "root";

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editBlockedReport, setEditBlockedReport] = useState<ReportDetail | null>(null);

  // Setup state
  const [availableDataSources, setAvailableDataSources] = useState<CreatorDataSourceOption[]>([]);
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string>("");
  
  // Designer state
  const [catalog, setCatalog] = useState<DesignerCatalog | null>(null);
  const [reportContent, setReportContent] = useState<ReportContentV1 | null>(null);
  const [previewParameters, setPreviewParameters] = useState<Record<string, unknown>>({});
  
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
  const [showConfirmChangeBase, setShowConfirmChangeBase] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [visibilityScope, setVisibilityScope] = useState<"private" | "organization" | "global">("private");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDevJson, setShowDevJson] = useState(false);

  // Step 3 UI state
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [filterEditorIndex, setFilterEditorIndex] = useState<number | "new" | null>(null);
  const [ordersExpanded, setOrdersExpanded] = useState(true);
  const [filterDragIdx, setFilterDragIdx] = useState<number | null>(null);
  const [filterDragOverIdx, setFilterDragOverIdx] = useState<number | null>(null);
  const [filterDragPos, setFilterDragPos] = useState<"above" | "below" | null>(null);
  const [orderDragIdx, setOrderDragIdx] = useState<number | null>(null);
  const [orderDragOverIdx, setOrderDragOverIdx] = useState<number | null>(null);
  const [orderDragPos, setOrderDragPos] = useState<"above" | "below" | null>(null);
  const [orderEditorIndex, setOrderEditorIndex] = useState<number | "new" | null>(null);

  // 1. Initial Load
  useEffect(() => {
    const loadInitialState = async () => {
      setLoading(true);
      setErrorMsg(null);
      setEditBlockedReport(null);

      if (!organizationId) {
        setErrorMsg("Organização não especificada.");
        setLoading(false);
        return;
      }

      let existingReport: ReportDetail | null = null;
      if (reportId) {
        const reportRes = await creatorApi.getReport(reportId);
        if (isErr(reportRes)) {
          setErrorMsg(reportRes.error.detail || "Erro ao carregar relatório.");
          setLoading(false);
          return;
        }
        existingReport = reportRes.value;
        if (existingReport.canEdit === false) {
          setEditBlockedReport(existingReport);
          setLoading(false);
          return;
        }
      }

      const dsRes = await creatorApi.getCreatorDataSources(organizationId);
      if (isErr(dsRes)) {
        setErrorMsg(dsRes.error.detail || "Erro ao carregar fontes de dados.");
        setLoading(false);
        return;
      }
      setAvailableDataSources(dsRes.value);

      if (existingReport) {
        const r = existingReport;
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
            setReportContent({ ...r.content, dataset: { ...r.content.dataset, select: fillMissingColumnAliases(r.content.dataset.select || [], (item) => resolveCatalogFieldName(item.fieldId, item.joinAlias, r.content, catRes.value)) } });
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

  if (loading && reportId) {
    return <div className="report-designer-loading-page">
      <Navbar />
      <main className="report-designer-loading" aria-live="polite" aria-busy="true">
        <NeutralLoader message="Carregando relatório..." minHeight="auto" />
      </main>
    </div>;
  }

  if (editBlockedReport && organizationId && reportId) {
    return <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ maxWidth: "960px", width: "100%", margin: "4rem auto", padding: "0 1.5rem", flex: 1 }}>
        <header style={{ marginBottom: "1.5rem" }}><span style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>Editor de relatório · {editBlockedReport.organizationName}</span><h1 style={{ margin: ".35rem 0 0" }}>{editBlockedReport.title}</h1></header>
        <ReportAccessBlockPanel
          blockedSchemas={editBlockedReport.blockedSchemas}
          title="Este relatório não pode ser editado"
          description="A edição exige acesso a todos os esquemas, campos e capacidades utilizados. Solicite a revisão ao administrador da organização."
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem", marginTop: "1.25rem" }}>
          <Link className="btn btn-secondary" to={`/organizations/${organizationId}/creator`}>Voltar ao workspace</Link>
          <Link className="btn btn-primary" to={`/reports/${reportId}/run`}>Abrir execução</Link>
        </div>
      </main>
    </div>;
  }

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
        parameters: [],
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

    const baseAlias = aggregation ? defaultAggregationAlias(aggregation, field.name) : field.name;
    const alias = nextAvailableAlias(baseAlias, (reportContent.dataset.select || []).flatMap((item) => item.alias ? [item.alias] : []));
    const newItem: any = { fieldId: field.id, joinAlias, alias };
    if (aggregation) {
      newItem.aggregation = aggregation;
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
    if (target === "rows") return { schemaName: "Sistema", fieldName: "Linhas", field: undefined };
    for (const schema of catalog?.schemas || []) {
      const field = schema.fields.find(f => f.id === fieldId);
      if (field) return { schemaName: schema.name, fieldName: field.name, field };
    }
    return { schemaName: "Unknown", fieldName: "Unknown", field: undefined };
  };

  const handleSaveReport = async () => {
    if (!organizationId || !reportContent || !reportTitle.trim()) return;
    const parameterErrors = validateParameters(reportContent.parameters || []);
    const aliasErrors = validateColumnAliases(reportContent.dataset.select || []);
    if (aliasErrors.size > 0) parameterErrors.push("Corrija os títulos das colunas antes de salvar.");
    const validationContent = synchronizeGroupedTableOrderBy({ ...reportContent, dataset: { ...reportContent.dataset, groupBy: synchronizeGroupBy(reportContent.dataset.select || [], catalog) } });
    const presentationError = validateReportPresentation(validationContent);
    if (presentationError) parameterErrors.push(presentationError);
    const declaredNames = new Set((reportContent.parameters || []).map((parameter) => parameter.name));
    const unknownReferences = [...collectParameterNames(reportContent.dataset.where)].filter((name) => !declaredNames.has(name));
    if (unknownReferences.length > 0) parameterErrors.push(`Parâmetros não declarados: ${unknownReferences.join(", ")}`);
    if (parameterErrors.length > 0) { setSaveError(parameterErrors.join(" • ")); return; }
    setIsSaving(true);
    setSaveError(null);
    
    const contentToSave = JSON.parse(JSON.stringify(reportContent));
    contentToSave.dataset.select = (contentToSave.dataset.select || []).map((item: any) => ({ ...item, alias: item.alias.trim() }));
    contentToSave.dataset.groupBy = synchronizeGroupBy(contentToSave.dataset.select || [], catalog);
    contentToSave.dataset.orderBy = synchronizeGroupedTableOrderBy(contentToSave).dataset.orderBy;
    if (contentToSave.dataset.where) {
      contentToSave.dataset.where.conditions = normalizeWhereValues(
        contentToSave.dataset.where.conditions || [],
        catalog,
        contentToSave.dataset.schemaId,
        contentToSave.dataset.joins
      );
      contentToSave.dataset.where = removeEmptyLogicalGroups(contentToSave.dataset.where);
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
      const knownError = res.error.code ? KNOWN_ERROR_CODES[res.error.code] : null;
      setSaveError(knownError?.message || res.error.detail || "Erro ao salvar relatório.");
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
        <main style={{ maxWidth: "1200px", width: "100%", margin: "4rem auto", padding: "0 1.5rem", flex: 1 }}>
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
      <div className="report-designer__steps" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "1rem 1.5rem", background: "var(--surface-color)", borderBottom: "1px solid var(--border-color)" }}>
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
        <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%", paddingBottom: "2rem" }}>
          <h3 style={{ marginBottom: "0.5rem", fontWeight: 600 }}>Tabelas</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
            {!isBaseSelected 
              ? "Selecione a tabela principal (Base) para iniciar a construção do relatório." 
              : "Agora selecione as tabelas relacionadas que farão Join automático com a tabela base."}
          </p>
        
        {renderSearchBox(schemaSearch, setSchemaSearch)}
        
        {isBaseSelected && selectedGroup.length > 0 && (
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h4 style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Selecionadas</h4>
              <button 
                className="btn btn-secondary" 
                style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem", minHeight: "auto", border: "1px solid var(--danger-500)", color: "var(--danger-500)", background: "rgba(239, 68, 68, 0.05)" }}
                onClick={() => setShowConfirmChangeBase(true)}
              >
                Trocar Tabela Base
              </button>
            </div>
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
                        <div key={f.id} style={{ padding: "0.3rem 0", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "0.5rem", alignItems: "center", borderBottom: "1px solid var(--border-color)" }}>
                          <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={f.name}>{f.name}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0, whiteSpace: "nowrap" }}>
                            {availableAggregations(f).length > 0 && (
                              <select
                                className="form-input"
                                style={{ padding: "0.2rem 1.4rem 0.2rem 0.45rem", fontSize: "0.7rem", height: "28px", border: "1px solid var(--primary-500)", color: "var(--primary-500)", background: "rgba(168, 85, 247, 0.05)", borderRadius: "4px", width: "86px", cursor: "pointer" }}
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
                  const aliasError = validateColumnAliases(reportContent.dataset.select).get(index);
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
                        <div style={{ marginTop: ".65rem", maxWidth: "340px" }}>
                          <label className="form-label" htmlFor={`column-alias-${index}`}>Título da coluna</label>
                          <input id={`column-alias-${index}`} className="form-input" value={col.alias || ""} aria-invalid={Boolean(aliasError)} onChange={(event) => {
                            const select = reportContent.dataset.select.map((item, itemIndex) => itemIndex === index ? { ...item, alias: event.target.value } : item);
                            setReportContent({ ...reportContent, dataset: { ...reportContent.dataset, select } });
                            setPreviewData(null);
                          }} />
                          {aliasError && <small role="alert" style={{ display: "block", color: "var(--danger-500)", marginTop: ".25rem" }}>{aliasError}</small>}
                        </div>
                        {!col.aggregation && (details.field?.type === "date" || details.field?.type === "datetime") && details.field.groupable && <div style={{ marginTop: ".65rem", maxWidth: "340px" }}>
                          <label className="form-label" htmlFor={`date-granularity-${index}`}>Agrupar data por</label>
                          <select id={`date-granularity-${index}`} className="form-input" value={col.dateGranularity || ""} onChange={(event) => {
                            const dateGranularity = event.target.value as DateGranularity | "";
                            const select = reportContent.dataset.select.map((item, itemIndex) => itemIndex === index
                              ? { ...item, dateGranularity: dateGranularity || undefined }
                              : item);
                            const orderBy = reportContent.dataset.orderBy?.map((item) => !item.aggregation && item.fieldId === col.fieldId && (item.joinAlias || "") === (col.joinAlias || "")
                              ? { ...item, dateGranularity: dateGranularity || undefined }
                              : item);
                            setReportContent({ ...reportContent, dataset: { ...reportContent.dataset, select, orderBy } });
                            setPreviewData(null);
                          }}>
                            <option value="">Data e hora original</option>
                            <option value="day">Dia</option>
                            <option value="month">Mês</option>
                            <option value="year">Ano</option>
                          </select>
                        </div>}
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
                const alias = nextAvailableAlias("Quantidade de Registros", (reportContent.dataset.select || []).flatMap((item) => item.alias ? [item.alias] : []));
                const newSelect = [...(reportContent.dataset.select || []), { target: "rows", aggregation: "count", alias } as any];
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
    
    const filterFieldOptions: { label: string; fieldId: string; joinAlias: string; group: string }[] = [];
    const orderByFieldOptions: { label: string; fieldId: string; joinAlias: string; aggregation?: string; dateGranularity?: DateGranularity; group: string }[] = [];

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
            joinAlias,
            group: s.name + (joinAlias ? ` (${joinAlias})` : '')
          });
        }
        if (f.sortable !== false) {
          const selectedDimension = reportContent?.dataset.select?.find((selected) => !selected.aggregation && selected.fieldId === f.id && (selected.joinAlias || "") === joinAlias);
          const item = { fieldId: f.id, joinAlias, dateGranularity: selectedDimension?.dateGranularity };
          const currentGroupBy = synchronizeGroupBy(reportContent?.dataset.select || [], catalog);
          const compat = validateOrderBy(item, reportContent?.dataset.select || [], currentGroupBy, f);
          if (compat.compatible) {
            orderByFieldOptions.push({
              label: `${selectedDimension?.dateGranularity ? `${{ day: "Dia", month: "Mês", year: "Ano" }[selectedDimension.dateGranularity]}: ` : ""}${f.name} (${s.name}${joinAlias ? ` - ${joinAlias}` : ''})`,
              fieldId: f.id,
              joinAlias,
              ...(selectedDimension?.dateGranularity ? { dateGranularity: selectedDimension.dateGranularity } : {}),
              group: s.name
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
            aggregation: sel.aggregation,
            group: "Resultados calculados"
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
              group: schemaName,
              ...({ aggregation: sel.aggregation })
            } as any);
          }
        }
      }
    });

    const conditions = reportContent?.dataset.where?.conditions || [];
    const orderBys = reportContent?.dataset.orderBy || [];
    const whereOperator = reportContent?.dataset.where?.operator || "and";
    const referencedNames = collectParameterNames(reportContent?.dataset.where);

    const handleAddFilter = () => {
      if (!reportContent || filterFieldOptions.length === 0) return;
      setFilterEditorIndex("new");
    };

    const handleSaveFilter = (result: { condition: WhereNode; parameters: ReportParameterDefinition[] }) => {
      if (!reportContent || filterEditorIndex === null) return;
      const previousConditions = reportContent.dataset.where?.conditions || [];
      const nextConditions = [...previousConditions];
      const oldCondition = filterEditorIndex === "new" ? undefined : nextConditions[filterEditorIndex];
      if (filterEditorIndex === "new") nextConditions.push(result.condition);
      else nextConditions[filterEditorIndex] = result.condition;
      const nextWhere: WhereNode = { ...(reportContent.dataset.where || { operator: "and" }), conditions: nextConditions };
      const oldReferences = collectParameterReferences(oldCondition);
      setReportContent({ ...reportContent, parameters: removeOrphanParameters(result.parameters, nextWhere, oldReferences), dataset: { ...reportContent.dataset, where: nextWhere } });
      setPreviewData(null);
      setFilterEditorIndex(null);
    };

    const handleRemoveFilter = (index: number) => {
      if (!reportContent?.dataset.where?.conditions) return;
      const oldCondition = reportContent.dataset.where.conditions[index];
      const newConditions = reportContent.dataset.where.conditions.filter((_, i) => i !== index);
      const nextWhere = { ...reportContent.dataset.where, conditions: newConditions };
      setReportContent({ ...reportContent, parameters: removeOrphanParameters(reportContent.parameters || [], nextWhere, collectParameterReferences(oldCondition)), dataset: { ...reportContent.dataset, where: nextWhere } });
      setPreviewData(null);
    };

    const handleDuplicateFilter = (index: number) => {
      if (!reportContent?.dataset.where?.conditions) return;
      const original = reportContent.dataset.where.conditions[index];
      const clone = JSON.parse(JSON.stringify(original));
      const newConditions = [...reportContent.dataset.where.conditions];
      newConditions.splice(index + 1, 0, clone);
      setReportContent({ ...reportContent, dataset: { ...reportContent.dataset, where: { ...reportContent.dataset.where, conditions: newConditions } } });
      setPreviewData(null);
    };

    const handleToggleWhereOperator = () => {
      if (!reportContent?.dataset.where) return;
      const newOp = reportContent.dataset.where.operator === "and" ? "or" : "and";
      setReportContent({ ...reportContent, dataset: { ...reportContent.dataset, where: { ...reportContent.dataset.where, operator: newOp } } });
      setPreviewData(null);
    };

    const handleReorderFilters = (fromIdx: number, toIdx: number) => {
      if (!reportContent?.dataset.where?.conditions || fromIdx === toIdx) return;
      const newConditions = [...reportContent.dataset.where.conditions];
      const [moved] = newConditions.splice(fromIdx, 1);
      newConditions.splice(toIdx, 0, moved);
      setReportContent({ ...reportContent, dataset: { ...reportContent.dataset, where: { ...reportContent.dataset.where, conditions: newConditions } } });
      setPreviewData(null);
      setFilterDragIdx(null);
      setFilterDragOverIdx(null);
      setFilterDragPos(null);
    };

    const handleFilterDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      setFilterDragOverIdx(index);
      setFilterDragPos(e.clientY < midY ? "above" : "below");
    };

    const handleFilterDrop = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (filterDragIdx === null) return;
      const targetIdx = filterDragPos === "below" ? index + 1 : index;
      const adjustedTarget = filterDragIdx < targetIdx ? targetIdx - 1 : targetIdx;
      handleReorderFilters(filterDragIdx, adjustedTarget);
    };

    const handleAddOrderBy = () => {
      if (!reportContent || orderByFieldOptions.length === 0) return;
      setOrderEditorIndex("new");
    };

    const handleSaveOrderBy = (draft: OrderByDraft) => {
      if (!reportContent || orderEditorIndex === null) return;
      const next = [...(reportContent.dataset.orderBy || [])];
      if (orderEditorIndex === "new") next.push(draft);
      else next[orderEditorIndex] = draft;
      setReportContent({ ...reportContent, dataset: { ...reportContent.dataset, orderBy: next } });
      setPreviewData(null);
      setOrderEditorIndex(null);
    };

    const handleRemoveOrderBy = (index: number) => {
      if (!reportContent?.dataset.orderBy) return;
      const newOrderBys = reportContent.dataset.orderBy.filter((_, i) => i !== index);
      setReportContent({ ...reportContent, dataset: { ...reportContent.dataset, orderBy: newOrderBys } });
    };

    const handleReorderOrderBys = (fromIdx: number, toIdx: number) => {
      if (!reportContent?.dataset.orderBy || fromIdx === toIdx) return;
      const newOrderBys = [...reportContent.dataset.orderBy];
      const [moved] = newOrderBys.splice(fromIdx, 1);
      newOrderBys.splice(toIdx, 0, moved);
      setReportContent({ ...reportContent, dataset: { ...reportContent.dataset, orderBy: newOrderBys } });
      setOrderDragIdx(null);
      setOrderDragOverIdx(null);
      setOrderDragPos(null);
    };

    const handleOrderDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      setOrderDragOverIdx(index);
      setOrderDragPos(e.clientY < midY ? "above" : "below");
    };

    const handleOrderDrop = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (orderDragIdx === null) return;
      const targetIdx = orderDragPos === "below" ? index + 1 : index;
      const adjustedTarget = orderDragIdx < targetIdx ? targetIdx - 1 : targetIdx;
      handleReorderOrderBys(orderDragIdx, adjustedTarget);
    };

    // Resolve field metadata for each filter row
    const resolveField = (fieldId: string) => {
      const activeSchemas = (catalog?.schemas || []).filter(s => selectedSchemaIds.includes(s.id));
      for (const s of activeSchemas) {
        const f = s.fields.find((f: any) => f.id === fieldId);
        if (f) return f;
      }
      return null;
    };

    return (
      <div style={{ width: "100%", height: "100%", overflowY: "auto", padding: "1.5rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%", paddingBottom: "2rem" }}>
          <ParameterEditor parameters={reportContent?.parameters || []} referencedNames={referencedNames} onChange={(parameters) => { if (reportContent) { setReportContent({ ...reportContent, parameters }); setPreviewData(null); } }} />
          
          {/* ===== FILTERS SECTION ===== */}
          <div style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div
                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
                onClick={() => setFiltersExpanded(!filtersExpanded)}
              >
                <ChevronDown
                  size={18}
                  style={{
                    color: "var(--text-secondary)",
                    transition: "transform 0.2s ease",
                    transform: filtersExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                  }}
                />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h3 style={{ marginBottom: "0.25rem", fontWeight: 600 }}>Filtros (WHERE)</h3>
                    {conditions.length > 0 && (
                      <span
                        style={{
                          background: "var(--primary-500)",
                          color: "#fff",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.1rem 0.45rem",
                          borderRadius: "10px",
                          minWidth: "20px",
                          textAlign: "center",
                        }}
                      >
                        {conditions.length}
                      </span>
                    )}
                  </div>
                  <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>
                    Adicione condições para restringir os resultados do relatório.
                  </p>
                </div>
              </div>
              <button className="btn btn-secondary" onClick={handleAddFilter}>
                <Plus size={16} style={{ marginRight: "0.5rem" }} /> Adicionar Filtro
              </button>
            </div>

            {/* AND/OR toggle */}
            {filtersExpanded && conditions.length >= 2 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Combinar filtros com:</span>
                <button
                  onClick={handleToggleWhereOperator}
                  style={{
                    padding: "0.2rem 0.6rem",
                    borderRadius: "6px",
                    border: "1px solid",
                    borderColor: whereOperator === "and" ? "var(--primary-500)" : "var(--warning-500, #f59e0b)",
                    background: whereOperator === "and" ? "rgba(99, 102, 241, 0.1)" : "rgba(245, 158, 11, 0.1)",
                    color: whereOperator === "and" ? "var(--primary-400)" : "var(--warning-500, #f59e0b)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    transition: "all 0.2s ease",
                  }}
                >
                  {whereOperator === "and" ? "AND — Todas devem ser verdadeiras" : "OR — Pelo menos uma deve ser verdadeira"}
                </button>
              </div>
            )}
            
            <div
              style={{
                overflow: filtersExpanded ? "visible" : "hidden",
                maxHeight: filtersExpanded ? "5000px" : "0px",
                transition: "max-height 0.3s ease",
              }}
            >
              {conditions.length === 0 ? (
                <div
                  style={{
                    padding: "2.5rem",
                    textAlign: "center",
                    background: "var(--surface-color)",
                    borderRadius: "8px",
                    border: "1px dashed var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <Filter size={32} style={{ color: "var(--text-secondary)", opacity: 0.5, animation: "pulse 2s ease-in-out infinite" }} />
                  <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                    Nenhum filtro aplicado. Todos os registros serão retornados.
                  </p>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: "0.85rem", padding: "0.4rem 1rem" }}
                    onClick={handleAddFilter}
                  >
                    <Plus size={14} style={{ marginRight: "0.25rem" }} /> Adicionar seu primeiro filtro
                  </button>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={() => { setFilterDragIdx(null); setFilterDragOverIdx(null); setFilterDragPos(null); }}
                >
                  {conditions.map((c, index) => {
                    const base = c.ui?.kind === "relativePeriod" ? c.conditions?.[0] : c;
                    const field = resolveField(base?.fieldId || "");

                    return (
                      <FilterRow
                        key={index}
                        index={index}
                        condition={c}
                        fieldName={field?.name || "Campo não encontrado"}
                        fieldType={field?.type || "string"}
                        parameters={reportContent?.parameters || []}
                        onEdit={setFilterEditorIndex}
                        onRemove={handleRemoveFilter}
                        onDuplicate={handleDuplicateFilter}
                        onDragStart={(i) => setFilterDragIdx(i)}
                        onDragOver={handleFilterDragOver}
                        onDrop={handleFilterDrop}
                        isDragOver={filterDragOverIdx === index && filterDragIdx !== index}
                        dragPosition={filterDragOverIdx === index ? filterDragPos : null}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {filterEditorIndex !== null && <FilterEditorModal
            condition={filterEditorIndex === "new" ? undefined : conditions[filterEditorIndex]}
            fieldOptions={filterFieldOptions}
            parameters={reportContent?.parameters || []}
            resolveField={resolveField}
            onClose={() => setFilterEditorIndex(null)}
            onSave={handleSaveFilter}
          />}

          {/* ===== ORDER BY SECTION ===== */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div
                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
                onClick={() => setOrdersExpanded(!ordersExpanded)}
              >
                <ChevronDown
                  size={18}
                  style={{
                    color: "var(--text-secondary)",
                    transition: "transform 0.2s ease",
                    transform: ordersExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                  }}
                />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h3 style={{ marginBottom: "0.25rem", fontWeight: 600 }}>Ordenação (ORDER BY)</h3>
                    {orderBys.length > 0 && (
                      <span
                        style={{
                          background: "var(--primary-500)",
                          color: "#fff",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.1rem 0.45rem",
                          borderRadius: "10px",
                          minWidth: "20px",
                          textAlign: "center",
                        }}
                      >
                        {orderBys.length}
                      </span>
                    )}
                  </div>
                  <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>
                    Defina a ordem em que os resultados aparecerão.
                  </p>
                </div>
              </div>
              <button className="btn btn-secondary" onClick={handleAddOrderBy}>
                <Plus size={16} style={{ marginRight: "0.5rem" }} /> Adicionar Ordenação
              </button>
            </div>
            
            <div
              style={{
                overflow: ordersExpanded ? "visible" : "hidden",
                maxHeight: ordersExpanded ? "5000px" : "0px",
                transition: "max-height 0.3s ease",
              }}
            >
              {orderBys.length === 0 ? (
                <div
                  style={{
                    padding: "2.5rem",
                    textAlign: "center",
                    background: "var(--surface-color)",
                    borderRadius: "8px",
                    border: "1px dashed var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <ArrowUpDown size={32} style={{ color: "var(--text-secondary)", opacity: 0.5, animation: "pulse 2s ease-in-out infinite" }} />
                  <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                    Nenhuma ordenação aplicada. A ordem será padrão do banco.
                  </p>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: "0.85rem", padding: "0.4rem 1rem" }}
                    onClick={handleAddOrderBy}
                  >
                    <Plus size={14} style={{ marginRight: "0.25rem" }} /> Adicionar sua primeira ordenação
                  </button>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={() => { setOrderDragIdx(null); setOrderDragOverIdx(null); setOrderDragPos(null); }}
                >
                  {orderBys.map((o, index) => {
                    const field = resolveField(o.fieldId || "");
                    let compat: OrderByCompatibility = { compatible: true };
                    if (field) {
                      const currentGroupBy = synchronizeGroupBy(reportContent?.dataset.select || [], catalog);
                      compat = validateOrderBy(o, reportContent?.dataset.select || [], currentGroupBy, field);
                    }
                    const backendWarning = previewData?.warnings?.find((w: any) => w.code === "report_execution.order_by_ignored" && w.itemIndex === index);

                    return (
                      <OrderBySummaryRow
                        key={index}
                        index={index}
                        orderBy={o as any}
                        options={orderByFieldOptions}
                        warning={backendWarning?.message || (!compat.compatible ? `Campo incompatível com a configuração atual (${compat.reason})` : undefined)}
                        onEdit={setOrderEditorIndex}
                        onRemove={handleRemoveOrderBy}
                        onDragStart={(i) => setOrderDragIdx(i)}
                        onDragOver={handleOrderDragOver}
                        onDrop={handleOrderDrop}
                        isDragOver={orderDragOverIdx === index && orderDragIdx !== index}
                        dragPosition={orderDragOverIdx === index ? orderDragPos : null}
                      />
                    );
                  })}
                </div>
              )}
            </div>
            {orderEditorIndex !== null && <OrderByEditorModal orderBy={orderEditorIndex === "new" ? undefined : orderBys[orderEditorIndex] as OrderByDraft} options={orderByFieldOptions} onClose={() => setOrderEditorIndex(null)} onSave={handleSaveOrderBy}/>}
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
      
      const contentForPreview = JSON.parse(JSON.stringify(reportContent));
      contentForPreview.dataset.groupBy = synchronizeGroupBy(contentForPreview.dataset.select || [], catalog);
      contentForPreview.dataset.orderBy = synchronizeGroupedTableOrderBy(contentForPreview).dataset.orderBy;
      if (contentForPreview.dataset.where) {
        contentForPreview.dataset.where.conditions = normalizeWhereValues(
          contentForPreview.dataset.where.conditions || [],
          catalog,
          contentForPreview.dataset.schemaId,
          contentForPreview.dataset.joins
        );
        contentForPreview.dataset.where = removeEmptyLogicalGroups(contentForPreview.dataset.where);
      }
      
      const req = {
        organizationId,
        content: contentForPreview,
        parameters: previewParameters,
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
              <button className="btn btn-primary" onClick={handleExecutePreview} disabled={previewLoading || requiredParametersMissing(reportContent?.parameters || [], previewParameters)}>
                {previewLoading ? "Executando..." : "Executar Query"}
              </button>
            </div>
          </div>
          {reportContent && (
            <ReportPresentationEditor presentation={reportContent.presentation} select={reportContent.dataset.select} groupBy={synchronizeGroupBy(reportContent.dataset.select || [], catalog)} groupedTableOptions={reportContent.dataset.select.filter((item) => !item.aggregation && getFieldDetails(item.fieldId, item.target).field?.sortable)} onChange={(presentation) => { setReportContent(synchronizeGroupedTableOrderBy({ ...reportContent, presentation })); setPreviewData(null); }}/>
          )}
          <div className="card" style={{ marginBottom: "1rem" }}><ExecutionParameterForm parameters={reportContent?.parameters || []} where={reportContent?.dataset.where} resolvedParameters={previewData?.resolvedParameters} values={previewParameters} onChange={(values) => { setPreviewParameters(values); setPreviewData(null); }} /></div>
          
          {showDevJson && reportContent && (
            <div style={{ marginBottom: "1.5rem", background: "#1e1e1e", borderRadius: "8px", border: "1px solid #444", overflow: "hidden", animation: "fadeIn 0.2s ease" }}>
              <div style={{ background: "#2d2d2d", padding: "0.5rem 1rem", borderBottom: "1px solid #444", color: "#e5e7eb", fontSize: "0.85rem", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Payload Declarativo (ReportContentV1)</span>
                <span style={{ fontSize: "0.75rem", color: "#999", fontWeight: 400 }}>Apenas visível para Creators</span>
              </div>
              <pre style={{ margin: 0, padding: "1rem", color: "#a6e22e", overflowX: "auto", fontSize: "0.85rem", maxHeight: "400px", overflowY: "auto" }}>
                {JSON.stringify(synchronizeGroupedTableOrderBy({
                  ...reportContent, 
                  dataset: {
                    ...reportContent.dataset,
                    groupBy: synchronizeGroupBy(reportContent.dataset.select || [], catalog)
                  }
                }), null, 2)}
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
          
          <ReportPresentationRenderer presentation={reportContent?.presentation} select={reportContent?.dataset.select || []} result={previewData} loading={previewLoading} page={1} pageSize={50} onPageChange={() => undefined} onPageSizeChange={() => undefined}/>
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
    <div className="report-designer-shell" style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Navbar />
      
      {errorMsg && (
        <div style={{ padding: "1rem 1.5rem", background: "var(--surface-color)", borderBottom: "1px solid var(--border-color)" }}>
          <Alert type="error" message={errorMsg} />
        </div>
      )}

      {/* Header toolbar */}
      <header className="report-designer__header" style={{ background: "var(--surface-color)", borderBottom: "1px solid var(--border-color)", padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div className="report-designer__identity">
          <span>{reportId ? "Editando relatório" : "Novo relatório"}</span>
          <h2 title={reportId ? reportTitle : undefined}>{reportId ? reportTitle || "Relatório" : "Criar relatório"}</h2>
        </div>
      </header>

      {renderBreadcrumbs()}

      <main className="report-designer__content" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
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
              Dê um nome ao seu relatório para salvá-lo na área de criação.
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

      {showConfirmChangeBase && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div style={{ background: "var(--bg-primary)", padding: "2rem", borderRadius: "12px", width: "100%", maxWidth: "450px", border: "1px solid var(--border-color)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
            <h3 style={{ marginBottom: "1rem", fontWeight: 600, fontSize: "1.25rem", color: "var(--danger-500)" }}>Trocar Tabela Base</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", fontSize: "0.95rem" }}>
              Ao trocar a tabela base, <strong>todas as colunas selecionadas, filtros, ordenações e tabelas relacionadas (Joins) serão removidos</strong>. 
              <br /><br />
              Deseja realmente continuar?
            </p>
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button className="btn btn-secondary" onClick={() => setShowConfirmChangeBase(false)}>Cancelar</button>
              <button className="btn btn-primary" style={{ background: "var(--danger-500)", border: "none" }} onClick={() => {
                handleToggleSchema(selectedSchemaIds[0]);
                setShowConfirmChangeBase(false);
              }}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
