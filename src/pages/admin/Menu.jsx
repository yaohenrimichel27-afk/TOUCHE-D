import { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, orderBy, query } from "fi
import { db } from "../../lib/firebase";
import { useToast } from "../../components/shared/Toast";
import { Plus, Pencil, Trash2, X, Check, UtensilsCrossed, Image } from "lucide-react";
const CATEGORIES = ["Plats", "Boissons", "Extras"];
const EMPTY = { name: "", price: "", category: "Plats", active: true, imageUrl: "" };
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
const openEdit = (p) => {
setForm({
name: p.name,
price: String(p.price),
category: p.category,
active: p.active,
imageUrl: p.imageUrl || ""
});
setEditing(p.id);
setShowForm(true);
};
const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY); };
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
const filtered = filterCat === "Tous" ? products : products.filter(p => p.category === filt
const ProductImage = ({ p, size = 48 }) => (
p.imageUrl
? <img src={p.imageUrl} alt={p.name} style={{ width: size, height: size, borderRadius:
: <div style={{ width: size, height: size, borderRadius: 10, background: "var(--brand-p
{p.category === "Boissons" ? " " : p.category === "Extras" ? " " : " "}
</div>
);
return (
<div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="fade-in">
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", f
<div>
<h1 style={{ fontSize: 22, fontWeight: 800 }}>Menu & Prix</h1>
<p style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 2 }}>{products.lengt
</div>
<button className="btn btn-primary" onClick={openAdd}>
<Plus size={16} /> Ajouter un produit
</button>
</div>
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
<div className="card" style={{ padding: 0, overflow: "hidden" }}>
{filtered.length === 0 ? (
<div className="empty-state" style={{ padding: 48 }}>
<UtensilsCrossed size={32} />
<p>Aucun produit dans cette catégorie</p>
<button className="btn btn-primary" onClick={openAdd}><Plus size={14} /> Ajouter<
</div>
) : (
filtered.map((p, i) => (
<div key={p.id} style={{
display: "flex", alignItems: "center", gap: 12,
padding: "12px 16px",
borderBottom: i < filtered.length - 1 ? "1px solid var(--gray-100)" : "none",
background: i % 2 === 0 ? "white" : "var(--cream)"
}}>
<ProductImage p={p} size={48} />
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow:
<div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, fl
<span style={{ fontWeight: 700, color: "var(--brand)", fontSize: 13 }}>{p.p
<span className={`badge ${p.category === "Boissons" ? "badge-brand" : p.cat
{p.imageUrl && <span className="badge" style={{ background: "#DCFCE7", colo
</div>
</div>
<div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: <button onClick={() => toggleActive(p)} className={`badge ${p.active ? {p.active ? "Actif" : "Inactif"}
</button>
<button className="btn btn-icon btn-secondary" style={{ padding: 8 }} onClick
0 }}>
"badge
<button className="btn btn-icon" style={{ padding: 8, background: "#FEE2E2",
</div>
</div>
))
)}
</div>
{showForm && (
<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100
<div style={{ background: "white", borderRadius: "20px 20px 0 0", width: "100%", ma
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "cent
<h2 style={{ fontWeight: 800, fontSize: 18 }}>{editing ? "Modifier" : "Ajouter"
<button className="btn btn-icon btn-secondary" onClick={closeForm}><X size={18}
</div>
<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
<div>
<label>Nom du produit *</label>
<input className="input" placeholder="Ex: Alloco Poulet" value={form.name} on
</div>
<div>
<label>Prix (FCFA) *</label>
<input className="input" type="number" placeholder="3500" value={form.price}
</div>
<div>
<label>Catégorie</label>
<select className="select" value={form.category} onChange={e => setForm(f =>
{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
</select>
</div>
{/* Champ photo */}
<div>
<label style={{ display: "flex", alignItems: "center", gap: 6 }}>
<Image size={14} color="var(--brand)" /> Lien photo (optionnel)
</label>
<input
className="input"
placeholder="https://i.ibb.co/..."
value={form.imageUrl}
onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
autoCapitalize="none"
autoCorrect="off"
style={{ fontSize: 13 }}
/>
<p style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 6, lineHeight:
Upload sur <strong>imgbb.com</strong> → copie le Direct link → colle ici
</p>
{form.imageUrl ? (
<img
src={form.imageUrl}
alt="aperçu"
style={{ marginTop: 10, width: "100%", height: 150, objectFit: "cover", b
onError={e => e.target.style.display = "none"}
/>
) : (
</div>
<div style={{ marginTop: 10, height: 80, borderRadius: 12, border: "2px das
<Image size={18} /> Aperçu photo ici
)}
</div>
<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
<label style={{ margin: 0 }}>Disponible</label>
<button onClick={() => setForm(f => ({ ...f, active: !f.active }))} style={{
<div style={{ width: 18, height: 18, borderRadius: "50%", background: "whit
</button>
<span style={{ fontSize: 13, color: form.active ? "var(--success)" : "var(--g
</div>
<button className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: 8
{loading ? <span className="loader" /> : <><Check size={18} /> {editing ? "En
</button>
</div>
</div>
</div>
)}
</div>
);
}
