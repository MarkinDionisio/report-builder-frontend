import { SourceActionMenu } from "../../catalog/components/SourceActionMenu";
import "../styles/organizationOverview.css";
import "../../catalog/styles/dataSourceWorkspace.css";
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
      <main className="source-workspace organization-overview organization-list">
      <header className="organization-section-header organization-list-header">
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Building2 size={28} style={{ color: "var(--primary-500)" }} />
            Organizações
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            {isRoot
              ? "Gerencie as organizações e suas configurações."
              : userGlobalRole && userGlobalRole !== "unassigned"
              ? "Acesse as organizações disponíveis na plataforma."
              : "Acesse as organizações das quais você faz parte."}
          </p>
        </div>

        {isRoot && (
          <button onClick={handleOpenCreate} className="btn btn-primary">
            <Plus size={18} /> Nova Organização
          </button>
        )}
      </header>

      <ProblemAlert problem={problem} />

      {isLoading ? (
        <div role="status" className="organization-loading"><span>Consultando organizações…</span>
          <Loader2 size={36} className="animate-spin" style={{ color: "var(--primary-500)" }} />
        </div>
      ) : organizations.length === 0 ? (
        <div className="card organization-empty">
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
              <article key={org.id} className="card organization-list-card"><header><h3>{org.name}</h3></header><p>{org.description||"Sem descrição informada."}</p>{org.timeZone&&<small>Fuso horário: {org.timeZone}</small>}<footer>{userCanManage&&<Link to={"/organizations/"+org.id} className="btn btn-primary"><Building2 size={16}/>Acessar Central da Organização</Link>}{(isRoot||userCanManage)&&<SourceActionMenu label="Opções">{userCanManage&&<><Link to={"/organizations/"+org.id+"/members"}><Users size={16}/>Membros</Link><Link to={"/organizations/"+org.id+"/invitations"}><Mail size={16}/>Convites</Link><Link to={"/organizations/"+org.id+"?tab=profiles"}><Users size={16}/>Profiles de acesso</Link></>}{isRoot&&<><button onClick={()=>handleOpenEdit(org)} aria-label={"Editar organização "+org.name}><Edit2 size={16}/>Editar organização</button><button className="btn-danger" onClick={()=>handleOpenDelete(org)} aria-label={"Excluir organização "+org.name}><Trash2 size={16}/>Excluir organização</button></>}</SourceActionMenu>}</footer></article>
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
