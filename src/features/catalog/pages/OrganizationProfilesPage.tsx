import { useModalFocus } from "../../../shared/hooks/useModalFocus";
import { ConfirmDeleteModal } from "../../organizations/components/ConfirmDeleteModal";
import { OrganizationContextHeader } from "../../organizations/components/OrganizationContextHeader";
import { SourceActionMenu } from "../components/SourceActionMenu";
import "../../organizations/styles/organizationOverview.css";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import type { Profile, UpsertProfileRequest } from "../types/catalogTypes";
import { catalogApi } from "../api/catalogApi";
import { isErr } from "../../../shared/result/result";
import { canManageOrganization } from "../../../shared/utils/roles";
import { Navbar } from "../../../shared/components/Navbar";
import { Alert } from "../../../shared/components/Alert";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { Users, Plus, Key, Edit2, Trash2, ShieldAlert, X } from "lucide-react";

export const OrganizationProfilesPage: React.FC<{ embedded?: boolean; createOnly?: boolean; sourceId?: string; onCreated?: (profile: Profile) => void; onCancelCreate?: () => void }> = ({ embedded = false, createOnly = false, sourceId: suppliedSourceId, onCreated, onCancelCreate }) => {
  const Container = embedded ? "section" : "main";
  const Heading = "h2";
  const [params] = useSearchParams();
  const sourceId = suppliedSourceId || params.get("sourceId");
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
  const [isModalOpen, setIsModalOpen] = useState(createOnly || params.get("create") === "1");
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteError,setDeleteError]=useState("");
  const saveLock=useRef(false);
  const formDialogRef=useModalFocus(isModalOpen,()=>{setIsModalOpen(false);onCancelCreate?.();},saving);

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
    if(saveLock.current)return;
    if (!organizationId) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg("O nome do perfil é obrigatório.");
      return;
    }

    saveLock.current=true;
    try {
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
        if (onCreated) onCreated(res.value);
        else if (sourceId) navigate(`/organizations/${organizationId}/data-sources/${encodeURIComponent(sourceId)}?step=access&profileId=${res.value.id}`);
        else await loadProfiles();
      }
    }
    } catch {setErrorMsg("Não foi possível salvar. Verifique os dados e tente novamente.");}
    finally {saveLock.current=false;setSaving(false);}
  };

  const handleDeleteConfirm = async () => {
    if(!deletingProfile||!organizationId)return false;
    setDeleteError("");
    const res=await catalogApi.deleteProfile(organizationId,deletingProfile.id);
    if(isErr(res)){setDeleteError(res.error.detail||"Erro ao excluir profile.");if(res.error.status===403)void refreshUser();return false;}
    setProfiles(current=>current.filter(profile=>profile.id!==deletingProfile.id));return true;
  };

  const profileModal = isModalOpen && (
          <div className="modal-backdrop">
            <div ref={formDialogRef} tabIndex={-1} className="modal-container admin-form-dialog" role="dialog" aria-modal="true" aria-label={editingProfile ? "Editar profile" : "Criar profile"} style={{ maxWidth: "500px" }}>
              <div className="modal-header">
                <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
                  {editingProfile ? `Editar Perfil: ${editingProfile.name}` : "Novo Perfil de Acesso"}
                </h3>
                <button aria-label="Fechar" disabled={saving} onClick={() => { if (!saving) {setIsModalOpen(false);onCancelCreate?.();} }} className="btn-icon">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} style={{ padding: "1.25rem" }}>
                {errorMsg && <Alert type="error" message={errorMsg} />}
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
                  <button type="button" onClick={() => { if (!saving) {setIsModalOpen(false);onCancelCreate?.();} }} className="btn btn-secondary" disabled={saving}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Salvando..." : editingProfile ? "Atualizar Perfil" : "Criar Perfil"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
  if (createOnly && !accessDenied && canManage) return profileModal;

  if (accessDenied || (!canManage && !loading)) {
    return (
      <>
        {!embedded && <Navbar />}
        <Container className={embedded ? "source-embedded organization-profiles" : "source-workspace organization-overview organization-profiles"}>
          <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
            <ShieldAlert size={48} style={{ color: "var(--danger-500)", marginBottom: "1rem" }} />
            <h2>Acesso Negado</h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto 1.5rem auto" }}>
              Apenas usuários Root ou Administradores podem gerenciar os perfis e suas permissões.
            </p>
          </div>
        </Container>
      </>
    );
  }

  return (
    <>
      {!embedded && <Navbar />}
      <Container className={embedded ? "source-embedded organization-profiles" : "source-workspace organization-overview organization-profiles"}>
        {!embedded&&<OrganizationContextHeader organizationId={organizationId||""} section="profiles" page="Profiles de acesso"/>}

        <header className="organization-section-header">
          <div>
            <Heading>Profiles de acesso</Heading>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>
              Defina quais dados cada grupo de membros poderá usar nos relatórios.
            </p>
          </div>
          <button onClick={openCreateModal} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Plus size={18} /> Novo Perfil
          </button>
        </header>

        {errorMsg && !isModalOpen && <Alert type="error" message={errorMsg} style={{ marginBottom: "1.25rem" }} />}

        {loading ? (
          <NeutralLoader message="Consultando profiles da organização…" />
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
          <div className="card organization-profiles-list" style={{ padding: 0 }}>
            <table className="table organization-profiles-table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr>
                  <th>Nome do Perfil</th>
                  {!embedded&&<th>Organização</th>}
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
                    {!embedded&&<td>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{profile.organizationName}</div>
                    </td>}
                    <td>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {profile.description || <span style={{ opacity: 0.5 }}>Sem descrição</span>}
                      </div>
                    </td>
                    <td className="organization-profile-actions" style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                        <button
                          onClick={() => navigate(`/organizations/${organizationId}/profiles/${profile.id}/grants`)}
                          className="btn btn-secondary"
                          style={{ padding: "0.35rem 0.6rem", fontSize: "0.775rem" }}
                          title="Gerenciar permissões do profile"
                        >
                          <Key size={14} /> Permissões
                        </button>
                        <SourceActionMenu label="Opções"><button onClick={() => openEditModal(profile)} className="btn-icon" title="Editar Perfil">
                          <Edit2 size={16} /> Editar profile
                        </button>
                        <button onClick={() => {setDeleteError("");setDeletingProfile(profile);}} className="btn-icon text-danger" title="Excluir Perfil">
                          <Trash2 size={16} /> Excluir profile
                        </button></SourceActionMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create / Edit Modal */}
        {profileModal}

        {deletingProfile && <ConfirmDeleteModal isOpen title="Excluir profile" itemName={deletingProfile.name} warningText="Esta ação revogará todos os grants associados a este profile e desvinculará os usuários associados." problem={null} errorMessage={deleteError} onClose={()=>{setDeletingProfile(null);setDeleteError("");}} onConfirm={handleDeleteConfirm}/>}
      </Container>
    </>
  );
};
