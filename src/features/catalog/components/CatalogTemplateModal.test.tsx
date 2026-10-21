import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogTemplateModal } from './CatalogTemplateModal';
import { catalogApi } from '../api/catalogApi';
import type { CatalogTemplate } from '../types/catalogTemplateTypes';
import { ok, err } from '../../../shared/result/result';
vi.mock('../api/catalogApi', () => ({ catalogApi: { listCatalogTemplates: vi.fn(), previewCatalogTemplate: vi.fn(), applyCatalogTemplate: vi.fn(), createCatalogTemplate: vi.fn(), listReportSchemas: vi.fn(), listReportFields: vi.fn() } }));
const refreshUser = vi.fn();
vi.mock('../../auth/context/AuthContext', () => ({ useAuth: () => ({ refreshUser }) }));
const onSuccess = vi.fn();
const template: CatalogTemplate = { id: 't1', name: 'ERP', description: null, schemas: [{ id: 's1', publicName: 'Pedidos', publicType: 'object', internalSchemaName: 'public', internalObjectName: 'orders', description: null, isEnabled: true, compatible: true, reason: null, fields: [
  { id: 'f1', publicName: 'Código', internalFieldName: 'id', publicType: 'integer', isNullable: false, isSelectable: true, isFilterable: true, isSortable: true, isGroupable: true, isAggregatable: true, isSensitive: false, isEnabled: true, allowedOperators: ['eq'], allowedAggregations: ['sum'], compatible: true, reason: null },
  { id: 'f2', publicName: 'Total', internalFieldName: 'amount', publicType: 'number', isNullable: false, isSelectable: true, isFilterable: true, isSortable: true, isGroupable: true, isAggregatable: true, isSensitive: false, isEnabled: true, allowedOperators: ['eq'], allowedAggregations: ['sum'], compatible: false, reason: 'Tipo incompatível' },
] }] };
function show(mode: 'apply' | 'save' = 'apply') { return render(<MemoryRouter><CatalogTemplateModal dataSourceId="target" dataSourceName="Destino" mode={mode} onClose={vi.fn()} onSuccess={onSuccess} /></MemoryRouter>); }
async function preview() {
  await screen.findByRole('option', { name: 'ERP' });
  fireEvent.change(screen.getByLabelText('Template'), { target: { value: 't1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gerar prévia' }));
  await screen.findByRole('button', { name: 'Aplicar 1 campos' });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(catalogApi.listCatalogTemplates).mockResolvedValue(ok([template, { ...template, id: 't2', name: 'Outro' }]));
  vi.mocked(catalogApi.previewCatalogTemplate).mockResolvedValue(ok(structuredClone(template)));
  vi.mocked(catalogApi.listReportSchemas).mockResolvedValue(ok([]));
});
afterEach(cleanup);
describe('Catalog template copy', () => {
  it('shows an empty template list', async () => {
    vi.mocked(catalogApi.listCatalogTemplates).mockResolvedValue(ok([]));
    show();
    expect(await screen.findByText(/Nenhum template disponível/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Gerar prévia' })).toBeDisabled();
  });
  it('refreshes authorization after access is denied', async () => {
    vi.mocked(catalogApi.listCatalogTemplates).mockResolvedValue(err({ type: 'about:blank', title: 'Forbidden', status: 403, detail: 'Acesso negado.', instance: '/api/v1/catalog-templates' }));
    show();
    expect(await screen.findByRole('alert')).toHaveTextContent('Acesso negado.');
    expect(refreshUser).toHaveBeenCalledTimes(1);
  });
  it('selects compatible fields only and prevents duplicate submissions', async () => {
    let finish!: (r: ReturnType<typeof ok<CatalogTemplate>>) => void;
    vi.mocked(catalogApi.applyCatalogTemplate).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    show(); await preview();
    expect(screen.getByRole('checkbox', { name: /Total/ })).toBeDisabled();
    const button = screen.getByRole('button', { name: 'Aplicar 1 campos' });
    fireEvent.click(button); fireEvent.click(button);
    expect(catalogApi.applyCatalogTemplate).toHaveBeenCalledTimes(1);
    expect(catalogApi.applyCatalogTemplate).toHaveBeenCalledWith('target', 't1', [{ schemaId: 's1', fieldIds: ['f1'] }]);
    finish(ok(template));
    await screen.findByText('Catálogo copiado com sucesso.');
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
  it('invalidates preview on template change and disables empty selection', async () => {
    show(); await preview();
    fireEvent.click(screen.getByRole('checkbox', { name: /Código/ }));
    expect(screen.getByRole('button', { name: 'Aplicar 0 campos' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Template'), { target: { value: 't2' } });
    expect(screen.queryByRole('button', { name: /Aplicar .* campos/ })).not.toBeInTheDocument();
  });
  it('requires a new preview after conflict', async () => {
    vi.mocked(catalogApi.applyCatalogTemplate).mockResolvedValue(err({ type: 'about:blank', title: 'Conflict', status: 409, detail: 'Catálogo mudou.', instance: '/api/v1/data-sources/target/catalog-template/apply' }));
    show(); await preview(); fireEvent.click(screen.getByRole('button', { name: 'Aplicar 1 campos' }));
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: /Aplicar .* campos/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar prévia' })).toBeEnabled();
  });
  it('prevents saving an empty source catalog', async () => {
    show('save'); await waitFor(() => expect(screen.getByText(/catálogo de origem está vazio/)).toBeVisible());
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'ERP' } });
    expect(screen.getByRole('button', { name: 'Salvar template' })).toBeDisabled();
  });
  it('saves a populated source catalog', async () => {
    vi.mocked(catalogApi.listReportSchemas).mockResolvedValue(ok([{ id: 's1', dataSourceId: 'target', publicName: 'Pedidos', publicType: 'object', internalSchemaName: 'public', internalObjectName: 'orders', description: null, isEnabled: true }]));
    vi.mocked(catalogApi.listReportFields).mockResolvedValue(ok([{ id: 'f1', name: 'Código', type: 'integer', nullable: false, selectable: true, filterable: true, sortable: true, groupable: true, aggregatable: true, allowedOperators: ['eq'], allowedAggregations: [], internalFieldName: 'id', isSensitive: false, isEnabled: true }]));
    vi.mocked(catalogApi.createCatalogTemplate).mockResolvedValue(ok(template));
    show('save'); fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'ERP' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar template' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Salvar template' }));
    await screen.findByText('Template salvo.');
    expect(catalogApi.createCatalogTemplate).toHaveBeenCalledWith('target', 'ERP', '');
  });
  it('shows introspection failure states', async () => {
    vi.mocked(catalogApi.previewCatalogTemplate).mockResolvedValue(err({ type: 'about:blank', title: 'Unavailable', status: 400, detail: 'Banco indisponível.', instance: '/api/v1/data-sources/target/catalog-template/preview' }));
    show(); await screen.findByRole('option', { name: 'ERP' });
    fireEvent.change(screen.getByLabelText('Template'), { target: { value: 't1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar prévia' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Banco indisponível.');
  });
});
