import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === "initializing") {
    return <NeutralLoader />;
  }

  if (state.status === "anonymous") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
