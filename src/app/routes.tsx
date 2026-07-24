import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { AcceptInvitationPage } from "../features/auth/pages/AcceptInvitationPage";
import { ProtectedRoute } from "../features/auth/components/ProtectedRoute";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { OrganizationsListPage } from "../features/organizations/pages/OrganizationsListPage";
import { OrganizationMembersPage } from "../features/organizations/pages/OrganizationMembersPage";
import { OrganizationInvitationsPage } from "../features/organizations/pages/OrganizationInvitationsPage";

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

      {/* Fallback Catch-all Route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
