import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useToast } from "../../components/shared/Toast";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  UtensilsCrossed,
  Image,
  Package,
  AlertTriangle
} from "lucide-react";

const CATEGORIES = ["Plats", "Boissons", "Extras"];
const SEUIL_ALERTE = 5;
const EMPTY = {
  name: "",
  price: "",
  category: "Plats",
  active: true,
  imageUrl: "",
  stock: ""
};

const ProductImage = ({ p, size = 48 }) => {
  if (p.imageUrl) {
    return (
      <img
        src={p.imageUrl}
        alt={p.name}
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          objectFit: "cover",
          flexShrink: 0
        }}
        onError={(e) => {
          e.target.style.display = "none";
        }}
      />
    );
  }
  const emoji =
    p.category === "Boissons" ? "🥤" : p.category === "Extras" ? "🍟" : "🍽️";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: "var(--brand-pale)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.45,
        flexShrink: 0
      }}
    >
      {emoji}
    </div>
  );
};

const StockBadge = ({ stock }) => {
  if (stock === undefined || stock === null) {
    return (
      <span className="badge" style={{ background: "var(--gray-100)", color: "var(--gray-500)" }}>
        Stock non defini
      </span>
    );
  }
  if (stock <= 0) {
    return (
      <span
        className="badge"
        style={{ background: "#FEE2E2", color: "#B91C1C", display: "flex", alignItems: "center", gap: 4 }}
      >
        <AlertTriangle size={11} /> Rupture de stock
      </span>
    );
  }
  if (stock <= SEUIL_ALERTE) {
    return (
      <span
        className="badge"
        style={{ background: "#FEF3C7", color: "#92400E", display: "flex", alignItems: "center", gap: 4 }}
      >
        <AlertTriangle size={11} /> Plus que {stock}
      </span>
    );
  }
  return (
    <span className="badge badge-success">
      {stock} en stock
    </span>
  );
};

