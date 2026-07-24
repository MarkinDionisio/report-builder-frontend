import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../features/auth/context/AuthContext";
import { AppRoutes } from "./routes";
import "../shared/styles/global.css";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
