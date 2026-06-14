import { useState, useEffect, useMemo } from "react";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, where, getDocs
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/shared/Toast";
import {
  ShoppingCart, Plus, Minus, Trash2, CheckCircle,
  Search, LogOut, ChefHat, X, Clock
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const CATEGORIES = ["Tous", "Plats", "Boissons", "Extras"];

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

  // Load products
  useEffect(() => {
    const q = query(collection(db, "products"), where("active", "==", true), orderBy("category"));
    return onSnapshot(q, snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Today's order count
  useEffect(() => {
    const start = new Date(); start.setHours(0,0,0,0);
    const q = query(collection(db, "orders"), where("timestamp", ">=", start));
    return onSnapshot(q, snap => setTodayOrders(snap.size));
  }, []);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat = category === "Tous" || p.category === category;
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, category, search]);

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i);
      return updated.filter(i => i.qty > 0);
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

  const validateOrder = async () => {
    if (cart.length === 0) return toast("Le panier est vide", "error");
    setLoading(true);
    try {
      await addDoc(collection(db, "orders"), {
        timestamp: serverTimestamp(),
        total: cartTotal,
        createdBy: userData?.name || "Caissier",
        createdByName: userData?.name || "Caissier",
        items: cart.map(i => ({
          id: i.id, name: i.name, price: i.price,
          quantity: i.qty, category: i.category
        }))
      });
      setCart([]);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
      toast("Commande validée ! ✓", "success");
    } catch (e) {
      toast("Erreur lors de la validation", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <header style={{
        background: "var(--dark)", color: "white", padding: "12px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, background: "var(--brand)",
            borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <ChefHat size={18} color="white" />
          </div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 15 }}>La Touche D</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              Caissier : {userData?.name || "—"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              {format(new Date(), "dd MMM yyyy", { locale: fr })}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={11} />
              {todayOrders} commandes aujourd'hui
            </div>
          </div>
          <button className="btn btn-icon" style={{ background: "rgba(255,255,255,0.1)", color: "white" }} onClick={logout}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 60px)" }}>

        {/* LEFT — Products */}
        <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--gray-300)" }} />
            <input
              className="input"
              style={{ paddingLeft: 38 }}
              placeholder="Rechercher un plat..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Category tabs */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                style={{
                  padding: "8px 16px", borderRadius: 20, border: "none",
                  fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
                  background: category === c ? "var(--brand)" : "var(--white)",
                  color: category === c ? "white" : "var(--gray-700)",
                  boxShadow: category === c ? "0 2px 8px rgba(200,75,15,0.3)" : "var(--shadow)",
                  transition: "all 0.15s"
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Products grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
            {filtered.map(product => {
              const inCart = cart.find(i => i.id === product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  style={{
                    background: "var(--white)", border: inCart ? "2px solid var(--brand)" : "2px solid transparent",
                    borderRadius: 14, padding: 14, cursor: "pointer", textAlign: "left",
                    boxShadow: "var(--shadow)", transition: "all 0.15s",
                    position: "relative", display: "flex", flexDirection: "column", gap: 6
                  }}
                >
                  {inCart && (
                    <div style={{
                      position: "absolute", top: 8, right: 8,
                      background: "var(--brand)", color: "white",
                      borderRadius: "50%", width: 22, height: 22,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700
                    }}>{inCart.qty}</div>
                  )}
                  <div style={{
                    fontSize: 28, lineHeight: 1,
                    background: "var(--brand-pale)", borderRadius: 10,
                    padding: "8px", textAlign: "center"
                  }}>
                    {product.category === "Boissons" ? "🥤" : product.category === "Extras" ? "🍟" : "🍽️"}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dark)", lineHeight: 1.2 }}>
                    {product.name}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>
                    {product.price.toLocaleString("fr-FR")} F
                  </div>
                  <div style={{
                    fontSize: 10, color: "var(--gray-500)",
                    background: "var(--gray-100)", borderRadius: 6,
                    padding: "2px 6px", alignSelf: "flex-start"
                  }}>{product.category}</div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ gridColumn: "1/-1" }} className="empty-state">
                <p>Aucun produit trouvé</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Cart */}
        <div style={{
          width: 280, background: "var(--white)", borderLeft: "1px solid var(--gray-100)",
          display: "flex", flexDirection: "column", height: "100%"
        }}>
          {/* Cart header */}
          <div style={{ padding: "16px", borderBottom: "1px solid var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShoppingCart size={18} color="var(--brand)" />
              <span style={{ fontWeight: 700, fontSize: 15 }}>Panier</span>
              {cartCount > 0 && (
                <span style={{
                  background: "var(--brand)", color: "white",
                  borderRadius: "50%", width: 20, height: 20,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700
                }}>{cartCount}</span>
              )}
            </div>
            {cart.length > 0 && (
              <button className="btn btn-icon btn-secondary" style={{ padding: 6 }} onClick={() => setCart([])}>
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* Cart items */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
            {cart.length === 0 ? (
              <div className="empty-state" style={{ padding: "32px 16px" }}>
                <ShoppingCart size={32} />
                <p style={{ fontSize: 13 }}>Ajoute des produits<br />pour créer une commande</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cart.map(item => (
                  <div key={item.id} style={{
                    background: "var(--cream)", borderRadius: 10, padding: "10px 12px",
                    display: "flex", alignItems: "center", gap: 8
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--brand)", fontWeight: 700 }}>
                        {(item.price * item.qty).toLocaleString("fr-FR")} F
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button onClick={() => updateQty(item.id, -1)} style={{ width: 26, height: 26, borderRadius: "50%", border: "1.5px solid var(--gray-300)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Minus size={12} />
                      </button>
                      <span style={{ fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "var(--brand)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Plus size={12} />
                      </button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-300)", padding: 2 }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart footer */}
          <div style={{ padding: 16, borderTop: "1px solid var(--gray-100)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "var(--gray-500)" }}>Sous-total</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{cartTotal.toLocaleString("fr-FR")} FCFA</span>
            </div>
            <div className="divider" style={{ margin: "8px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 20, color: "var(--brand)" }}>
                {cartTotal.toLocaleString("fr-FR")} <span style={{ fontSize: 13 }}>FCFA</span>
              </span>
            </div>
            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%", fontSize: 15 }}
              onClick={validateOrder}
              disabled={loading || cart.length === 0}
            >
              {loading ? <span className="loader" /> : (
                <><CheckCircle size={18} /> Valider la commande</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success overlay */}
      {showSuccess && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(22,163,74,0.95)",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", zIndex: 9999, animation: "fadeIn 0.2s ease"
        }}>
          <CheckCircle size={80} color="white" strokeWidth={1.5} />
          <div style={{ color: "white", fontSize: 24, fontWeight: 800, marginTop: 16 }}>Commande validée !</div>
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, marginTop: 8 }}>
            Total : {cartTotal.toLocaleString("fr-FR")} FCFA
          </div>
        </div>
      )}
    </div>
  );
}
