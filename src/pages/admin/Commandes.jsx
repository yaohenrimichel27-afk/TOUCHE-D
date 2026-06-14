import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, where, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ShoppingBag, Clock } from "lucide-react";

const PERIODS = ["Aujourd'hui", "Cette semaine", "Ce mois"];

export default function Commandes() {
  const [orders, setOrders] = useState([]);
  const [period, setPeriod] = useState("Aujourd'hui");

  const getStart = () => {
    const now = new Date();
    if (period === "Aujourd'hui") { const d = new Date(now); d.setHours(0,0,0,0); return d; }
    if (period === "Cette semaine") { const d = new Date(now); d.setDate(d.getDate() - d.getDay() + 1); d.setHours(0,0,0,0); return d; }
    return new Date(now.getFullYear(), now.getMonth(), 1);
  };

  useEffect(() => {
    const start = Timestamp.fromDate(getStart());
    const q = query(collection(db, "orders"), where("timestamp", ">=", start), orderBy("timestamp", "desc"));
    return onSnapshot(q, snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [period]);

  const total = orders.reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Commandes</h1>
          <p style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 2 }}>{orders.length} commande(s) · {total.toLocaleString("fr-FR")} FCFA</p>
        </div>
        <div style={{ display: "flex", gap: 6, background: "var(--white)", padding: 4, borderRadius: 10, boxShadow: "var(--shadow)" }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: "7px 12px", borderRadius: 8, border: "none",
              fontWeight: 600, fontSize: 12, cursor: "pointer",
              background: period === p ? "var(--brand)" : "transparent",
              color: period === p ? "white" : "var(--gray-500)"
            }}>{p}</button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state card"><ShoppingBag size={32} /><p>Aucune commande sur cette période</p></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {orders.map(o => (
            <div key={o.id} className="card" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Clock size={14} color="var(--gray-500)" />
                  <span style={{ fontSize: 13, color: "var(--gray-500)" }}>
                    {o.timestamp?.toDate ? format(o.timestamp.toDate(), "dd MMM yyyy à HH:mm", { locale: fr }) : "—"}
                  </span>
                </div>
                <span style={{ fontWeight: 800, fontSize: 16, color: "var(--brand)" }}>
                  {(o.total || 0).toLocaleString("fr-FR")} FCFA
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {o.items?.map((item, i) => (
                  <span key={i} className="badge badge-brand">
                    {item.name} ×{item.quantity}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 8 }}>Caissier : {o.createdByName}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
