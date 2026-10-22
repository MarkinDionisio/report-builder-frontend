import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CatalogTemplatesPage } from './CatalogTemplatesPage';
import { catalogApi } from '../api/catalogApi';
import { ok } from '../../../shared/result/result';
vi.mock('../../../shared/components/Navbar', () => ({ Navbar: () => null }));
const refreshUser = vi.fn();
vi.mock('../../auth/context/AuthContext', () => ({ useAuth: () => ({ refreshUser }) }));
vi.mock('../api/catalogApi', () => ({ catalogApi: { listCatalogTemplates: vi.fn(), deleteCatalogTemplate: vi.fn() } }));
beforeEach(() => { vi.resetAllMocks(); vi.mocked(catalogApi.listCatalogTemplates).mockResolvedValue(ok([{ id: 't1', name: 'ERP', description: null, schemas: [] }])); });
afterEach(cleanup);
it('confirms deletion and reloads templates', async () => {
  vi.mocked(catalogApi.deleteCatalogTemplate).mockResolvedValue(ok(undefined));
  render(<CatalogTemplatesPage />); fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }));
  expect(catalogApi.deleteCatalogTemplate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Confirmar Exclusão/i }));
  await waitFor(() => expect(catalogApi.deleteCatalogTemplate).toHaveBeenCalledWith('t1'));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