export default function Menu() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [filterCat, setFilterCat] = useState("Tous");
  const [stockEdit, setStockEdit] = useState(null);
  const [stockValue, setStockValue] = useState("");

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("category"));
    return onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const openAdd = () => {
    setForm(EMPTY);
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setForm({
      name: p.name,
      price: String(p.price),
      category: p.category,
      active: p.active,
      imageUrl: p.imageUrl || "",
      stock: p.stock !== undefined && p.stock !== null ? String(p.stock) : ""
    });
    setEditing(p.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const save = async () => {
    if (!form.name.trim()) return toast("Nom requis", "error");
    const price = parseInt(form.price);
    if (!price || price <= 0) return toast("Prix invalide", "error");
    setLoading(true);
    try {
      const data = {
        name: form.name.trim(),
        price,
        category: form.category,
        active: form.active,
        imageUrl: form.imageUrl.trim()
      };
      if (form.stock !== "") {
        const stockNum = parseInt(form.stock);
        data.stock = isNaN(stockNum) ? 0 : stockNum;
      }
      if (editing) {
        await updateDoc(doc(db, "products", editing), data);
        toast("Produit modifie ✓", "success");
      } else {
        await addDoc(collection(db, "products"), data);
        toast("Produit ajoute ✓", "success");
      }
      closeForm();
    } catch {
      toast("Erreur sauvegarde", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (p) => {
    await updateDoc(doc(db, "products", p.id), { active: !p.active });
    toast(p.active ? "Desactive" : "Active", "info");
  };

  const remove = async (p) => {
    if (!confirm("Supprimer " + p.name + " ?")) return;
    await deleteDoc(doc(db, "products", p.id));
    toast("Produit supprime", "info");
  };

  const openStockEdit = (p) => {
    setStockEdit(p.id);
    setStockValue(p.stock !== undefined && p.stock !== null ? String(p.stock) : "0");
  };

  const saveStock = async (p) => {
    const val = parseInt(stockValue);
    if (isNaN(val) || val < 0) return toast("Stock invalide", "error");
    await updateDoc(doc(db, "products", p.id), { stock: val });
    toast("Stock mis a jour : " + val, "success");
    setStockEdit(null);
  };

  const quickAdjust = async (p, delta) => {
    const current = p.stock || 0;
    const newVal = Math.max(0, current + delta);
    await updateDoc(doc(db, "products", p.id), { stock: newVal });
  };

  const filtered =
    filterCat === "Tous" ? products : products.filter((p) => p.category === filterCat);

  const cats = ["Tous", ...CATEGORIES];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="fade-in">
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
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Menu et Prix</h1>
          <p style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 2 }}>
            {products.length} produits au total
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Ajouter un produit
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setFilterCat(c)}
            style={{
              padding: "8px 16px",
              borderRadius: 20,
              border: "none",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: filterCat === c ? "var(--brand)" : "var(--white)",
              color: filterCat === c ? "white" : "var(--gray-700)",
              boxShadow: "var(--shadow)"
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <UtensilsCrossed size={32} />
            <p>Aucun produit</p>
            <button className="btn btn-primary" onClick={openAdd}>
              <Plus size={14} /> Ajouter
            </button>
          </div>
        ) : (
          filtered.map((p, i) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "12px 16px",
                borderBottom: i < filtered.length - 1 ? "1px solid var(--gray-100)" : "none",
                background: i % 2 === 0 ? "white" : "var(--cream)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <ProductImage p={p} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {p.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, color: "var(--brand)", fontSize: 13 }}>
                      {p.price.toLocaleString("fr-FR")} FCFA
                    </span>
                    <span
                      className={
                        p.category === "Boissons"
                          ? "badge badge-brand"
                          : p.category === "Extras"
                          ? "badge badge-warning"
                          : "badge badge-success"
                      }
                    >
                      {p.category}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => toggleActive(p)}
                    className={p.active ? "badge badge-success" : "badge badge-danger"}
                    style={{ cursor: "pointer", border: "none", padding: "4px 10px" }}
                  >
                    {p.active ? "Actif" : "Inactif"}
                  </button>
                  <button
                    className="btn btn-icon btn-secondary"
                    style={{ padding: 8 }}
                    onClick={() => openEdit(p)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="btn btn-icon"
                    style={{ padding: 8, background: "#FEE2E2", color: "var(--danger)" }}
                    onClick={() => remove(p)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Ligne stock */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "white",
                  borderRadius: 10,
                  padding: "8px 10px",
                  border: "1px solid var(--gray-100)"
                }}
              >
                <Package size={14} color="var(--gray-500)" />

                {stockEdit === p.id ? (
                  <>
                    <input
                      className="input"
                      type="number"
                      value={stockValue}
                      onChange={(e) => setStockValue(e.target.value)}
                      style={{ flex: 1, padding: "6px 10px", fontSize: 14 }}
                      inputMode="numeric"
                      autoFocus
                    />
                    <button
                      className="btn btn-icon"
                      style={{ background: "var(--success)", color: "white", padding: 8 }}
                      onClick={() => saveStock(p)}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      className="btn btn-icon btn-secondary"
                      style={{ padding: 8 }}
                      onClick={() => setStockEdit(null)}
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <StockBadge stock={p.stock} />
                    </div>
                    <button
                      className="btn btn-icon btn-secondary"
                      style={{ padding: 7 }}
                      onClick={() => quickAdjust(p, -1)}
                    >
                      <span style={{ fontWeight: 800, fontSize: 14, width: 12, display: "inline-block", textAlign: "center" }}>-</span>
                    </button>
                    <button
                      className="btn btn-icon btn-secondary"
                      style={{ padding: 7 }}
                      onClick={() => quickAdjust(p, 1)}
                    >
                      <span style={{ fontWeight: 800, fontSize: 14, width: 12, display: "inline-block", textAlign: "center" }}>+</span>
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openStockEdit(p)}
                    >
                      Modifier
                    </button>
                  </>
                )}
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
              animation: "slideUp 0.3s ease",
              maxHeight: "92vh",
              overflowY: "auto"
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
              <h2 style={{ fontWeight: 800, fontSize: 18 }}>
                {editing ? "Modifier" : "Ajouter"} un produit
              </h2>
              <button className="btn btn-icon btn-secondary" onClick={closeForm}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label>Nom du produit</label>
                <input
                  className="input"
                  placeholder="Ex: Alloco Poulet"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label>Prix en FCFA</label>
                <input
                  className="input"
                  type="number"
                  placeholder="3500"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  inputMode="numeric"
                />
              </div>
              <div>
                <label>Categorie</label>
                <select
                  className="select"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Package size={14} color="var(--brand)" /> Stock disponible
                </label>
                <input
                  className="input"
                  type="number"
                  placeholder="Ex: 20 (laisser vide si non gere)"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  inputMode="numeric"
                />
                <p style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 6 }}>
                  Alerte automatique a 5 articles restants
                </p>
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Image size={14} color="var(--brand)" /> Lien photo (optionnel)
                </label>
                <input
                  className="input"
                  placeholder="https://res.cloudinary.com/..."
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  autoCapitalize="none"
                  autoCorrect="off"
                  style={{ fontSize: 13 }}
                />
                {form.imageUrl ? (
                  <img
                    src={form.imageUrl}
                    alt="apercu"
                    style={{
                      marginTop: 10,
                      width: "100%",
                      height: 150,
                      objectFit: "cover",
                      borderRadius: 12,
                      border: "2px solid var(--brand-pale)"
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    style={{
                      marginTop: 10,
                      height: 80,
                      borderRadius: 12,
                      border: "2px dashed var(--gray-200)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--gray-300)",
                      gap: 8,
                      fontSize: 13
                    }}
                  >
                    <Image size={18} /> Apercu photo ici
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ margin: 0 }}>Disponible</label>
                <button
                  onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    border: "none",
                    background: form.active ? "var(--success)" : "var(--gray-300)",
                    cursor: "pointer",
                    position: "relative",
                    transition: "background 0.2s"
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "white",
                      position: "absolute",
                      top: 3,
                      left: form.active ? 23 : 3,
                      transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                    }}
                  />
                </button>
                <span style={{ fontSize: 13, color: form.active ? "var(--success)" : "var(--gray-500)" }}>
                  {form.active ? "Actif" : "Inactif"}
                </span>
              </div>

              <button
                className="btn btn-primary btn-lg"
                style={{ width: "100%", marginTop: 8 }}
                onClick={save}
                disabled={loading}
              >
                {loading ? (
                  <span className="loader" />
                ) : (
                  <>
                    <Check size={18} />
                    {editing ? "Enregistrer" : "Ajouter"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
