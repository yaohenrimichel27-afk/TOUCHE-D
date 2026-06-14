import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  TrendingUp, ShoppingBag, UtensilsCrossed, Droplets,
  Calendar, MessageCircle
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, startOfDay, startOfWeek, startOfMonth, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { buildRapportMessage } from "../../lib/whatsapp";
import WhatsAppModal from "../../components/shared/WhatsAppModal";

const PERIODS = ["Aujourd'hui", "Semaine", "Mois"];

export default function Dashboard() {
  const [period, setPeriod] = useState("Aujourd'hui");
  const [orders, setOrders] = useState([]);
  const [showWA, setShowWA] = useState(false);

  const getStart = () => {
    if (period === "Aujourd'hui") return startOfDay(new Date());
    if (period === "Semaine") return startOfWeek(new Date(), { weekStartsOn: 1 });
    return startOfMonth(new Date());
  };

  useEffect(() => {
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
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));

    return { totalVentes, nbCommandes, platsVendus, boissonsVendues, topProduits };
  }, [orders]);

  // Chart data — last 7 days
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
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 48, height: 48, background: `${color}20`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: "var(--gray-500)", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 2 }}>
          {typeof value === "number" ? value.toLocaleString("fr-FR") : value}{suffix}
        </div>
      </div>
    </div>
  );

  const rapportData = {
    date: format(new Date(), "dd MMMM yyyy", { locale: fr }),
    ...stats,
    _messageText: buildRapportMessage({
      date: format(new Date(), "dd MMMM yyyy", { locale: fr }),
      ...stats
    })
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="fade-in">

      {/* Title + Period */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Tableau de bord</h1>
          <p style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 2 }}>
            {format(new Date(), "EEEE dd MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, background: "var(--white)", padding: 4, borderRadius: 10, boxShadow: "var(--shadow)" }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: "8px 14px", borderRadius: 8, border: "none",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              background: period === p ? "var(--brand)" : "transparent",
              color: period === p ? "white" : "var(--gray-500)",
              transition: "all 0.15s"
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid-2" style={{ gap: 12 }}>
        <StatCard label="Total ventes" value={stats.totalVentes} icon={TrendingUp} suffix=" FCFA" />
        <StatCard label="Commandes" value={stats.nbCommandes} icon={ShoppingBag} color="#7C3AED" />
        <StatCard label="Plats vendus" value={stats.platsVendus} icon={UtensilsCrossed} color="#D97706" />
        <StatCard label="Boissons vendues" value={stats.boissonsVendues} icon={Droplets} color="#0891B2" />
      </div>

      {/* Chart */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Évolution des ventes (7 jours)</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--gray-500)" }} />
            <YAxis tick={{ fontSize: 10, fill: "var(--gray-500)" }} width={50} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => [`${v.toLocaleString("fr-FR")} FCFA`, "Ventes"]} labelStyle={{ fontWeight: 600 }} />
            <Line type="monotone" dataKey="total" stroke="var(--brand)" strokeWidth={2.5} dot={{ fill: "var(--brand)", r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top products + WhatsApp */}
      <div className="grid-2" style={{ gap: 12 }}>
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>🏆 Top produits</div>
          {stats.topProduits.length === 0 ? (
            <div className="empty-state" style={{ padding: "20px 0" }}><p>Aucune vente</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stats.topProduits.map((p, i) => (
                <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "var(--gray-100)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, color: i < 3 ? "white" : "var(--gray-500)"
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)" }}>{p.qty} vdus</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>📤 Rapport du jour</div>
            <div style={{ fontSize: 12, color: "var(--gray-500)", lineHeight: 1.6 }}>
              Total : <strong>{stats.totalVentes.toLocaleString("fr-FR")} FCFA</strong><br />
              Commandes : <strong>{stats.nbCommandes}</strong><br />
              Plats : <strong>{stats.platsVendus}</strong> · Boissons : <strong>{stats.boissonsVendues}</strong>
            </div>
          </div>
          <button
            className="btn"
            style={{ background: "#25D366", color: "white", width: "100%", marginTop: 16, gap: 8 }}
            onClick={() => setShowWA(true)}
          >
            <MessageCircle size={18} />
            Envoyer sur WhatsApp
          </button>
        </div>
      </div>

      {/* Recent orders */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Commandes récentes</div>
        {orders.length === 0 ? (
          <div className="empty-state"><p>Aucune commande sur cette période</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {orders.slice(0, 8).map(o => (
              <div key={o.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 12px", background: "var(--cream)", borderRadius: 10
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {o.items?.map(i => `${i.name} x${i.quantity}`).join(", ")}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 2 }}>
                    {o.timestamp?.toDate
                      ? format(o.timestamp.toDate(), "dd/MM HH:mm")
                      : "—"} · {o.createdByName}
                  </div>
                </div>
                <div style={{ fontWeight: 800, color: "var(--brand)", fontSize: 14, whiteSpace: "nowrap" }}>
                  {(o.total || 0).toLocaleString("fr-FR")} F
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showWA && <WhatsAppModal rapportData={rapportData} onClose={() => setShowWA(false)} />}
    </div>
  );
}
