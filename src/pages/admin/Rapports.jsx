import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useToast } from "../../components/shared/Toast";
import { exportPDF, exportExcel } from "../../lib/export";
import { buildRapportMessage } from "../../lib/whatsapp";
import WhatsAppModal from "../../components/shared/WhatsAppModal";
import { FileText, Download, MessageCircle, Calendar, Filter } from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth, subDays, subWeeks, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

const PRESETS = [
  { label: "Aujourd'hui", getRange: () => ({ start: startOfDay(new Date()), end: new Date() }) },
  { label: "Hier", getRange: () => ({ start: startOfDay(subDays(new Date(), 1)), end: startOfDay(new Date()) }) },
  { label: "Cette semaine", getRange: () => ({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: new Date() }) },
  { label: "Semaine dernière", getRange: () => ({ start: startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), end: startOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: "Ce mois", getRange: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  { label: "Mois dernier", getRange: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: startOfMonth(new Date()) }) },
];

export default function Rapports() {
  const toast = useToast();
  const [preset, setPreset] = useState(0);
  const [orders, setOrders] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [showWA, setShowWA] = useState(false);

  const range = PRESETS[preset].getRange();

  const fetchOrders = async () => {
    setLoadingData(true);
    try {
      const q = query(
        collection(db, "orders"),
        where("timestamp", ">=", Timestamp.fromDate(range.start)),
        where("timestamp", "<=", Timestamp.fromDate(range.end)),
        orderBy("timestamp", "desc")
      );
      const snap = await getDocs(q);
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      toast("Erreur lors du chargement", "error");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [preset]);

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
    const topProduits = Object.entries(prodMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }));
    return { totalVentes, nbCommandes, platsVendus, boissonsVendues, topProduits };
  }, [orders]);

  const periodLabel = `${PRESETS[preset].label} — ${format(range.start, "dd/MM/yyyy", { locale: fr })}${preset > 0 ? ` au ${format(range.end, "dd/MM/yyyy", { locale: fr })}` : ""}`;

  const handlePDF = () => {
    exportPDF({ orders, period: periodLabel, stats });
    toast("PDF téléchargé ✓", "success");
  };

  const handleExcel = () => {
    exportExcel({ orders, period: periodLabel, stats });
    toast("Excel téléchargé ✓", "success");
  };

  const rapportData = {
    date: periodLabel,
    ...stats,
    _messageText: buildRapportMessage({ date: periodLabel, ...stats })
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="fade-in">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Rapports</h1>
        <p style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 2 }}>Export PDF, Excel et envoi WhatsApp</p>
      </div>

      {/* Period selector */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Filter size={16} color="var(--brand)" />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Période</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {PRESETS.map((p, i) => (
            <button key={p.label} onClick={() => setPreset(i)} style={{
              padding: "8px 14px", borderRadius: 20, border: "none",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              background: preset === i ? "var(--brand)" : "var(--gray-100)",
              color: preset === i ? "white" : "var(--gray-700)",
              transition: "all 0.15s"
            }}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {loadingData ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--gray-500)" }}>Chargement...</div>
      ) : (
        <>
          <div className="grid-2">
            {[
              { label: "Total ventes", value: `${stats.totalVentes.toLocaleString("fr-FR")} FCFA`, color: "var(--brand)" },
              { label: "Commandes", value: stats.nbCommandes, color: "#7C3AED" },
              { label: "Plats vendus", value: stats.platsVendus, color: "#D97706" },
              { label: "Boissons vendues", value: stats.boissonsVendues, color: "#0891B2" },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--gray-500)", fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Top products */}
          {stats.topProduits.length > 0 && (
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>🏆 Top produits</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stats.topProduits.map((p, i) => (
                  <div key={p.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--cream)", borderRadius: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{i + 1}. {p.name}</span>
                    <span className="badge badge-brand">{p.qty} vendus</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export buttons */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>📤 Exporter le rapport</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button className="btn btn-primary" style={{ width: "100%", gap: 10 }} onClick={handlePDF} disabled={orders.length === 0}>
                <FileText size={18} /> Télécharger en PDF
              </button>
              <button className="btn btn-secondary" style={{ width: "100%", gap: 10, background: "#217346", color: "white" }} onClick={handleExcel} disabled={orders.length === 0}>
                <Download size={18} /> Télécharger en Excel
              </button>
              <button
                className="btn"
                style={{ width: "100%", gap: 10, background: "#25D366", color: "white" }}
                onClick={() => setShowWA(true)}
                disabled={orders.length === 0}
              >
                <MessageCircle size={18} /> Envoyer sur WhatsApp
              </button>
            </div>
            {orders.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 10, textAlign: "center" }}>
                Aucune commande sur cette période
              </p>
            )}
          </div>

          {/* Orders list */}
          {orders.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--gray-100)", fontWeight: 700, fontSize: 14 }}>
                Détail des {orders.length} commandes
              </div>
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {orders.map(o => (
                  <div key={o.id} style={{ padding: "10px 16px", borderBottom: "1px solid var(--gray-100)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {o.items?.slice(0, 2).map(i => `${i.name} x${i.quantity}`).join(", ")}
                        {o.items?.length > 2 ? ` +${o.items.length - 2}` : ""}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 2 }}>
                        {o.timestamp?.toDate ? format(o.timestamp.toDate(), "dd/MM HH:mm") : "—"} · {o.createdByName}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: "var(--brand)", fontSize: 14 }}>
                      {(o.total || 0).toLocaleString("fr-FR")} F
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showWA && <WhatsAppModal rapportData={rapportData} onClose={() => setShowWA(false)} />}
    </div>
  );
}
