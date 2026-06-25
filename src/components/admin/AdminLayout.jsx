import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext";
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  FileText,
  Users,
  Settings,
  LogOut,
  ChefHat,
  Menu,
  X,
  Receipt
} from "lucide-react";

const NAV = [
  { to: "/admin", icon: LayoutDashboard, label: "Tableau de bord", end: true },
  { to: "/admin/commandes", icon: ShoppingBag, label: "Commandes" },
  { to: "/admin/menu", icon: UtensilsCrossed, label: "Menu & Prix" },
  { to: "/admin/depenses", icon: Receipt, label: "Depenses" },
  { to: "/admin/rapports", icon: FileText, label: "Rapports" },
  { to: "/admin/utilisateurs", icon: Users, label: "Utilisateurs" },
  { to: "/admin/parametres", icon: Settings, label: "Parametres" }
];

export default function AdminLayout() {
  const { userData, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "20px 16px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: "var(--brand)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <ChefHat size={20} color="white" />
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                color: "white",
                fontSize: 16
              }}
            >
              La Touche D
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Administration</div>
          </div>
        </div>
        <div
          style={{
            marginTop: 16,
            padding: "10px 12px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: 10
          }}
        >
          <div style={{ color: "white", fontWeight: 600, fontSize: 13 }}>{userData?.name || "Admin"}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
            <span
              style={{
                background: "var(--brand)",
                color: "white",
                padding: "1px 8px",
                borderRadius: 10,
                fontSize: 10
              }}
            >
              Administrateur
            </span>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "16px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 14px",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 14,
              transition: "all 0.15s",
              background: isActive ? "var(--brand)" : "transparent",
              color: isActive ? "white" : "rgba(255,255,255,0.55)"
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: "16px 10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button
          onClick={logout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "11px 14px",
            borderRadius: 10,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.4)",
            fontWeight: 600,
            fontSize: 14,
            transition: "all 0.15s"
          }}
        >
          <LogOut size={18} /> Deconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 240,
          background: "var(--gray-900)",
          flexShrink: 0,
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          zIndex: 200,
          display: "none"
        }}
        className="desktop-sidebar"
      >
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex" }}>
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}
            onClick={() => setSidebarOpen(false)}
          />
          <aside style={{ width: 260, background: "var(--gray-900)", position: "relative", zIndex: 1 }}>
            <button
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "white"
              }}
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <main style={{ flex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <header
          style={{
            background: "var(--dark)",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            position: "sticky",
            top: 0,
            zIndex: 100
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: 8,
              padding: "8px",
              cursor: "pointer",
              color: "white"
            }}
          >
            <Menu size={20} />
          </button>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              color: "white",
              fontSize: 16
            }}
          >
            La Touche D
          </div>
          <div style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            {userData?.name}
          </div>
        </header>

        <div style={{ flex: 1, padding: 16, maxWidth: 1200, width: "100%", margin: "0 auto" }}>
          <Outlet />
        </div>
      </main>

      <style>{`
        @media (min-width: 768px) {
          .desktop-sidebar { display: flex !important; }
          main { margin-left: 240px; }
          header { display: none !important; }
        }
      `}</style>
    </div>
  );
}
