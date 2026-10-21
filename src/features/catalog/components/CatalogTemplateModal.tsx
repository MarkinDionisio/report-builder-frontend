import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalogApi } from '../api/catalogApi';
import type { CatalogTemplate } from '../types/catalogTemplateTypes';
import { isErr } from '../../../shared/result/result';
import { useAuth } from '../../auth/context/AuthContext';

export function CatalogTemplateModal({ dataSourceId, dataSourceName, mode, onClose, onSuccess }: {
  dataSourceId: string; dataSourceName: string; mode: 'save' | 'apply'; onClose: () => void; onSuccess: () => void;
}) {
  const { refreshUser } = useAuth();
  const [templates, setTemplates] = useState<CatalogTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState<CatalogTemplate | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(true);
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
        if (isErr(result)) { setError(result.error.detail || 'Erro ao carregar templates.'); if (result.error.status === 403) void refreshUser(); }
        else setTemplates(result.value);
      } else {
        const result = await catalogApi.listReportSchemas();
        if (!active) return;
        if (isErr(result)) { setError(result.error.detail || 'Erro ao carregar catálogo.'); if (result.error.status === 403) void refreshUser(); setEmptySource(true); }
        else {
          const sourceSchemas = result.value.filter(s => s.dataSourceId === dataSourceId);
          const fields = await Promise.all(sourceSchemas.map(s => catalogApi.listReportFields(s.id)));
          if (!active) return;
          const failed = fields.find(isErr);
          if (failed && isErr(failed)) { setError(failed.error.detail || 'Erro ao carregar campos.'); if (failed.error.status === 403) void refreshUser(); }
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
    lock.current = true; setBusy(true); setError('');
    try {
      const schemas = preview?.schemas.map(s => ({ schemaId: s.id, fieldIds: s.fields.filter(f => selected.has(f.id)).map(f => f.id) })).filter(s => s.fieldIds.length > 0) || [];
      const result = action === 'save' ? await catalogApi.createCatalogTemplate(dataSourceId, name, description)
        : action === 'preview' ? await catalogApi.previewCatalogTemplate(dataSourceId, templateId)
        : await catalogApi.applyCatalogTemplate(dataSourceId, templateId, schemas);
      if (isErr(result)) {
        setError(result.error.detail || 'Não foi possível concluir a operação.');
        if (result.error.status === 403) void refreshUser();
        if (action === 'apply' && result.error.status === 409) { setPreview(null); setSelected(new Set()); }
      } else if (action === 'preview') {
        setPreview(result.value);
        setSelected(new Set(result.value.schemas.filter(s => s.compatible).flatMap(s => s.fields.filter(f => f.compatible).map(f => f.id))));
      } else { setDone(true); onSuccess(); }
    } finally { lock.current = false; setBusy(false); }
  }
  return <div className="modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="template-title" className="modal-container" style={{ maxWidth: 850, maxHeight: '90vh', overflowY: 'auto' }}>
    <div className="modal-header"><h3 id="template-title">{mode === 'save' ? 'Salvar catálogo como template' : 'Aplicar template'}: {dataSourceName}</h3><button className="btn btn-secondary" disabled={busy} onClick={onClose}>Fechar</button></div>
    <div className="modal-body">
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Carregando…</p>}
      {done ? <div role="status"><p>{mode === 'save' ? 'Template salvo.' : 'Catálogo copiado com sucesso.'}</p><Link to={mode === 'save' ? '/catalog-templates' : '/report-schemas'}>Ver {mode === 'save' ? 'templates' : 'catálogo'}</Link></div>
      : mode === 'save' ? <form onSubmit={e => { e.preventDefault(); void run('save'); }}>
        {emptySource && <p>O catálogo de origem está vazio ou indisponível.</p>}
        <label>Nome<input className="form-input" required maxLength={200} value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Descrição<textarea className="form-input" value={description} onChange={e => setDescription(e.target.value)} /></label>
        <button className="btn btn-primary" disabled={busy || emptySource || !name.trim()}>Salvar template</button>
      </form> : <>
        <label>Template<select className="form-input" value={templateId} disabled={busy} onChange={e => { setTemplateId(e.target.value); setPreview(null); setSelected(new Set()); setError(''); }}>
          <option value="">Selecione</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select></label>
        {!busy && templates.length === 0 && <p>Nenhum template disponível. Salve o catálogo de uma fonte como template.</p>}
        <button className="btn btn-secondary" disabled={busy || !templateId} onClick={() => void run('preview')}>Gerar prévia</button>
        {preview && <><p>Selecione os campos compatíveis. Permissões serão configuradas separadamente.</p>
          {preview.schemas.map(s => <fieldset key={s.id} disabled={busy || !s.compatible}>
            <legend><label><input type="checkbox" checked={s.fields.some(f => selected.has(f.id))} disabled={!s.compatible || !s.fields.some(f => f.compatible)} onChange={e => { const next = new Set(selected); s.fields.filter(f => f.compatible).forEach(f => e.target.checked ? next.add(f.id) : next.delete(f.id)); setSelected(next); }} />{s.publicName} ({s.internalSchemaName}.{s.internalObjectName})</label></legend>
            {s.reason && <p>{s.reason}</p>}{s.fields.map(f => <div key={f.id}><label><input type="checkbox" disabled={!f.compatible} checked={selected.has(f.id)} onChange={e => { const next = new Set(selected); if (e.target.checked) next.add(f.id); else next.delete(f.id); setSelected(next); }} />{f.publicName} ({f.internalFieldName}) — {f.publicType}{f.isNullable ? ' · aceita nulo' : ''}{f.isSensitive ? ' · sensível' : ''}{!f.isEnabled ? ' · desabilitado' : ''}</label><details><summary>Configurações</summary><p>Selecionável: {f.isSelectable ? 'sim' : 'não'}; Filtrável: {f.isFilterable ? 'sim' : 'não'}; Ordenável: {f.isSortable ? 'sim' : 'não'}; Agrupável: {f.isGroupable ? 'sim' : 'não'}; Agregável: {f.isAggregatable ? 'sim' : 'não'}</p><p>Operadores: {f.allowedOperators.join(', ')}; Agregações: {f.allowedAggregations.join(', ') || 'nenhuma'}</p></details>{f.reason && <span> — {f.reason}</span>}</div>)}
          </fieldset>)}
          <button className="btn btn-primary" disabled={busy || selected.size === 0} onClick={() => void run('apply')}>Aplicar {selected.size} campos</button>
        </>}
      </>}
    </div>
  </section></div>;
}
