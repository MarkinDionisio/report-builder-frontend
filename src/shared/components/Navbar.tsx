import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/context/AuthContext";
import { LogOut, LayoutDashboard, Building2, Menu, X, Server, FileText, Link as LinkIcon, PenTool, PanelLeftClose, PanelLeftOpen, ChevronDown } from "lucide-react";
import { getUserCapabilities } from "../utils/capabilities";

export const Navbar: React.FC = () => {
  const { state, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem("rb.sidebar.collapsed") === "true");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const currentPath = location.pathname;

  // Close mobile menu whenever location/path changes
  useEffect(() => {
    setIsOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.add("has-app-shell");
    document.body.classList.toggle("has-collapsed-sidebar", isCollapsed);
    localStorage.setItem("rb.sidebar.collapsed", String(isCollapsed));
    return () => {
      document.body.classList.remove("has-app-shell", "has-collapsed-sidebar");
    };
  }, [isCollapsed]);

  if (state.status !== "authenticated" || !state.user) {
    return null;
  }

  const user = state.user;

  const capabilities = getUserCapabilities(user);

  const links = [
    { section: "Visão geral", to: "/dashboard", label: "Painel", icon: LayoutDashboard, visible: true, active: currentPath === "/dashboard" },
    { section: "Organização", to: "/organizations", label: "Organizações", icon: Building2, visible: capabilities.canViewOrganizations, active: currentPath.startsWith("/organizations") && !currentPath.includes("/creator") },
    { section: "Relatórios", to: "/creator", label: "Área de criação", icon: PenTool, visible: capabilities.canOpenCreatorWorkspace, active: currentPath.includes("/creator") },
    { section: "Administração", to: "/data-sources", label: "Fontes de dados", icon: Server, visible: capabilities.canManageDataSources, active: currentPath.startsWith("/data-sources") },
    { section: "Administração", to: "/report-schemas", label: "Catálogo", icon: FileText, visible: capabilities.canManageCatalog, active: currentPath.startsWith("/report-schemas") },
    { section: "Administração", to: "/report-join-templates", label: "Modelos de junção", icon: LinkIcon, visible: capabilities.canManageJoinTemplates, active: currentPath.startsWith("/report-join-templates") },
  ].filter((item) => item.visible);

  return (
    <>
      <header className="app-topbar">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="mobile-hamburger-btn"
          aria-label="Abrir menu de navegação"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <span className="app-topbar__context">{links.find((item) => item.active)?.label || "Report Builder"}</span>
        <div className="app-user-menu">
          <button className="app-user-menu__trigger" onClick={() => setUserMenuOpen((value) => !value)} aria-expanded={userMenuOpen}>
            <span className="app-avatar">{user.name.slice(0, 1).toUpperCase()}</span>
            <span><strong>{user.name}</strong><small>{user.email}</small></span><ChevronDown size={16}/>
          </button>
          {userMenuOpen && <div className="app-user-menu__popover"><span className="status-badge">{user.globalRole}</span><button onClick={logout}><LogOut size={16}/> Sair da conta</button></div>}
        </div>
      </header>
      {isOpen && <button className="app-sidebar-backdrop" aria-label="Fechar menu de navegação" onClick={() => setIsOpen(false)}/>}
      <aside className={`app-sidebar ${isOpen ? "is-open" : ""} ${isCollapsed ? "is-collapsed" : ""}`}>
        <div className="app-sidebar__brand"><span className="app-logo">RB</span><span className="app-brand-copy"><strong>Report Builder</strong><small>Analytics workspace</small></span></div>
        <nav aria-label="Navegação principal">
          {[...new Set(links.map((item) => item.section))].map((section) => <div className="app-nav-group" key={section}>
            <span className="app-nav-group__label">{section}</span>
            {links.filter((item) => item.section === section).map(({ to, label, icon: Icon, active }) => <Link key={to} to={to} title={isCollapsed ? label : undefined} className={`app-nav-link ${active ? "active" : ""}`} onClick={() => setIsOpen(false)}><Icon size={19}/><span>{label}</span></Link>)}
          </div>)}
        </nav>
        <button className="app-sidebar__collapse" onClick={() => setIsCollapsed((value) => !value)} aria-label={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}>{isCollapsed ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}<span>{isCollapsed ? "" : "Recolher menu"}</span></button>
      </aside>
    </>
  );
};
