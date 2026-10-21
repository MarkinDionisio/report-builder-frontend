import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { getUserCapabilities, canCreateReport } from "../../../shared/utils/capabilities";
import { canManageOrganization } from "../../../shared/utils/roles";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === "initializing") {
    return <NeutralLoader />;
  }

  if (state.status === "anonymous") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const capabilities = getUserCapabilities(state.user);
  const path = location.pathname;
  const organizationMatch = path.match(/^\/organizations\/([^/]+)/);
  const organizationId = organizationMatch?.[1];
  const isReportDetail = /^\/reports\/[^/]+\/run$/.test(path);
  const isOrganizationCentral = Boolean(organizationId && path === `/organizations/${organizationId}`);
  const isCatalogRoute = path.startsWith("/catalog-templates") || path.startsWith("/data-sources") || path.startsWith("/report-schemas") || path.startsWith("/report-join-templates");
  const isOrganizationManagement = Boolean(organizationId && (path.includes("/members") || path.includes("/invitations") || path.includes("/profiles") || path.includes("/data-sources")));
  const isCreatorRoute = path === "/creator" || path.includes("/creator");

  const unavailable =
    (path === "/organizations" && !capabilities.canViewOrganizations) ||
    (isOrganizationCentral && organizationId && !canManageOrganization(state.user, organizationId)) ||
    (isCatalogRoute && !capabilities.canManageCatalog) ||
    (isOrganizationManagement && organizationId && !canManageOrganization(state.user, organizationId)) ||
    (isCreatorRoute && !isReportDetail && (organizationId ? !canCreateReport(state.user, organizationId) : !capabilities.canOpenCreatorWorkspace));

  if (unavailable) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};
