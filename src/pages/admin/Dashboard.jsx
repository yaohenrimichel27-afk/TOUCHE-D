import { useState, useEffect, useMemo, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  TrendingUp,
  ShoppingBag,
  UtensilsCrossed,
  Droplets,
  MessageCircle,
  Target,
  Banknote,
  Receipt,
  Wallet,
  AlertTriangle,
  PackageX
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { format, startOfDay, startOfWeek, startOfMonth, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { buildRapportMessage } from "../../lib/whatsapp";
import WhatsAppModal from "../../components/shared/WhatsAppModal";
import { getObjectif, notifierObjectifAtteint, ecouterNotifications } from "../../lib/notifications";
import { useToast } from "../../components/shared/Toast";

const PERIODS = ["Aujourd'hui", "Semaine", "Mois"];
const SEUIL_ALERTE = 5;

const PAYMENT_INFO = {
  especes: { label: "Especes", color: "#16A34A", type: "icon" },
  orange_money: {
    label: "Orange Money",
    color: "#FF7900",
    type: "image",
    url: "https://res.cloudinary.com/dhdvyuaoy/image/upload/v1782312905/IMG_3609_mwypnh.png"
  },
  wave: {
    label: "Wave",
    color: "#1DC8E5",
    type: "image",
    url: "https://res.cloudinary.com/dhdvyuaoy/image/upload/v1782312906/IMG_3610_ozhzqd.jpg"
  }
};

export default function Dashboard() {
  const toast = useToast();
  const [period, setPeriod] = useState("Aujourd'hui");
  const [orders, setOrders] = useState([]);
  const [depenses, setDepenses] = useState([]);
  const [products, setProducts] = useState([]);
  const [showWA, setShowWA] = useState(false);
  const [showStockWA, setShowStockWA] = useState(false);
  const [objectif, setObjectif] = useState(100000);
  const objectifNotifie = useRef(false);

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("name"));
    return onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    getObjectif().then(setObjectif);
  }, []);

  useEffect(() => {
    const unsub = ecouterNotifications((payload) => {
      toast("🔔 " + (payload.notification?.title || "Notification"), "info");
    });
    return unsub;
  }, []);

  const getStart = () => {
    if (period === "Aujourd'hui") return startOfDay(new Date());
    if (period === "Semaine") return startOfWeek(new Date(), { weekStartsOn: 1 });
    return startOfMonth(new Date());
  };

  useEffect(() => {
    objectifNotifie.current = false;
    const start = Timestamp.fromDate(getStart());

    const qOrders = query(
      collection(db, "orders"),
      where("timestamp", ">=", start),
      orderBy("timestamp", "desc")
    );
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const qDepenses = query(
      collection(db, "depenses"),
      where("timestamp", ">=", start),
      orderBy("timestamp", "desc")
    );
    const unsubDepenses = onSnapshot(qDepenses, (snap) => {
      setDepenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubOrders();
      unsubDepenses();
    };
  }, [period]);

  const stats = useMemo(() => {
    const totalVentes = orders.reduce((s, o) => s + (o.total || 0), 0);
    const nbCommandes = orders.length;
    let platsVendus = 0;
    let boissonsVendues = 0;
    const prodMap = {};
    const paiementMap = { especes: 0, orange_money: 0, wave: 0 };

    orders.forEach((o) => {
      const method = o.paymentMethod || "especes";
      paiementMap[method] = (paiementMap[method] || 0) + (o.total || 0);

      o.items?.forEach((item) => {
        if (item.category === "Boissons") boissonsVendues += item.quantity;
        else platsVendus += item.quantity;
        prodMap[item.name] = (prodMap[item.name] || 0) + item.quantity;
      });
    });

    const topProduits = Object.entries(prodMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));

    const totalDepenses = depenses.reduce((s, d) => s + (d.montant || 0), 0);
    const benefice = totalVentes - totalDepenses;

    return {
      totalVentes,
      nbCommandes,
      platsVendus,
      boissonsVendues,
      topProduits,
      paiementMap,
      totalDepenses,
      benefice
    };
  }, [orders, depenses]);

  useEffect(() => {
    if (
      period === "Aujourd'hui" &&
      stats.totalVentes >= objectif &&
      objectif > 0 &&
      !objectifNotifie.current
    ) {
      objectifNotifie.current = true;
      notifierObjectifAtteint(stats.totalVentes, objectif);
      toast("🎯 Objectif de " + objectif.toLocaleString("fr-FR") + " FCFA atteint !", "success");
    }
  }, [stats.totalVentes, objectif, period]);

  const progression =
    period === "Aujourd'hui"
      ? Math.min(Math.round((stats.totalVentes / objectif) * 100), 100)
      : null;

  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      return {
        label: format(d, "EEE", { locale: fr }),
        date: format(d, "yyyy-MM-dd"),
        total: 0
      };
    });
    orders.forEach((o) => {
      const ts = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.timestamp);
      const key = format(ts, "yyyy-MM-dd");
      const day = days.find((d) => d.date === key);
      if (day) day.total += o.total || 0;
    });
    return days;
  }, [orders]);

  const StatCard = ({ label, value, icon: Icon, color = "var(--brand)", suffix = "" }) => (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
      <div
        style={{
          width: 42,
          height: 42,
          background: color + "18",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}
      >
        <Icon size={20} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "var(--gray-500)", fontWeight: 500 }}>{label}</div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color,
            marginTop: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
        >
          {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
          {suffix}
        </div>
      </div>
    </div>
  );

  const stockAlerts = useMemo(() => {
    const hasStock = (p) => p.stock !== undefined && p.stock !== null;
    const ruptures = products.filter((p) => hasStock(p) && p.stock <= 0);
    const bientotRupture = products.filter(
      (p) => hasStock(p) && p.stock > 0 && p.stock <= SEUIL_ALERTE
    );
    return { ruptures, bientotRupture };
  }, [products]);

  const groupByCategory = (liste) => {
    const groupes = {};
    liste.forEach((p) => {
      const cat = p.category || "Autres";
      if (!groupes[cat]) groupes[cat] = [];
      groupes[cat].push(p);
    });
    return groupes;
  };

  const buildStockMessage = () => {
    const lignes = [];

    if (stockAlerts.ruptures.length) {
      lignes.push("🔴 *EN RUPTURE :*");
      const parCategorie = groupByCategory(stockAlerts.ruptures);
      Object.entries(parCategorie).forEach(([cat, produits]) => {
        lignes.push("_" + cat + "_");
        produits.forEach((p) => lignes.push("  - " + p.name));
      });
    }

    if (stockAlerts.bientotRupture.length) {
      if (lignes.length) lignes.push("");
      lignes.push("🟠 *STOCK FAIBLE :*");
      const parCategorie = groupByCategory(stockAlerts.bientotRupture);
      Object.entries(parCategorie).forEach(([cat, produits]) => {
        lignes.push("_" + cat + "_");
        produits.forEach((p) =>
          lignes.push("  - " + p.name + " (reste " + p.stock + ")")
        );
      });
    }

    return (
      "📦 *ALERTE STOCK - LA TOUCHE D*\n\n" +
      lignes.join("\n") +
      "\n\n_Pense a faire les achats necessaires._"
    );
  };

  const envoyerAlerteStock = () => {
    const message = buildStockMessage();
    const encoded = encodeURIComponent(message);
    const url = "https://wa.me/2250708175027?text=" + encoded;
    window.open(url, "_blank", "noopener,noreferrer");
  };


  const rapportData = {
    date: format(new Date(), "dd MMMM yyyy", { locale: fr }),
    totalVentes: stats.totalVentes,
    nbCommandes: stats.nbCommandes,
    platsVendus: stats.platsVendus,
    boissonsVendues: stats.boissonsVendues,
    topProduits: stats.topProduits,
    _messageText: buildRapportMessage({
      date: format(new Date(), "dd MMMM yyyy", { locale: fr }),
      totalVentes: stats.totalVentes,
      nbCommandes: stats.nbCommandes,
      platsVendus: stats.platsVendus,
      boissonsVendues: stats.boissonsVendues,
      topProduits: stats.topProduits
    })
  };

  const totalPaiements =
    stats.paiementMap.especes + stats.paiementMap.orange_money + stats.paiementMap.wave;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} className="fade-in">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Tableau de bord</h1>
          <p style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 1 }}>
            {format(new Date(), "EEEE dd MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "var(--white)",
            padding: 3,
            borderRadius: 10,
            boxShadow: "var(--shadow)"
          }}
        >
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "7px 11px",
                borderRadius: 8,
                border: "none",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                background: period === p ? "var(--brand)" : "transparent",
                color: period === p ? "white" : "var(--gray-500)",
                transition: "all 0.15s"
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {progression !== null && (
        <div className="card" style={{ padding: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Target size={15} color="var(--brand)" />
              <span style={{ fontWeight: 700, fontSize: 13 }}>Objectif du jour</span>
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: progression >= 100 ? "var(--success)" : "var(--brand)"
              }}
            >
              {progression}% {progression >= 100 && "🎯"}
            </span>
          </div>
          <div style={{ background: "var(--gray-100)", borderRadius: 20, height: 10, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                borderRadius: 20,
                background:
                  progression >= 100
                    ? "var(--success)"
                    : "linear-gradient(90deg, var(--brand) 0%, var(--brand-light) 100%)",
                width: progression + "%",
                transition: "width 0.6s ease"
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 11, color: "var(--gray-500)" }}>
              {stats.totalVentes.toLocaleString("fr-FR")} FCFA
            </span>
            <span style={{ fontSize: 11, color: "var(--gray-500)" }}>
              Objectif : {objectif.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
        </div>
      )}

      <div className="grid-2">
        <StatCard label="Total ventes" value={stats.totalVentes} icon={TrendingUp} suffix=" FCFA" />
        <StatCard label="Commandes" value={stats.nbCommandes} icon={ShoppingBag} color="#7C3AED" />
        <StatCard label="Plats vendus" value={stats.platsVendus} icon={UtensilsCrossed} color="#D97706" />
        <StatCard label="Boissons" value={stats.boissonsVendues} icon={Droplets} color="#0891B2" />
      </div>

      {/* BILAN COMPTABLE */}
      <div
        className="card"
        style={{
          padding: 16,
          background: "linear-gradient(135deg, var(--dark) 0%, #2D1A0E 100%)",
          color: "white"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Wallet size={17} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Bilan comptable</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Ventes</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#86EFAC" }}>
              +{stats.totalVentes.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Depenses</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#FCA5A5" }}>
              -{stats.totalDepenses.toLocaleString("fr-FR")} FCFA
            </span>
          </div>

          <div style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "4px 0" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Benefice net</span>
            <span
              style={{
                fontWeight: 800,
                fontSize: 20,
                color: stats.benefice >= 0 ? "#86EFAC" : "#FCA5A5"
              }}
            >
              {stats.benefice >= 0 ? "+" : ""}
              {stats.benefice.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
        </div>
      </div>

      {(stockAlerts.ruptures.length > 0 || stockAlerts.bientotRupture.length > 0) && (
        <div
          className="card"
          style={{
            padding: 14,
            border: stockAlerts.ruptures.length ? "2px solid #FCA5A5" : "2px solid #FDE68A",
            background: stockAlerts.ruptures.length ? "#FEF2F2" : "#FFFBEB"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <PackageX size={17} color={stockAlerts.ruptures.length ? "#DC2626" : "#D97706"} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Alerte stock</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 14 }}>
            {stockAlerts.ruptures.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(groupByCategory(stockAlerts.ruptures)).map(([cat, produits]) => (
                  <div key={cat}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#B91C1C",
                        textTransform: "uppercase",
                        marginBottom: 4,
                        marginTop: 4
                      }}
                    >
                      {cat}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {produits.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "7px 10px",
                            background: "white",
                            borderRadius: 8
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</span>
                          <span
                            className="badge"
                            style={{
                              background: "#FEE2E2",
                              color: "#B91C1C",
                              display: "flex",
                              alignItems: "center",
                              gap: 4
                            }}
                          >
                            <AlertTriangle size={10} /> Rupture
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {stockAlerts.bientotRupture.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(groupByCategory(stockAlerts.bientotRupture)).map(([cat, produits]) => (
                  <div key={cat}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#92400E",
                        textTransform: "uppercase",
                        marginBottom: 4,
                        marginTop: 4
                      }}
                    >
                      {cat}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {produits.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "7px 10px",
                            background: "white",
                            borderRadius: 8
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</span>
                          <span className="badge" style={{ background: "#FEF3C7", color: "#92400E" }}>
                            Reste {p.stock}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            className="btn"
            style={{ background: "#25D366", color: "white", width: "100%", gap: 7, padding: "11px 14px", fontSize: 13 }}
            onClick={envoyerAlerteStock}
          >
            <MessageCircle size={16} /> Envoyer l'alerte sur WhatsApp
          </button>
        </div>
      )}

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>💳 Ventes par mode de paiement</div>
        {totalPaiements === 0 ? (
          <div className="empty-state" style={{ padding: "16px 0" }}>
            <p style={{ fontSize: 12 }}>Aucune vente</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(PAYMENT_INFO).map(([key, info]) => {
              const montant = stats.paiementMap[key] || 0;
              const pct = totalPaiements > 0 ? Math.round((montant / totalPaiements) * 100) : 0;
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9,
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "white",
                      border: "1px solid var(--gray-100)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {info.type === "icon" ? (
                      <Banknote size={16} color={info.color} />
                    ) : (
                      <img
                        src={info.url}
                        alt={info.label}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{info.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: info.color }}>
                        {montant.toLocaleString("fr-FR")} F
                      </span>
                    </div>
                    <div style={{ background: "var(--gray-100)", borderRadius: 10, height: 6, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: pct + "%",
                          background: info.color,
                          borderRadius: 10,
                          transition: "width 0.5s ease"
                        }}
                      />
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--gray-500)", fontWeight: 600, width: 32, textAlign: "right" }}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Evolution 7 jours</div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--gray-500)" }} />
            <YAxis
              tick={{ fontSize: 9, fill: "var(--gray-500)" }}
              width={42}
              tickFormatter={(v) => Math.round(v / 1000) + "k"}
            />
            <Tooltip
              formatter={(v) => [v.toLocaleString("fr-FR") + " FCFA", "Ventes"]}
              labelStyle={{ fontWeight: 600, fontSize: 12 }}
              contentStyle={{ fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="var(--brand)"
              strokeWidth={2.5}
              dot={{ fill: "var(--brand)", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid-2">
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🏆 Top produits</div>
          {!stats.topProduits.length ? (
            <div className="empty-state" style={{ padding: "16px 0" }}>
              <p style={{ fontSize: 12 }}>Aucune vente</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {stats.topProduits.map((p, i) => (
                <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background:
                        i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "var(--gray-100)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      fontWeight: 800,
                      color: i < 3 ? "white" : "var(--gray-500)"
                    }}
                  >
                    {i + 1}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      fontSize: 12,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", flexShrink: 0 }}>
                    {p.qty}×
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="card"
          style={{ padding: 14, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
        >
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
            style={{
              background: "#25D366",
              color: "white",
              width: "100%",
              marginTop: 12,
              gap: 7,
              padding: "11px 14px",
              fontSize: 13
            }}
            onClick={() => setShowWA(true)}
          >
            <MessageCircle size={16} /> WhatsApp
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 14px", fontWeight: 700, fontSize: 14, borderBottom: "1px solid var(--gray-100)" }}>
          Commandes recentes
        </div>
        {!orders.length ? (
          <div className="empty-state">
            <p>Aucune commande</p>
          </div>
        ) : (
          orders.slice(0, 6).map((o) => {
            const method = o.paymentMethod || "especes";
            const info = PAYMENT_INFO[method];
            return (
              <div
                key={o.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--gray-100)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "white",
                      border: "1px solid var(--gray-100)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {info.type === "icon" ? (
                      <Banknote size={11} color={info.color} />
                    ) : (
                      <img src={info.url} alt={info.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 12,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {o.items?.map((i) => i.name + " ×" + i.quantity).join(", ")}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 1 }}>
                      {o.timestamp?.toDate ? format(o.timestamp.toDate(), "dd/MM HH:mm") : "—"} · {o.createdByName}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 800, color: "var(--brand)", fontSize: 13, whiteSpace: "nowrap", marginLeft: 10 }}>
                  {(o.total || 0).toLocaleString("fr-FR")} F
                </div>
              </div>
            );
          })
        )}
      </div>

      {showWA && <WhatsAppModal rapportData={rapportData} onClose={() => setShowWA(false)} />}
    </div>
  );
}
