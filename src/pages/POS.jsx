import { useState, useEffect, useMemo } from "react";
import {
collection, query, orderBy, onSnapshot,
addDoc, serverTimestamp, where
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/shared/Toast";
import {
ShoppingCart, Plus, Minus, Trash2, CheckCircle,
Search, LogOut, ChefHat, X, ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
const CATEGORIES = ["Tous", "Plats", "Boissons", "Extras"];
const ProductImage = ({ product, height = 90 }) => {
const [err, setErr] = useState(false);
if (product.imageUrl && !err) {
return <img src={product.imageUrl} alt={product.name} onError={() => setErr(true)}
style={{ width: "100%", height, objectFit: "cover" }} />;
}
return (
<div style={{ width: "100%", height, background: "var(--brand-pale)", display: "flex", al
{product.category === "Boissons" ? " " : product.category === "Extras" ? " " : " "}
</div>
);
};
export default function POS() {
const { userData, logout } = useAuth();
const toast = useToast();
const [products, setProducts] = useState([]);
const [cart, setCart] = useState([]);
const [category, setCategory] = useState("Tous");
const [search, setSearch] = useState("");
const [loading, setLoading] = useState(false);
const [showSuccess, setShowSuccess] = useState(false);
const [todayOrders, setTodayOrders] = useState(0);
const [showCart, setShowCart] = useState(false);
const [lastTotal, setLastTotal] = useState(0);
useEffect(() => {
const q = query(collection(db, "products"), orderBy("name"));
return onSnapshot(q, snap => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
}, []);
useEffect(() => {
const start = new Date(); start.setHours(0,0,0,0);
const q = query(collection(db, "orders"), where("timestamp", ">=", start));
return onSnapshot(q, snap => setTodayOrders(snap.size));
}, []);
const filtered = useMemo(() => products.filter(p => {
const matchCat = category === "Tous" || p.category === category;
const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
return matchCat && matchSearch;
}), [products, category, search]);
const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
const cartCount = cart.reduce((s, i) => s + i.qty, 0);
const addToCart = (product) => {
setCart(prev => {
const ex = prev.find(i => i.id === product.id);
if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
return [...prev, { ...product, qty: 1 }];
});
};
const updateQty = (id, delta) =>
setCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i =>
const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
const validateOrder = async () => {
if (!cart.length) return toast("Le panier est vide", "error");
setLoading(true);
try {
await addDoc(collection(db, "orders"), {
timestamp: serverTimestamp(),
total: cartTotal,
createdByName: userData?.name || "Caissier",
items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.qty, cate
});
setLastTotal(cartTotal);
setCart([]);
setShowCart(false);
setShowSuccess(true);
setTimeout(() => setShowSuccess(false), 2200);
} catch { toast("Erreur validation", "error"); }
finally { setLoading(false); }
};
/* ── PANIER ── */
if (showCart) return (
<div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", flexDirect
<header style={{ background: "var(--dark)", padding: "12px 14px", display: "flex", alig
<button onClick={() => setShowCart(false)} style={{ background: "rgba(255,255,255,0.1
<ArrowLeft size={18} />
</button>
<span style={{ fontWeight: 700, fontSize: 16, flex: 1, color: "white" }}>Panier · {ca
{cart.length > 0 && (
<button onClick={() => setCart([])} style={{ background: "rgba(255,255,255,0.1)", b
<Trash2 size={16} />
</button>
)}
</header>
<div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column",
{!cart.length ? (
<div className="empty-state" style={{ marginTop: 60 }}>
<ShoppingCart size={44} />
<p>Panier vide</p>
<button className="btn btn-primary" onClick={() => setShowCart(false)}>Ajouter de
</div>
) : cart.map(item => (
<div key={item.id} className="card" style={{ padding: "12px 14px", display: "flex",
<div style={{ width: 50, height: 50, borderRadius: 10, overflow: "hidden", flexSh
{item.imageUrl
? <img src={item.imageUrl} alt={item.name} style={{ width: "100%", height: "1
: <span style={{ fontSize: 22 }}>{item.category === "Boissons" ? " " : " "
}
</div>
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow:
<div style={{ fontSize: 13, color: "var(--brand)", fontWeight: 700, marginTop:
</div>
<div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
<button onClick={() => updateQty(item.id, -1)} style={{ width: 30, height: 30,
<span style={{ fontWeight: 800, fontSize: 15, minWidth: 20, textAlign: "center"
<button onClick={() => updateQty(item.id, 1)} style={{ width: 30, height: 30, b
</div>
<button onClick={() => removeFromCart(item.id)} style={{ background: "none", bord
</div>
))}
</div>
{cart.length > 0 && (
<div style={{ background: "white", padding: "16px 14px", paddingBottom: "calc(16px +
<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
<span style={{ color: "var(--gray-500)", fontSize: 13 }}>Sous-total</span>
<span style={{ fontWeight: 600, fontSize: 13 }}>{cartTotal.toLocaleString("fr-FR"
</div>
<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}
<span style={{ fontWeight: 800, fontSize: 17 }}>Total</span>
<span style={{ fontWeight: 800, fontSize: 20, color: "var(--brand)" }}>{cartTotal
</div>
<button className="btn btn-primary btn-lg" style={{ width: "100%", fontSize: 16, pa
{loading ? <span className="loader" /> : <><CheckCircle size={19} /> Valider la c
</button>
</div>
)}
</div>
);
/* ── PRODUITS ── */
return (
<div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", flexDirect
{/* Header compact */}
<header style={{ background: "var(--dark)", padding: "10px 14px", display: "flex", alig
<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
<div style={{ width: 32, height: 32, background: "var(--brand)", borderRadius: 9, d
<ChefHat size={16} color="white" />
</div>
<div>
<div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize:
<div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", lineHeight: 1 </div>
</div>
<button onClick={logout} style={{ background: "rgba(255,255,255,0.08)", border: "none
<LogOut size={16} />
</button>
</header>
}}>{us
{/* Search */}
<div style={{ padding: "10px 12px 0" }}>
<div style={{ position: "relative" }}>
<Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "
<input className="input" style={{ paddingLeft: 34, fontSize: 16, padding: "10px 12p
placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.valu
</div>
</div>
{/* Catégories */}
<div className="scroll-tabs" style={{ padding: "8px 12px" }}>
{CATEGORIES.map(c => (
<button key={c} onClick={() => setCategory(c)} style={{
padding: "7px 15px", borderRadius: 20, border: "none",
fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", flexShrin
background: category === c ? "var(--brand)" : "var(--white)",
color: category === c ? "white" : "var(--gray-700)",
boxShadow: category === c ? "0 2px 8px rgba(200,75,15,0.25)" : "var(--shadow)",
transition: "all 0.15s"
}}>{c}</button>
))}
</div>
{/* Grille produits */}
<div style={{
flex: 1,
padding: "2px 12px",
paddingBottom: cartCount > 0 ? 88 : 20,
display: "grid",
gridTemplateColumns: "repeat(2, 1fr)",
gap: 10,
alignContent: "start",
overflowY: "auto"
}}>
{filtered.map(product => {
const inCart = cart.find(i => i.id === product.id);
return (
<button key={product.id} onClick={() => addToCart(product)} style={{
background: "var(--white)",
border: inCart ? "2px solid var(--brand)" : "2px solid transparent",
borderRadius: 14, padding: 0, cursor: "pointer", textAlign: "left",
boxShadow: inCart ? "0 3px 14px rgba(200,75,15,0.18)" : "var(--shadow)",
transition: "all 0.12s", overflow: "hidden",
display: "flex", flexDirection: "column", position: "relative"
}}>
{inCart && (
<div style={{
position: "absolute", top: 7, right: 7, zIndex: 2,
background: "var(--brand)", color: "white",
borderRadius: "50%", width: 22, height: 22,
display: "flex", alignItems: "center", justifyContent: "center",
fontSize: 11, fontWeight: 800,
boxShadow: "0 2px 6px rgba(200,75,15,0.4)"
}}>{inCart.qty}</div>
)}
<div style={{ overflow: "hidden" }}>
<ProductImage product={product} height={90} />
</div>
<div style={{ padding: "9px 10px 10px" }}>
<div style={{ fontSize: 12, fontWeight: 700, color: "var(--dark)", lineHeight
{product.name}
</div>
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-b
<span style={{ fontSize: 13, fontWeight: 800, color: "var(--brand)" }}>
{product.price.toLocaleString("fr-FR")} F
</span>
<div style={{
width: 24, height: 24, borderRadius: "50%",
background: inCart ? "var(--brand)" : "var(--gray-100)",
display: "flex", alignItems: "center", justifyContent: "center"
}}>
<Plus size={13} color={inCart ? "white" : "var(--gray-500)"} />
</div>
</div>
</div>
</button>
);
})}
{!filtered.length && (
<div style={{ gridColumn: "1/-1" }} className="empty-state">
<p>Aucun produit trouvé</p>
</div>
)}
</div>
{/* Bouton panier flottant */}
{cartCount > 0 && (
<div style={{
position: "fixed", bottom: 0, left: 0, right: 0,
padding: "10px 14px",
paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
background: "white", boxShadow: "0 -3px 16px rgba(0,0,0,0.09)", zIndex: 200
}}>
<button onClick={() => setShowCart(true)} style={{
width: "100%", padding: "14px 16px", fontSize: 15,
borderRadius: 13, border: "none", cursor: "pointer",
background: "var(--brand)", color: "white",
display: "flex", alignItems: "center", justifyContent: "space-between",
fontWeight: 700, fontFamily: "inherit",
boxShadow: "0 3px 14px rgba(200,75,15,0.3)"
}}>
<div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 7, padding: "2px
<span>Voir le panier</span>
<span style={{ fontWeight: 800 }}>{cartTotal.toLocaleString("fr-FR")} F</span>
</button>
</div>
)}
{/* Succès */}
{showSuccess && (
<div style={{ position: "fixed", inset: 0, background: "#16A34A", display: "flex", fl
<div style={{ animation: "popIn 0.3s ease" }}>
<CheckCircle size={80} color="white" strokeWidth={1.5} />
</div>
<div style={{ color: "white", fontSize: 22, fontWeight: 800, marginTop: 18 }}>Comma
<div style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, marginTop: 6 }}>{lastT
</div>
)}
</div>
);
}
