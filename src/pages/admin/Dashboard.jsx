import { useState, useEffect, useMemo, useRef } from "react";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  TrendingUp, ShoppingBag, UtensilsCrossed, Droplets, MessageCircle, Target, Bell
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, startOfDay, startOfWeek, startOfMonth, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { buildRapportMessage } from "../../lib/whatsapp";
import WhatsAppModal from "../../components/shared/WhatsAppModal";
import { getObjectif, notifierObjectifAtteint, ecouterNotifications } from "../../lib/notifications";
import { useToast } from "../../components/shared/Toast";

const PERIODS = ["Aujourd'hui", "Semaine", "Mois"];

export default function Dashboard() {
  const toast = useToast();
  const [period, setPeriod] = useState("Aujourd'hui");
  const [orders, setOrders] = useState([]);
  const [showWA, setShowWA] = useState(false);
  const [objectif, setObjectif] = useState(100000);
  const objectifNotifié = useRef(false); // évite de notifier 2x

  // Charge objectif
  useEffect(() => {
    getObjectif().then(setObjectif);
  }, []);

  // Écoute notifications foreground
  useEffect(() => {
    const unsub = ecouterNotifications((payload) => {
      toast(`🔔 ${payload.notification?.title || "Notification"}`, "info");
    });
    return unsub;
  }, []);

  const getStart = () => {
    if (period === "Aujourd'hui") return startOfDay(new Date());
    if (period === "Semaine") return startOfWeek(new Date(), { weekStartsOn: 1 });
    return startOfMonth(new Date());
  };

  useEffect(() => {
    objectifNotifié.current = false; // reset quand période change
    const start = Timestamp.fromDate(getStart());
    const q = query(collection(db, "orders"), where("timestamp", ">=", start), orderBy("timestamp", "desc"));
    return onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [period]);

  const stats = useMemo(() => {
    const totalVentes = orders.reduce((s, o) => s + (o.total || 0), 0);
    const nbCommandes = orders.length;
    let platsVendus = 0, boissonsVendues = 0;
    const prodMap = {};
    orders.forEach(o => {
      o.items?.forEach(item => {
        if (item.category === "Boissons") boissonsVendues += item.quantity;
        else platsVendus += item.quantity;
        prodMap[item.name] = (prodMap[item.name] || 0) + item.quantity;
      });
    });
    const topProduits = Object.entries(prodMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));
    return { totalVentes, nbCommandes, platsVendus, boissonsVendues, topProduits };
  }, [orders]);

  // Détecte objectif atteint
  useEffect(() => {
    if (
      period === "Aujourd'hui" &&
      stats.totalVentes >= objectif &&
      objectif > 0 &&
      !objectifNotifié.current
    ) {
      objectifNotifié.current = true;
      notifierObjectifAtteint(stats.totalVentes, objectif);
      toast(`🎯 Objectif de ${objectif.toLocaleString("fr-FR")} FCFA atteint !`, "success");
    }
  }, [stats.totalVentes, objectif, period]);

  // Progression objectif (aujourd'hui seulement)
  const progression = period === "Aujourd'hui"
    ? Math.min(Math.round((stats.totalVentes / objectif) * 100), 100)
    : null;

  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      return { label: format(d, "EEE", { locale: fr }), date: format(d, "yyyy-MM-dd"), total: 0 };
    });
    orders.forEach(o => {
      const ts = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.timestamp);
      const key = format(ts, "yyyy-MM-dd");
      const day = days.find(d => d.date === key);
      if (day) day.total += o.total || 0;
    });
    return days;
  }, [orders]);

  const StatCard = ({ label, value, icon: Icon, color = "var(--brand)", suffix = "" }) => (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
      <div style={{ width: 42, height: 42, background: `${color}18`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "var(--gray-500)", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {typeof value === "number" ? value.toLocaleString("fr-FR") : value}{suffix}
        </div>
      </div>
    </div>
  );

  const rapportData = {
    date: format(new Date(), "dd MMMM yyyy", { locale: fr }),
    ...stats,
    _messageText: buildRapportMessage({ date: format(new Date(), "dd MMMM yyyy", { locale: fr }), ...stats })
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} className="fade-in">

      {/* Title + période */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Tableau de bord</h1>
          <p style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 1 }}>
            {format(new Date(), "EEEE dd MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 4, background: "var(--white)", padding: 3, borderRadius: 10, boxShadow: "var(--shadow)" }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: "7px 11px", borderRadius: 8, border: "none",
              fontWeight: 600, fontSize: 12, cursor: "pointer",
              background: period === p ? "var(--brand)" : "transparent",
              color: period === p ? "white" : "var(--gray-500)", transition: "all 0.15s"
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* Barre progression objectif */}
      {progression !== null && (
        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Target size={15} color="var(--brand)" />
              <span style={{ fontWeight: 700, fontSize: 13 }}>Objectif du jour</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: progression >= 100 ? "var(--success)" : "var(--brand)" }}>
              {progression}% {progression >= 100 && "🎯"}
            </span>
          </div>
          <div style={{ background: "var(--gray-100)", borderRadius: 20, height: 10, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 20,
              background: progression >= 100
                ? "var(--success)"
                : "linear-gradient(90deg, var(--brand) 0%, var(--brand-light) 100%)",
              width: `${progression}%`,
              transition: "width 0.6s ease"
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 11, color: "var(--gray-500)" }}>{stats.totalVentes.toLocaleString("fr-FR")} FCFA</span>
            <span style={{ fontSize: 11, color: "var(--gray-500)" }}>Objectif : {objectif.toLocaleString("fr-FR")} FCFA</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid-2">
        <StatCard label="Total ventes" value={stats.totalVentes} icon={TrendingUp} suffix=" FCFA" />
        <StatCard label="Commandes" value={stats.nbCommandes} icon={ShoppingBag} color="#7C3AED" />
        <StatCard label="Plats vendus" value={stats.platsVendus} icon={UtensilsCrossed} color="#D97706" />
        <StatCard label="Boissons" value={stats.boissonsVendues} icon={Droplets} color="#0891B2" />
      </div>

      {/* Graphique */}
      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Évolution 7 jours</div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--gray-500)" }} />
            <YAxis tick={{ fontSize: 9, fill: "var(--gray-500)" }} width={42} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={v => [`${v.toLocaleString("fr-FR")} FCFA`, "Ventes"]} labelStyle={{ fontWeight: 600, fontSize: 12 }} contentStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="total" stroke="var(--brand)" strokeWidth={2.5} dot={{ fill: "var(--brand)", r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top + WhatsApp */}
      <div className="grid-2">
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🏆 Top produits</div>
          {!stats.topProduits.length ? (
            <div className="empty-state" style={{ padding: "16px 0" }}><p style={{ fontSize: 12 }}>Aucune vente</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {stats.topProduits.map((p, i) => (
                <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                    background: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "var(--gray-100)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 800, color: i < 3 ? "white" : "var(--gray-500)"
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", flexShrink: 0 }}>{p.qty}×</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>📤 Rapport</div>
            <div style={{ fontSize: 11, color: "var(--gray-500)", lineHeight: 1.7 }}>
              <div>💰 {stats.totalVentes.toLocaleString("fr-FR")} FCFA</div>
              <div>🧾 {stats.nbCommandes} commandes</div>
              <div>🍽️ {stats.platsVendus} plats</div>
              <div>🥤 {stats.boissonsVendues} boissons</div>
            </div>
          </div>
          <button
            className="btn"
            style={{ background: "#25D366", color: "white", width: "100%", marginTop: 12, gap: 7, padding: "11px 14px", fontSize: 13 }}
            onClick={() => setShowWA(true)}
          >
            <MessageCircle size={16} /> WhatsApp
          </button>
        </div>
      </div>

      {/* Commandes récentes */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 14px", fontWeight: 700, fontSize: 14, borderBottom: "1px solid var(--gray-100)" }}>
          Commandes récentes
        </div>
        {!orders.length ? (
          <div className="empty-state"><p>Aucune commande</p></div>
        ) : orders.slice(0, 6).map(o => (
          <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--gray-100)" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {o.items?.map(i => `${i.name} ×${i.quantity}`).join(", ")}
              </div>
              <div style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 1 }}>
                {o.timestamp?.toDate ? format(o.timestamp.toDate(), "dd/MM HH:mm") : "—"} · {o.createdByName}
              </div>
            </div>
            <div style={{ fontWeight: 800, color: "var(--brand)", fontSize: 13, whiteSpace: "nowrap", marginLeft: 10 }}>
              {(o.total || 0).toLocaleString("fr-FR")} F
            </div>
          </div>
        ))}
      </div>

      {showWA && <WhatsAppModal rapportData={rapportData} onClose={() => setShowWA(false)} />}
    </div>
  );
}
