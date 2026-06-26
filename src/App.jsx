import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { ToastProvider } from "./components/shared/Toast";
import Login from "./pages/Login";
import POS from "./pages/POS";
import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Commandes from "./pages/admin/Commandes";
import Menu from "./pages/admin/Menu";
import Depenses from "./pages/admin/Depenses";
import Rapports from "./pages/admin/Rapports";
import Utilisateurs from "./pages/admin/Utilisateurs";
import Parametres from "./pages/admin/Parametres";
import "./styles/global.css";

function AppRoutes() {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--dark)"
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid rgba(200,75,15,0.3)",
              borderTopColor: "var(--brand)",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
              margin: "0 auto 16px"
            }}
          />
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Chargement...</div>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  if (userData?.role === "admin") {
    return (
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="commandes" element={<Commandes />} />
          <Route path="menu" element={<Menu />} />
          <Route path="depenses" element={<Depenses />} />
          <Route path="rapports" element={<Rapports />} />
          <Route path="utilisateurs" element={<Utilisateurs />} />
          <Route path="parametres" element={<Parametres />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/caisse" element={<POS />} />
      <Route path="*" element={<Navigate to="/caisse" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
