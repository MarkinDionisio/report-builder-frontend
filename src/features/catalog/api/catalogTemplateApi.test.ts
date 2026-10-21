import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalogApi } from './catalogApi';
import * as client from '../../../shared/api/client';
import { ok, err, isErr } from '../../../shared/result/result';
afterEach(() => vi.restoreAllMocks());
describe('Catalog template API contracts', () => {
  it('posts source metadata with JSON content type', async () => {
    const fetch = vi.spyOn(client, 'apiFetch').mockResolvedValue(ok(new Response('{}')));
    await catalogApi.createCatalogTemplate('source', 'ERP', 'Description');
    expect(fetch).toHaveBeenCalledWith('/api/v1/catalog-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceDataSourceId: 'source', name: 'ERP', description: 'Description' }) });
  });
  it('sends only template IDs and selections when previewing and applying', async () => {
    const fetch = vi.spyOn(client, 'apiFetch').mockImplementation(async () => ok(new Response('{}')));
    await catalogApi.previewCatalogTemplate('target', 'template');
    const schemas = [{ schemaId: 's1', fieldIds: ['f1'] }];
    await catalogApi.applyCatalogTemplate('target', 'template', schemas);
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/v1/data-sources/target/catalog-template/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId: 'template' }) });
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/v1/data-sources/target/catalog-template/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId: 'template', schemas }) });
  });
  it('lists and retrieves templates and handles empty deletion responses', async () => {
    const fetch = vi.spyOn(client, 'apiFetch').mockResolvedValueOnce(ok(new Response('[]'))).mockResolvedValueOnce(ok(new Response('{}'))).mockResolvedValueOnce(ok(new Response(null, { status: 204 })));
    await catalogApi.listCatalogTemplates(); await catalogApi.getCatalogTemplate('t1');
    const result = await catalogApi.deleteCatalogTemplate('t1');
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/v1/catalog-templates');
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/v1/catalog-templates/t1');
    expect(fetch).toHaveBeenNthCalledWith(3, '/api/v1/catalog-templates/t1', { method: 'DELETE' });
  });
  it('preserves conflict responses', async () => {
    vi.spyOn(client, 'apiFetch').mockResolvedValue(err({ type: 'about:blank', title: 'Conflict', status: 409, detail: 'Changed', instance: '/api/v1/data-sources/target/catalog-template/apply' }));
    const result = await catalogApi.applyCatalogTemplate('target', 't1', []);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.status).toBe(409);
  });
});
