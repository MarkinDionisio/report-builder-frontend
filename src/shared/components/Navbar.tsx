import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/context/AuthContext";
import { LogOut, LayoutDashboard, Building2, Menu, X, User, Server, FileText, Link as LinkIcon, PenTool } from "lucide-react";

export const Navbar: React.FC = () => {
  const { state, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const currentPath = location.pathname;

  // Close mobile menu whenever location/path changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  if (state.status !== "authenticated" || !state.user) {
    return null;
  }

  const user = state.user;

  const hasCreatorAccess = user.globalRole === "root" || 
    user.globalRole === "administrator" || 
    user.globalRole === "creator" || 
    user.organizations.some(org => org.organizationRole === "administrator" || org.organizationRole === "creator");

  return (
    <header className="header-nav">
      <div className="header-container">
        {/* Brand Logo */}
        <Link
          to="/dashboard"
          onClick={() => setIsOpen(false)}
          style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "inherit" }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "8px",
              background: "var(--accent-gradient)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.9rem",
              flexShrink: 0,
            }}
          >
            RB
          </div>
          <span style={{ fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Report Builder
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav">
          <Link
            to="/dashboard"
            className={`nav-link ${currentPath === "/dashboard" ? "active" : ""}`}
          >
            <LayoutDashboard size={16} /> Painel
          </Link>
          <Link
            to="/organizations"
            className={`nav-link ${currentPath.startsWith("/organizations") && !currentPath.includes("/creator") ? "active" : ""}`}
          >
            <Building2 size={16} /> Organizações
          </Link>
          {hasCreatorAccess && (
            <Link
              to="/creator"
              className={`nav-link ${currentPath.includes("/creator") ? "active" : ""}`}
            >
              <PenTool size={16} /> Creator Workspace
            </Link>
          )}
          {user.globalRole === "root" && (
            <>
              <Link
                to="/data-sources"
                className={`nav-link ${currentPath.startsWith("/data-sources") ? "active" : ""}`}
              >
                <Server size={16} /> DataSources
              </Link>
              <Link
                to="/report-schemas"
                className={`nav-link ${currentPath.startsWith("/report-schemas") ? "active" : ""}`}
              >
                <FileText size={16} /> Catálogo
              </Link>
              <Link
                to="/report-join-templates"
                className={`nav-link ${currentPath.startsWith("/report-join-templates") ? "active" : ""}`}
              >
                <LinkIcon size={16} /> Joins
              </Link>
            </>
          )}
        </nav>

        {/* Desktop User Info & Logout */}
        <div className="desktop-user-actions">
          <div className="header-user-info">
            <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{user.name}</div>
            <div className="user-email" style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              {user.email}
            </div>
          </div>
          <button onClick={logout} className="btn btn-secondary" style={{ padding: "0.45rem 0.85rem" }}>
            <LogOut size={16} /> <span style={{ fontSize: "0.875rem" }}>Sair</span>
          </button>
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="mobile-hamburger-btn"
          aria-label="Abrir menu de navegação"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="mobile-menu-drawer animate-fade-in">
          <div className="mobile-user-card">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "rgba(99, 102, 241, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--primary-500)",
                }}
              >
                <User size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{user.name}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{user.email}</div>
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color: "var(--primary-500)",
                    marginTop: "0.2rem",
                  }}
                >
                  Papel: {user.globalRole}
                </span>
              </div>
            </div>
          </div>

          <nav className="mobile-nav-links">
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className={`mobile-nav-link ${currentPath === "/dashboard" ? "active" : ""}`}
            >
              <LayoutDashboard size={20} />
              <span>Painel</span>
            </Link>
            <Link
              to="/organizations"
              onClick={() => setIsOpen(false)}
              className={`mobile-nav-link ${currentPath.startsWith("/organizations") && !currentPath.includes("/creator") ? "active" : ""}`}
            >
              <Building2 size={20} />
              <span>Organizações</span>
            </Link>
            {hasCreatorAccess && (
              <Link
                to="/creator"
                onClick={() => setIsOpen(false)}
                className={`mobile-nav-link ${currentPath.includes("/creator") ? "active" : ""}`}
              >
                <PenTool size={20} />
                <span>Creator Workspace</span>
              </Link>
            )}
            {user.globalRole === "root" && (
              <>
                <Link
                  to="/data-sources"
                  onClick={() => setIsOpen(false)}
                  className={`mobile-nav-link ${currentPath.startsWith("/data-sources") ? "active" : ""}`}
                >
                  <Server size={20} />
                  <span>DataSources</span>
                </Link>
                <Link
                  to="/report-schemas"
                  onClick={() => setIsOpen(false)}
                  className={`mobile-nav-link ${currentPath.startsWith("/report-schemas") ? "active" : ""}`}
                >
                  <FileText size={20} />
                  <span>Catálogo</span>
                </Link>
                <Link
                  to="/report-join-templates"
                  onClick={() => setIsOpen(false)}
                  className={`mobile-nav-link ${currentPath.startsWith("/report-join-templates") ? "active" : ""}`}
                >
                  <LinkIcon size={20} />
                  <span>Joins</span>
                </Link>
              </>
            )}
          </nav>

          <div style={{ paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="btn btn-secondary"
              style={{ width: "100%", justifyContent: "center", minHeight: "48px" }}
            >
              <LogOut size={18} /> Sair da Conta
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
