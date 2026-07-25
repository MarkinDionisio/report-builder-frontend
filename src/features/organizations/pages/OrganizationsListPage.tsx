import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { Navbar } from "../../../shared/components/Navbar";
import { organizationsApi } from "../api/organizationsApi";
import type { Organization, UpsertOrganizationRequest } from "../types";
import type { ApiProblemDetails } from "../../../shared/api/types";
import { isErr } from "../../../shared/result/result";
import { ProblemAlert } from "../../../shared/components/Alert";
import { canManageOrganization } from "../../../shared/utils/roles";
import { OrganizationFormModal } from "../components/OrganizationFormModal";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Users,
  Mail,
  Loader2,
} from "lucide-react";

export const OrganizationsListPage: React.FC = () => {
  const { state, refreshUser } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [problem, setProblem] = useState<ApiProblemDetails | null>(null);
  const [actionProblem, setActionProblem] = useState<ApiProblemDetails | null>(null);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);

  const isRoot = state.status === "authenticated" && state.user?.globalRole === "root";

  const fetchOrganizations = useCallback(async () => {
    setIsLoading(true);
    setProblem(null);
    const result = await organizationsApi.list();
    setIsLoading(false);

    if (isErr(result)) {
      if (result.error.status === 403) {
        refreshUser(); // Reload /me silently on 403
      }
      setProblem(result.error);
    } else {
      setOrganizations(result.value);
    }
  }, [refreshUser]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleOpenCreate = () => {
    setEditingOrg(null);
    setActionProblem(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (org: Organization) => {
    setEditingOrg(org);
    setActionProblem(null);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (org: Organization) => {
    setDeletingOrg(org);
    setActionProblem(null);
    setIsDeleteOpen(true);
  };

  const handleUpsertSubmit = async (data: UpsertOrganizationRequest): Promise<boolean> => {
    setActionProblem(null);
    if (editingOrg) {
      const res = await organizationsApi.update(editingOrg.id, data);
      if (isErr(res)) {
        setActionProblem(res.error);
        return false;
      }
      setOrganizations((prev) =>
        prev.map((o) => (o.id === editingOrg.id ? res.value : o))
      );
      return true;
    } else {
      const res = await organizationsApi.create(data);
      if (isErr(res)) {
        setActionProblem(res.error);
        return false;
      }
      setOrganizations((prev) => [...prev, res.value]);
      return true;
    }
  };

  const handleDeleteConfirm = async (): Promise<boolean> => {
    if (!deletingOrg) return false;
    setActionProblem(null);
    const res = await organizationsApi.delete(deletingOrg.id);
    if (isErr(res)) {
      if (res.error.status === 403) {
        refreshUser();
      }
      setActionProblem(res.error);
      return false;
    }
    // Remove only after 204 success
    setOrganizations((prev) => prev.filter((o) => o.id !== deletingOrg.id));
    setDeletingOrg(null);
    return true;
  };

  const userGlobalRole = state.status === "authenticated" ? state.user?.globalRole : null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ maxWidth: "1200px", width: "100%", margin: "2rem auto", padding: "0 1.5rem", flex: 1 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Building2 size={28} style={{ color: "var(--primary-500)" }} />
            Organizações
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            {isRoot
              ? "Visão global completa de todas as organizações da plataforma (papel root)"
              : userGlobalRole && userGlobalRole !== "unassigned"
              ? "Visão global de todas as organizações da plataforma"
              : "Organizações nas quais você possui membership ativa"}
          </p>
        </div>

        {isRoot && (
          <button onClick={handleOpenCreate} className="btn btn-primary">
            <Plus size={18} /> Nova Organização
          </button>
        )}
      </div>

      <ProblemAlert problem={problem} />

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
          <Loader2 size={36} className="animate-spin" style={{ color: "var(--primary-500)" }} />
        </div>
      ) : organizations.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
          <Building2 size={48} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Nenhuma Organização Encontrada
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            {isRoot
              ? "Clique no botão acima para cadastrar a primeira organização."
              : "Você ainda não foi adicionado como membro de nenhuma organização."}
          </p>
        </div>
      ) : (
        <div className="dashboard-grid">
          {organizations.map((org) => {
            const userCanManage = state.status === "authenticated" && state.user
              ? canManageOrganization(state.user, org.id)
              : false;

            return (
              <div key={org.id} className="glass-card animate-fade-in" style={{ padding: "1.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>{org.name}</h3>
                    <div style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                      ID: {org.id}
                    </div>
                  </div>

                  {isRoot && (
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button
                        onClick={() => handleOpenEdit(org)}
                        className="btn btn-secondary"
                        style={{ padding: "0.35rem 0.6rem" }}
                        title="Editar Organização"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(org)}
                        className="btn"
                        style={{ padding: "0.35rem 0.6rem", background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)" }}
                        title="Excluir Organização"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", minHeight: "2.8rem", marginBottom: "1.5rem" }}>
                  {org.description || <em style={{ color: "var(--text-muted)" }}>Sem descrição informada.</em>}
                </p>

                {userCanManage && (
                  <div
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      borderTop: "1px solid var(--border-color)",
                      paddingTop: "1rem",
                    }}
                  >
                    <Link
                      to={`/organizations/${org.id}/members`}
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: "0.55rem 0.75rem", fontSize: "0.85rem" }}
                    >
                      <Users size={16} /> Membros
                    </Link>
                    <Link
                      to={`/organizations/${org.id}/invitations`}
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: "0.55rem 0.75rem", fontSize: "0.85rem" }}
                    >
                      <Mail size={16} /> Convites
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <OrganizationFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleUpsertSubmit}
        initialData={editingOrg}
        problem={actionProblem}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Organização"
        itemName={deletingOrg?.name || "esta organização"}
        warningText="ATENÇÃO: A exclusão é destrutiva. A API removerá logicamente a organização e todos os seus vínculos (memberships, convites, relatórios, permissões, etc.). Os recursos vinculados deixarão de estar disponíveis."
        problem={actionProblem}
      />
      </main>
    </div>
  );
};
