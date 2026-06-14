import { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useToast } from "../../components/shared/Toast";
import { Plus, Pencil, Trash2, X, Check, UtensilsCrossed } from "lucide-react";

const CATEGORIES = ["Plats", "Boissons", "Extras"];
const EMPTY = { name: "", price: "", category: "Plats", active: true };

export default function Menu() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [filterCat, setFilterCat] = useState("Tous");

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("category"));
    return onSnapshot(q, snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const openAdd = () => { setForm(EMPTY); setEditing(null); setShowForm(true); };
  const openEdit = (p) => { setForm({ name: p.name, price: String(p.price), category: p.category, active: p.active }); setEditing(p.id); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY); };

  const save = async () => {
    if (!form.name.trim()) return toast("Nom requis", "error");
    const price = parseInt(form.price);
    if (!price || price <= 0) return toast("Prix invalide", "error");
    setLoading(true);
    try {
      const data = { name: form.name.trim(), price, category: form.category, active: form.active };
      if (editing) {
        await updateDoc(doc(db, "products", editing), data);
        toast("Produit modifié ✓", "success");
      } else {
        await addDoc(collection(db, "products"), data);
        toast("Produit ajouté ✓", "success");
      }
      closeForm();
    } catch { toast("Erreur lors de la sauvegarde", "error"); }
    finally { setLoading(false); }
  };

  const toggleActive = async (p) => {
    await updateDoc(doc(db, "products", p.id), { active: !p.active });
    toast(p.active ? "Produit désactivé" : "Produit activé", "info");
  };

  const remove = async (p) => {
    if (!confirm(`Supprimer "${p.name}" ?`)) return;
    await deleteDoc(doc(db, "products", p.id));
    toast("Produit supprimé", "info");
  };

  const filtered = filterCat === "Tous" ? products : products.filter(p => p.category === filterCat);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Menu & Prix</h1>
          <p style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 2 }}>{products.length} produits au total</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Ajouter un produit
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
        {["Tous", ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setFilterCat(c)} style={{
            padding: "8px 16px", borderRadius: 20, border: "none",
            fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
            background: filterCat === c ? "var(--brand)" : "var(--white)",
            color: filterCat === c ? "white" : "var(--gray-700)",
            boxShadow: "var(--shadow)"
          }}>{c}</button>
        ))}
      </div>

      {/* Products table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <UtensilsCrossed size={32} />
            <p>Aucun produit dans cette catégorie</p>
            <button className="btn btn-primary" onClick={openAdd}><Plus size={14} /> Ajouter</button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--cream)", borderBottom: "1px solid var(--gray-100)" }}>
                  {["Produit", "Catégorie", "Prix", "Statut", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--gray-500)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--gray-100)", background: i % 2 === 0 ? "white" : "var(--cream)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className={`badge ${p.category === "Boissons" ? "badge-brand" : p.category === "Extras" ? "badge-warning" : "badge-success"}`}>
                        {p.category}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--brand)", fontSize: 14 }}>
                      {p.price.toLocaleString("fr-FR")} FCFA
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => toggleActive(p)}
                        className={`badge ${p.active ? "badge-success" : "badge-danger"}`}
                        style={{ cursor: "pointer", border: "none" }}
                      >
                        {p.active ? "Actif" : "Inactif"}
                      </button>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-icon btn-secondary" style={{ padding: 8 }} onClick={() => openEdit(p)}>
                          <Pencil size={14} />
                        </button>
                        <button className="btn btn-icon" style={{ padding: 8, background: "#FEE2E2", color: "var(--danger)" }} onClick={() => remove(p)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, padding: 24, paddingBottom: "calc(24px + env(safe-area-inset-bottom))", animation: "slideUp 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: 18 }}>{editing ? "Modifier" : "Ajouter"} un produit</h2>
              <button className="btn btn-icon btn-secondary" onClick={closeForm}><X size={18} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label>Nom du produit *</label>
                <input className="input" placeholder="Ex: Alloco Poulet" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label>Prix (FCFA) *</label>
                <input className="input" type="number" placeholder="3500" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} inputMode="numeric" />
              </div>
              <div>
                <label>Catégorie</label>
                <select className="select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ margin: 0 }}>Disponible</label>
                <button
                  onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: "none",
                    background: form.active ? "var(--success)" : "var(--gray-300)",
                    cursor: "pointer", position: "relative", transition: "background 0.2s"
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", background: "white",
                    position: "absolute", top: 3,
                    left: form.active ? 23 : 3,
                    transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                  }} />
                </button>
                <span style={{ fontSize: 13, color: form.active ? "var(--success)" : "var(--gray-500)" }}>
                  {form.active ? "Actif" : "Inactif"}
                </span>
              </div>

              <button className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: 8 }} onClick={save} disabled={loading}>
                {loading ? <span className="loader" /> : <><Check size={18} /> {editing ? "Enregistrer" : "Ajouter"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
