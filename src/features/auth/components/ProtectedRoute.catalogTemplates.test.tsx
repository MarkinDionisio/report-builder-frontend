import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
const session = vi.hoisted(() => ({ role: 'root' }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ state: { status: 'authenticated', user: { globalRole: session.role, organizations: [] } } }) }));
afterEach(cleanup);
function show() { render(<MemoryRouter initialEntries={['/catalog-templates']}><Routes><Route path="/catalog-templates" element={<ProtectedRoute><p>Templates liberados</p></ProtectedRoute>} /><Route path="/dashboard" element={<p>Dashboard</p>} /></Routes></MemoryRouter>); }
describe('Catalog template authorization', () => {
  it('allows root', () => { session.role = 'root'; show(); expect(screen.getByText('Templates liberados')).toBeVisible(); });
  it('rejects organization administrators without global root', () => { session.role = 'administrator'; show(); expect(screen.getByText('Dashboard')).toBeVisible(); });
});
