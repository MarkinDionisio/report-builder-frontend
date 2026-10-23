import { problemMessage } from "../../../shared/presentation/messages";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { CatalogTemplateSchemaPicker } from "./CatalogTemplateSchemaPicker";
import { Loader2 } from "lucide-react";
import "../styles/catalogTemplates.css";
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalogApi } from '../api/catalogApi';
import type { CatalogTemplate } from '../types/catalogTemplateTypes';
import { isErr } from '../../../shared/result/result';
import { useAuth } from '../../auth/context/AuthContext';

export function CatalogTemplateModal({ dataSourceId, dataSourceName, mode, onClose, onSuccess, onApplied, catalogPath, fieldsPath }: {
  dataSourceId: string; dataSourceName: string; mode: 'save' | 'apply'; onClose: () => void; onSuccess: () => void; onApplied?: (table: {internalSchemaName: string; internalObjectName: string}) => void; catalogPath?: string; fieldsPath?: string;
}) {
  const { refreshUser } = useAuth();
  const [templates, setTemplates] = useState<CatalogTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState<CatalogTemplate | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(true);
  const [operation, setOperation] = useState<"load" | "save" | "preview" | "apply">("load");
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [emptySource, setEmptySource] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      if (mode === 'apply') {
        const result = await catalogApi.listCatalogTemplates();
        if (!active) return;
        if (isErr(result)) { setError(problemMessage(result.error, 'Erro ao carregar templates.')); if (result.error.status === 403) void refreshUser(); }
        else setTemplates(result.value);
      } else {
        const result = await catalogApi.listReportSchemas();
        if (!active) return;
        if (isErr(result)) { setError(problemMessage(result.error, 'Erro ao carregar catálogo.')); if (result.error.status === 403) void refreshUser(); setEmptySource(true); }
        else {
          const sourceSchemas = result.value.filter(s => s.dataSourceId === dataSourceId);
          const fields = await Promise.all(sourceSchemas.map(s => catalogApi.listReportFields(s.id)));
          if (!active) return;
          const failed = fields.find(isErr);
          if (failed && isErr(failed)) { setError(problemMessage(failed.error, 'Erro ao carregar campos.')); if (failed.error.status === 403) void refreshUser(); }
          setEmptySource(Boolean(failed) || !fields.some(r => !isErr(r) && r.value.length > 0));
        }
      }
      setBusy(false);
    }
    void load();
    return () => { active = false; };
  }, [mode, dataSourceId, refreshUser]);
  async function run(action: 'save' | 'preview' | 'apply') {
    if (lock.current) return;
    lock.current = true; setOperation(action); setBusy(true); setError('');
    try {
      const schemas = preview?.schemas.map(s => ({ schemaId: s.id, fieldIds: s.fields.filter(f => selected.has(f.id)).map(f => f.id) })).filter(s => s.fieldIds.length > 0) || [];
      const result = action === 'save' ? await catalogApi.createCatalogTemplate(dataSourceId, name, description)
        : action === 'preview' ? await catalogApi.previewCatalogTemplate(dataSourceId, templateId)
        : await catalogApi.applyCatalogTemplate(dataSourceId, templateId, schemas);
      if (isErr(result)) {
        setError(problemMessage(result.error, 'Não foi possível concluir a operação.'));
        if (result.error.status === 403) void refreshUser();
        if (action === 'apply' && result.error.status === 409) { setPreview(null); setSelected(new Set()); }
      } else if (action === 'preview') {
        setPreview(result.value);
        setSelected(new Set(result.value.schemas.filter(s => s.compatible).flatMap(s => s.fields.filter(f => f.compatible).map(f => f.id))));
      } else {
        setDone(true);
        if(action === "apply" && onApplied) {
          const applied = preview?.schemas.find(table=>schemas.some(selection=>selection.schemaId===table.id));
          if(applied) onApplied({internalSchemaName:applied.internalSchemaName,internalObjectName:applied.internalObjectName});
          else onSuccess();
        } else onSuccess();
      }
    } finally { lock.current = false; setBusy(false); }
  }
  const progress = operation === "load"
    ? mode === "save"
      ? { title: "Verificando tabelas e campos cadastrados…", detail: "Conferindo se esta fonte possui um catálogo para salvar como template." }
      : { title: "Carregando modelos de catálogo", detail: "Consultando modelos disponíveis para aplicar nesta fonte…" }
    : operation === "save"
      ? { title: "Salvando template de catálogo…", detail: "Criando uma cópia das configurações de tabelas e campos." }
      : operation === "preview"
        ? { title: "Comparando template com o banco de destino…", detail: "Verificando tabelas, campos e tipos para identificar os itens compatíveis." }
        : { title: "Aplicando campos selecionados…", detail: "Validando a seleção e cadastrando o catálogo na fonte de destino." };

  return <div className="modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="template-title" className="modal-container catalog-template-modal catalog-template-workflow" style={{ maxWidth: 850 }}>
    <div className="modal-header"><h3 id="template-title">{mode === 'save' ? 'Salvar catálogo como template' : 'Aplicar template'}: {dataSourceName}</h3><button className="btn btn-secondary" disabled={busy} onClick={onClose}>Fechar</button></div>
    <div className="modal-body">
      {error && <p role="alert">{error}</p>}
      {busy && <NeutralLoader title={progress.title} message={progress.detail} minHeight="auto"/>}
      {done ? <div role="status"><p>{mode === 'save' ? 'Template salvo.' : 'Catálogo copiado com sucesso.'}</p><Link onClick={onClose} to={mode === 'save' ? (catalogPath || '/catalog-templates') : (fieldsPath || '/report-schemas')}>Ver {mode === 'save' ? 'templates' : 'catálogo'}</Link></div>
      : mode === 'save' ? <form onSubmit={e => { e.preventDefault(); void run('save'); }}>
        {emptySource && <p>O catálogo de origem está vazio ou indisponível.</p>}
        <label>Nome<input className="form-input" required maxLength={200} value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Descrição<textarea className="form-input" value={description} onChange={e => setDescription(e.target.value)} /></label>
        <button className="btn btn-primary" disabled={busy || emptySource || !name.trim()}>Salvar template</button>
      </form> : <>
        {!preview ? <>
        <label>Template<select className="form-input" value={templateId} disabled={busy} onChange={e => { setTemplateId(e.target.value); setPreview(null); setSelected(new Set()); setError(''); }}>
          <option value="">Selecione</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select></label>
        {!busy && templates.length === 0 && <p>Nenhum template disponível. Salve o catálogo de uma fonte como template.</p>}
        <button className="btn btn-secondary" disabled={busy || !templateId} onClick={() => void run('preview')}>Gerar prévia</button>
        </> : <div className="catalog-template-source-summary">
          <div><small>Template escolhido</small><strong>{preview.name}</strong></div>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => { setPreview(null); setSelected(new Set()); setError(''); }}>Trocar template</button>
        </div>}
        {preview && <><p>Selecione os campos compatíveis. Permissões serão configuradas separadamente.</p>
          <CatalogTemplateSchemaPicker key={preview.id} schemas={preview.schemas} selected={selected} onChange={setSelected} disabled={busy} />

        </>}
      </>}
    </div>
    {mode === 'apply' && preview && !done && <footer className="catalog-template-footer">
      <span>{selected.size === 1 ? '1 campo selecionado' : `${selected.size} campos selecionados`}</span>
      <button className="btn btn-primary" disabled={busy || selected.size === 0} aria-busy={busy && operation === 'apply'} onClick={() => void run('apply')}>
        {busy && operation === 'apply' && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        Aplicar {selected.size} campos
      </button>
    </footer>}
  </section></div>;
}
