import { problemMessage } from "../../../shared/presentation/messages";
import { ContentSkeleton } from "../../../shared/components/ContentSkeleton";
import { ConfirmDeleteModal } from "../../organizations/components/ConfirmDeleteModal";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import "../styles/catalogTemplates.css";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navbar } from '../../../shared/components/Navbar';
import { catalogApi } from '../api/catalogApi';
import type { CatalogTemplate } from '../types/catalogTemplateTypes';
import { isErr } from '../../../shared/result/result';
import { useAuth } from '../../auth/context/AuthContext';

export function CatalogTemplatesPage({ embedded = false }: { embedded?: boolean }) {
  const Container = embedded ? "section" : "main";
  const Heading=embedded?"h3":"h1";
  const TemplateHeading=embedded?"h4":"h2";
  const { refreshUser } = useAuth();
  const [templates, setTemplates] = useState<CatalogTemplate[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(true);
  const [deleting, setDeleting] = useState<CatalogTemplate | null>(null);
  const [deleteError,setDeleteError]=useState("");
  const lock = useRef(false);
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const result = await catalogApi.listCatalogTemplates();
      if (isErr(result)) { setError(problemMessage(result.error, 'Erro ao carregar templates.')); if (result.error.status === 403) void refreshUser(); }
      else { setTemplates(result.value); setLoaded(true); }
    } catch {setError('Falha de comunicação ao consultar modelos de catálogo. Tente atualizar novamente.');}
    finally {setBusy(false);}
  }, [refreshUser]);
  useEffect(() => { void load(); }, [load]);
  async function remove() {
    if (!deleting || lock.current) return false;
    lock.current = true; setBusy(true);
    try {
      const result = await catalogApi.deleteCatalogTemplate(deleting.id);
      if (isErr(result)) { setDeleteError(problemMessage(result.error, 'Erro ao excluir template.')); if (result.error.status === 403) void refreshUser(); }
      else { setTemplates(current=>current.filter(template=>template.id!==deleting.id)); return true; }
      return false;
    } finally { lock.current = false; setBusy(false); }
  }
  return <>
    {!embedded && <Navbar />}
    <Container className={embedded ? "source-embedded catalog-templates-page" : "page-container catalog-templates-page"}>
      <header className="catalog-templates-page__header">
        <div>
          <Heading>Modelos de catálogo</Heading>
          <p>Modelos globais para reutilizar configurações de tabelas e campos. Cada aplicação cria uma cópia independente; excluir um modelo não remove catálogos já criados.</p>
        </div>
        <button className="btn btn-secondary" disabled={busy} onClick={() => void load()}>Atualizar</button>
      </header>
      {error && <p role="alert">{error}</p>}
      {busy && !loaded && <ContentSkeleton variant="cards" message="Consultando modelos de catálogo…"/>}
      {busy && loaded && <NeutralLoader compact message={lock.current ? "Excluindo modelo…" : "Atualizando modelos de catálogo…"}/>}
      {!busy && !error && templates.length === 0 && <p>Nenhum template cadastrado.</p>}
      <div className="catalog-template-list" aria-busy={busy} inert={busy}>
        {templates.map(t => <article className="card catalog-template-card" key={t.id}>
          <header className="catalog-template-card__header">
            <div><TemplateHeading>{t.name}</TemplateHeading>{t.description && <p className="catalog-template-card__description">{t.description}</p>}</div>
            <button className="btn btn-secondary" disabled={busy} onClick={() => {setDeleteError("");setDeleting(t);}}>Excluir</button>
          </header>
          <details>
            <summary>{t.schemas.length} schemas — consultar conteúdo</summary>
            {t.schemas.map(s => <section className="catalog-template-card__schema" key={s.id}>
              <h3>{s.publicName} ({s.internalSchemaName}.{s.internalObjectName})</h3>
              {s.description && <p>{s.description}</p>}
              <ul>{s.fields.map(f => <li key={f.id}>
                {f.publicName} ({f.internalFieldName}) · {f.publicType} · {f.isSensitive ? 'sensível' : 'não sensível'} · {f.isEnabled ? 'habilitado' : 'desabilitado'}
                <br />Operadores: {f.allowedOperators.join(', ')}; Agregações: {f.allowedAggregations.join(', ') || 'nenhuma'}
              </li>)}</ul>
            </section>)}
          </details>
        </article>)}
      </div>
      {deleting && <ConfirmDeleteModal isOpen title="Excluir template" itemName={deleting.name} warningText="Modelo global compartilhado entre organizações. Catálogos já copiados continuam disponíveis." problem={null} errorMessage={deleteError} onClose={()=>setDeleting(null)} onConfirm={remove}/>}
    </Container>
  </>;
}
