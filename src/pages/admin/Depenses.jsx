import { useState, useEffect, useMemo } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useToast } from "../../components/shared/Toast";
import { useAuth } from "../../lib/AuthContext";
import {
  Plus,
  Trash2,
  X,
  Check,
  Receipt,
  Calendar
} from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

const PERIODS = ["Aujourd'hui", "Semaine", "Mois"];

export default function Depenses() {
  const { userData } = useAuth();
  const toast = useToast();
  const [depenses, setDepenses] = useState([]);
  const [period, setPeriod] = useState("Aujourd'hui");
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState("");
  const [montant, setMontant] = useState("");
  const [loading, setLoading] = useState(false);

  const getStart = () => {
    if (period === "Aujourd'hui") return startOfDay(new Date());
    if (period === "Semaine") return startOfWeek(new Date(), { weekStartsOn: 1 });
    return startOfMonth(new Date());
  };

  useEffect(() => {
    const start = Timestamp.fromDate(getStart());
    const q = query(
      collection(db, "depenses"),
      where("timestamp", ">=", start),
      orderBy("timestamp", "desc")
    );
    return onSnapshot(q, (snap) => {
      setDepenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [period]);

  const total = useMemo(
    () => depenses.reduce((s, d) => s + (d.montant || 0), 0),
    [depenses]
  );

  const ajouter = async () => {
    if (!nom.trim()) return toast("Nom de la depense requis", "error");
    const m = parseInt(montant);
    if (!m || m <= 0) return toast("Montant invalide", "error");
    setLoading(true);
    try {
      await addDoc(collection(db, "depenses"), {
        nom: nom.trim(),
        montant: m,
        timestamp: serverTimestamp(),
        createdByName: userData?.name || "Admin"
      });
      toast("Depense ajoutee ✓", "success");
      setNom("");
      setMontant("");
      setShowForm(false);
    } catch {
      toast("Erreur ajout", "error");
    } finally {
      setLoading(false);
    }
  };

  const supprimer = async (d) => {
    if (!confirm("Supprimer la depense \"" + d.nom + "\" ?")) return;
    await deleteDoc(doc(db, "depenses", d.id));
    toast("Depense supprimee", "info");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Depenses</h1>
          <p style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 2 }}>
            {depenses.length} depense(s)
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Ajouter
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, background: "var(--white)", padding: 3, borderRadius: 10, boxShadow: "var(--shadow)" }}>
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              flex: 1,
              padding: "8px 11px",
              borderRadius: 8,
              border: "none",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              background: period === p ? "var(--danger)" : "transparent",
              color: period === p ? "white" : "var(--gray-500)"
            }}
          >
            {p}
          </button>
        ))}
      </div>

      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, #DC2626 0%, #991B1B 100%)",
          color: "white",
          padding: 18
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, opacity: 0.85 }}>
          <Receipt size={16} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>Total depenses - {period}</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800 }}>
          {total.toLocaleString("fr-FR")} FCFA
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {!depenses.length ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <Receipt size={32} />
            <p>Aucune depense sur cette periode</p>
          </div>
        ) : (
          depenses.map((d, i) => (
            <div
              key={d.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: i < depenses.length - 1 ? "1px solid var(--gray-100)" : "none",
                background: i % 2 === 0 ? "white" : "var(--cream)"
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{d.nom}</div>
                <div style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 2 }}>
                  {d.timestamp?.toDate
                    ? format(d.timestamp.toDate(), "dd/MM HH:mm")
                    : "—"}{" "}
                  · {d.createdByName}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 800, color: "var(--danger)", fontSize: 14 }}>
                  -{(d.montant || 0).toLocaleString("fr-FR")} F
                </span>
                <button
                  className="btn btn-icon"
                  style={{ padding: 7, background: "#FEE2E2", color: "var(--danger)" }}
                  onClick={() => supprimer(d)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 10000,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center"
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "20px 20px 0 0",
              width: "100%",
              maxWidth: 480,
              padding: 24,
              paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
              animation: "slideUp 0.3s ease"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20
              }}
            >
              <h2 style={{ fontWeight: 800, fontSize: 18 }}>Nouvelle depense</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowForm(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label>Nom de la depense</label>
                <input
                  className="input"
                  placeholder="Ex: Achat gaz, Transport, Glace..."
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                />
              </div>
              <div>
                <label>Montant (FCFA)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="5000"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <button
                className="btn btn-lg"
                style={{ width: "100%", marginTop: 8, background: "var(--danger)", color: "white" }}
                onClick={ajouter}
                disabled={loading}
              >
                {loading ? <span className="loader" /> : <><Check size={18} /> Enregistrer</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
