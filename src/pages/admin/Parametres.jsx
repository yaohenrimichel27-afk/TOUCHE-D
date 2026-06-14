import { useAuth } from "../../lib/AuthContext";
import { Settings, Info, Phone } from "lucide-react";

export default function Parametres() {
  const { userData } = useAuth();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Paramètres</h1>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Info size={18} color="var(--brand)" />
          <span style={{ fontWeight: 700, fontSize: 15 }}>Informations restaurant</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            ["Nom", "LA TOUCHE D"],
            ["Ville", "Bouaké, Côte d'Ivoire"],
            ["WhatsApp rapport", "+225 07 08 17 50 27"],
            ["Version système", "1.0.0"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--gray-100)" }}>
              <span style={{ fontSize: 13, color: "var(--gray-500)" }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Settings size={18} color="var(--brand)" />
          <span style={{ fontWeight: 700, fontSize: 15 }}>Mon compte</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "var(--gray-500)" }}>Nom</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{userData?.name}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "var(--gray-500)" }}>Rôle</span>
            <span className="badge badge-brand">{userData?.role === "admin" ? "Administrateur" : "Caissier"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
