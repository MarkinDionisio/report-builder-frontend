import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { AcceptInvitationPage } from "../features/auth/pages/AcceptInvitationPage";
import { ProtectedRoute } from "../features/auth/components/ProtectedRoute";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { OrganizationsListPage } from "../features/organizations/pages/OrganizationsListPage";
import { OrganizationDetailPage } from "../features/organizations/pages/OrganizationDetailPage";
import { OrganizationMembersPage } from "../features/organizations/pages/OrganizationMembersPage";
import { OrganizationInvitationsPage } from "../features/organizations/pages/OrganizationInvitationsPage";
import { ReportFieldsPage } from "../features/catalog/pages/ReportFieldsPage";
import { OrganizationProfilesPage } from "../features/catalog/pages/OrganizationProfilesPage";
import { ProfileGrantsEditorPage } from "../features/catalog/pages/ProfileGrantsEditorPage";
import { DataSourcesPage } from "../features/catalog/pages/DataSourcesPage";
import { ReportSchemasPage } from "../features/catalog/pages/ReportSchemasPage";
import { ReportJoinTemplatesPage } from "../features/catalog/pages/ReportJoinTemplatesPage";
import { CreatorWorkspacePage } from "../features/creator/pages/CreatorWorkspacePage";
import { OrganizationCreatorDashboardPage } from "../features/creator/pages/OrganizationCreatorDashboardPage";
import { ReportDesignerPage } from "../features/creator/pages/ReportDesignerPage";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Unauthenticated Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/invitations/accept" element={<AcceptInvitationPage />} />

      {/* Protected Authenticated Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizations"
        element={
          <ProtectedRoute>
            <OrganizationsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizations/:organizationId"
        element={
          <ProtectedRoute>
            <OrganizationDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizations/:organizationId/members"
        element={
          <ProtectedRoute>
            <OrganizationMembersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizations/:organizationId/invitations"
        element={
          <ProtectedRoute>
            <OrganizationInvitationsPage />
          </ProtectedRoute>
        }
      />

      {/* Creator Workspace Routes */}
      <Route
        path="/creator"
        element={
          <ProtectedRoute>
            <CreatorWorkspacePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizations/:organizationId/creator"
        element={
          <ProtectedRoute>
            <OrganizationCreatorDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizations/:organizationId/creator/reports/new"
        element={
          <ProtectedRoute>
            <ReportDesignerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizations/:organizationId/creator/reports/:reportId"
        element={
          <ProtectedRoute>
            <ReportDesignerPage />
          </ProtectedRoute>
        }
      />

      {/* Administrative Catalog Routes - Centralized under Organizations */}
      <Route
        path="/data-sources"
        element={
          <ProtectedRoute>
            <DataSourcesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report-schemas"
        element={
          <ProtectedRoute>
            <ReportSchemasPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report-schemas/:schemaId/fields"
        element={
          <ProtectedRoute>
            <ReportFieldsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report-join-templates"
        element={
          <ProtectedRoute>
            <ReportJoinTemplatesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizations/:organizationId/profiles"
        element={
          <ProtectedRoute>
            <OrganizationProfilesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizations/:organizationId/profiles/:profileId/grants"
        element={
          <ProtectedRoute>
            <ProfileGrantsEditorPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback Catch-all Route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

