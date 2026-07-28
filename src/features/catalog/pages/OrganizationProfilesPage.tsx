import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import type { Profile, UpsertProfileRequest } from "../types/catalogTypes";
import { catalogApi } from "../api/catalogApi";
import { isErr } from "../../../shared/result/result";
import { canManageOrganization } from "../../../shared/utils/roles";
import { Navbar } from "../../../shared/components/Navbar";
import { Alert } from "../../../shared/components/Alert";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { Users, Plus, Key, Edit2, Trash2, ShieldAlert, X, ArrowLeft } from "lucide-react";

export const OrganizationProfilesPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const { state, refreshUser } = useAuth();
  const user = state.status === "authenticated" ? state.user : null;

  const canManage = Boolean(user && organizationId && canManageOrganization(user, organizationId));

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const loadProfiles = useCallback(async () => {
    if (!organizationId) return;
    if (!canManage) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await catalogApi.listProfiles(organizationId);
    setLoading(false);

    if (isErr(res)) {
      if (res.error.status === 403 || res.error.code === "profiles.management_forbidden") {
        setAccessDenied(true);
        refreshUser();
      } else {
        setErrorMsg(res.error.detail || "Erro ao carregar perfis da organização.");
      }
    } else {
      setProfiles(res.value);
    }
  }, [organizationId, canManage, refreshUser]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const openCreateModal = () => {
    setEditingProfile(null);
    setName("");
    setDescription("");
    setIsModalOpen(true);
  };

  const openEditModal = (profile: Profile) => {
    setEditingProfile(profile);
    setName(profile.name);
    setDescription(profile.description || "");
    setIsModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg("O nome do perfil é obrigatório.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const payload: UpsertProfileRequest = {
      name: trimmedName,
      description: description.trim() ? description.trim() : null,
    };

    if (editingProfile) {
      const res = await catalogApi.updateProfile(organizationId, editingProfile.id, payload);
      setSaving(false);

      if (isErr(res)) {
        if (res.error.code === "profiles.name_duplicate") {
          setErrorMsg("Já existe um perfil com este nome nesta organização.");
        } else if (res.error.status === 403) {
          setAccessDenied(true);
          refreshUser();
        } else {
          setErrorMsg(res.error.detail || "Erro ao atualizar perfil.");
        }
      } else {
        setIsModalOpen(false);
        setEditingProfile(null);
        await loadProfiles();
      }
    } else {
      const res = await catalogApi.createProfile(organizationId, payload);
      setSaving(false);

      if (isErr(res)) {
        if (res.error.code === "profiles.name_duplicate") {
          setErrorMsg("Já existe um perfil com este nome nesta organização.");
        } else if (res.error.status === 403) {
          setAccessDenied(true);
          refreshUser();
        } else {
          setErrorMsg(res.error.detail || "Erro ao criar perfil.");
        }
      } else {
        setIsModalOpen(false);
        await loadProfiles();
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProfile || !organizationId) return;
    setDeleting(true);
    setErrorMsg(null);

    const res = await catalogApi.deleteProfile(organizationId, deletingProfile.id);
    setDeleting(false);

    if (isErr(res)) {
      if (res.error.status === 403) {
        setAccessDenied(true);
        refreshUser();
      } else {
        setErrorMsg(res.error.detail || "Erro ao excluir perfil.");
      }
    } else {
      setDeletingProfile(null);
      await loadProfiles();
    }
  };

  if (accessDenied || (!canManage && !loading)) {
    return (
      <>
        <Navbar />
        <main className="container" style={{ padding: "2rem 1rem" }}>
          <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
            <ShieldAlert size={48} style={{ color: "var(--danger-500)", marginBottom: "1rem" }} />
            <h2>Acesso Negado</h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto 1.5rem auto" }}>
              Apenas o papel <code>root</code> ou o papel de <code>administrator</code> na organização podem gerenciar os Perfis e Grants.
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: "2rem 1rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <Link to="/organizations" className="btn btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}>
            <ArrowLeft size={16} /> Voltar para Organizações
          </Link>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.25rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Users size={28} className="text-accent" /> Perfis de Acesso da Organização
            </h1>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>
              Crie perfis de permissão para atribuir privilégios granulares a relatórios e catálogos.
            </p>
          </div>
          <button onClick={openCreateModal} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Plus size={18} /> Novo Perfil
          </button>
        </div>

        {errorMsg && <Alert type="error" message={errorMsg} style={{ marginBottom: "1.25rem" }} />}

        {loading ? (
          <NeutralLoader message="Carregando perfis..." />
        ) : profiles.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem", color: "var(--text-secondary)" }}>
            <Users size={40} style={{ opacity: 0.4, marginBottom: "0.75rem" }} />
            <h3>Nenhum perfil cadastrado</h3>
            <p style={{ marginBottom: "1.5rem" }}>Cadastre perfis como "Financeiro", "Diretoria" ou "Operacional" para definir regras de acesso aos dados.</p>
            <button onClick={openCreateModal} className="btn btn-primary">
              <Plus size={16} /> Criar Primeiro Perfil
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr>
                  <th>Nome do Perfil</th>
                  <th>Organização</th>
                  <th>Descrição</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{profile.name}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{profile.organizationName}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {profile.description || <span style={{ opacity: 0.5 }}>Sem descrição</span>}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                        <button
                          onClick={() => navigate(`/organizations/${organizationId}/profiles/${profile.id}/grants`)}
                          className="btn btn-secondary"
                          style={{ padding: "0.35rem 0.6rem", fontSize: "0.775rem" }}
                          title="Gerenciar Permissões (Grants)"
                        >
                          <Key size={14} /> Grants
                        </button>
                        <button onClick={() => openEditModal(profile)} className="btn-icon" title="Editar Perfil">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setDeletingProfile(profile)} className="btn-icon text-danger" title="Excluir Perfil">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create / Edit Modal */}
        {isModalOpen && (
          <div className="modal-backdrop">
            <div className="modal-container" style={{ maxWidth: "500px" }}>
              <div className="modal-header">
                <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
                  {editingProfile ? `Editar Perfil: ${editingProfile.name}` : "Novo Perfil de Acesso"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="btn-icon">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label className="form-label" htmlFor="profile-name">
                      Nome do Perfil *
                    </label>
                    <input
                      id="profile-name"
                      type="text"
                      className="form-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Financeiro"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" htmlFor="profile-description">
                      Descrição (Opcional)
                    </label>
                    <textarea
                      id="profile-description"
                      className="form-input"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex: Acesso completo aos relatórios de faturamento e receitas"
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary" disabled={saving}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Salvando..." : editingProfile ? "Atualizar Perfil" : "Criar Perfil"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingProfile && (
          <div className="modal-backdrop">
            <div className="modal-container" style={{ maxWidth: "450px" }}>
              <div className="modal-header">
                <h3 style={{ margin: 0, color: "var(--danger-500)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ShieldAlert size={20} /> Confirmar Exclusão
                </h3>
                <button onClick={() => setDeletingProfile(null)} className="btn-icon">
                  <X size={20} />
                </button>
              </div>
              <div style={{ padding: "1.25rem" }}>
                <p style={{ margin: "0 0 1rem 0", fontSize: "0.95rem" }}>
                  Tem certeza que deseja excluir o perfil <strong>{deletingProfile.name}</strong>?
                </p>
                <div style={{ background: "rgba(239, 68, 68, 0.1)", padding: "0.75rem", borderRadius: "6px", fontSize: "0.85rem", color: "var(--danger-500)", marginBottom: "1.25rem" }}>
                  Esta ação revogará todos os grants associados a este perfil e desvinculará os usuários associados.
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button onClick={() => setDeletingProfile(null)} className="btn btn-secondary" disabled={deleting}>
                    Cancelar
                  </button>
                  <button onClick={handleDeleteConfirm} className="btn btn-danger" disabled={deleting}>
                    {deleting ? "Excluindo..." : "Sim, Excluir Perfil"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
};
