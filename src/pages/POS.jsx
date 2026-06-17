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
  Search, LogOut, ChefHat, X, Clock, ArrowLeft
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
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("name"));
    return onSnapshot(q, snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

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
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));
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
      setShowCart(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
      toast("Commande validée ! ✓", "success");
    } catch {
      toast("Erreur lors de la validation", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ── VUE PANIER ── */
  if (showCart) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", flexDirection: "column" }}>
        {/* Header panier */}
        <header style={{
          background: "var(--dark)", color: "white", padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 12,
          position: "sticky", top: 0, zIndex: 100
        }}>
          <button onClick={() => setShowCart(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: "white" }}>
            <ArrowLeft size={20} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 18, flex: 1 }}>Mon panier</span>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: "white" }}>
              <Trash2 size={18} />
            </button>
          )}
        </header>

        {/* Liste items */}
        <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {cart.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 60 }}>
              <ShoppingCart size={48} />
              <p>Ton panier est vide</p>
              <button className="btn btn-primary" onClick={() => setShowCart(false)}>
                Ajouter des produits
              </button>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                  background: "var(--brand-pale)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22
                }}>
                  {item.category === "Boissons" ? "🥤" : item.category === "Extras" ? "🍟" : "🍽️"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{item.name}</div>
                  <div style={{ fontSize: 13, color: "var(--brand)", fontWeight: 600, marginTop: 2 }}>
                    {(item.price * item.qty).toLocaleString("fr-FR")} FCFA
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={() => updateQty(item.id, -1)} style={{
                    width: 34, height: 34, borderRadius: "50%",
                    border: "2px solid var(--gray-200)", background: "white",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <Minus size={14} />
                  </button>
                  <span style={{ fontWeight: 800, fontSize: 16, minWidth: 24, textAlign: "center" }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} style={{
                    width: 34, height: 34, borderRadius: "50%",
                    border: "none", background: "var(--brand)", color: "white",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <Plus size={14} />
                  </button>
                </div>
                <button onClick={() => removeFromCart(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-300)", padding: 4 }}>
                  <X size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer total + valider */}
        {cart.length > 0 && (
          <div style={{
            background: "white", padding: 20,
            paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
            borderTop: "1px solid var(--gray-100)",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.08)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "var(--gray-500)", fontSize: 14 }}>Sous-total</span>
              <span style={{ fontWeight: 600 }}>{cartTotal.toLocaleString("fr-FR")} FCFA</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontWeight: 800, fontSize: 18 }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 22, color: "var(--brand)" }}>
                {cartTotal.toLocaleString("fr-FR")} FCFA
              </span>
            </div>
            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%", fontSize: 17, padding: 18 }}
              onClick={validateOrder}
              disabled={loading}
            >
              {loading ? <span className="loader" /> : <><CheckCircle size={20} /> Valider la commande</>}
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── VUE PRODUITS ── */
  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <header style={{
        background: "var(--dark)", color: "white",
        padding: "12px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: "var(--brand)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChefHat size={18} color="white" />
          </div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 15 }}>La Touche D</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{userData?.name}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              {format(new Date(), "dd MMM", { locale: fr })}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 3 }}>
              <Clock size={10} /> {todayOrders} commandes
            </div>
          </div>
          <button onClick={logout} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: "white" }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Search */}
      <div style={{ padding: "12px 12px 0" }}>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--gray-300)" }} />
          <input
            className="input"
            style={{ paddingLeft: 38, fontSize: 16 }}
            placeholder="Rechercher un plat..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ padding: "10px 12px", display: "flex", gap: 8, overflowX: "auto" }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={{
            padding: "9px 18px", borderRadius: 20, border: "none",
            fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
            background: category === c ? "var(--brand)" : "var(--white)",
            color: category === c ? "white" : "var(--gray-700)",
            boxShadow: category === c ? "0 2px 8px rgba(200,75,15,0.3)" : "var(--shadow)",
            flexShrink: 0
          }}>{c}</button>
        ))}
      </div>

      {/* Products grid - PLEIN ÉCRAN */}
      <div style={{
        flex: 1, padding: "4px 12px",
        paddingBottom: cartCount > 0 ? 100 : 24,
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 10,
        alignContent: "start"
      }}>
        {filtered.map(product => {
          const inCart = cart.find(i => i.id === product.id);
          return (
            <button key={product.id} onClick={() => addToCart(product)} style={{
              background: "var(--white)",
              border: inCart ? "2.5px solid var(--brand)" : "2px solid transparent",
              borderRadius: 16, padding: 14, cursor: "pointer", textAlign: "left",
              boxShadow: "var(--shadow)", transition: "all 0.15s",
              position: "relative", display: "flex", flexDirection: "column", gap: 8
            }}>
              {inCart && (
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  background: "var(--brand)", color: "white",
                  borderRadius: "50%", width: 24, height: 24,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800
                }}>{inCart.qty}</div>
              )}
              <div style={{
                fontSize: 32, lineHeight: 1,
                background: "var(--brand-pale)", borderRadius: 12,
                padding: 10, textAlign: "center"
              }}>
                {product.category === "Boissons" ? "🥤" : product.category === "Extras" ? "🍟" : "🍽️"}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dark)", lineHeight: 1.2 }}>
                {product.name}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--brand)" }}>
                {product.price.toLocaleString("fr-FR")} F
              </div>
              <div style={{
                fontSize: 10, color: "var(--gray-500)", background: "var(--gray-100)",
                borderRadius: 6, padding: "2px 8px", alignSelf: "flex-start"
              }}>{product.category}</div>

              {/* Bouton + visible */}
              <div style={{
                position: "absolute", bottom: 12, right: 12,
                width: 28, height: 28, borderRadius: "50%",
                background: inCart ? "var(--brand)" : "var(--gray-100)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s"
              }}>
                <Plus size={16} color={inCart ? "white" : "var(--gray-500)"} />
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1/-1" }} className="empty-state">
            <p>Aucun produit trouvé</p>
          </div>
        )}
      </div>

      {/* Bouton panier flottant */}
      {cartCount > 0 && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          padding: "12px 16px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
          background: "white",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.12)",
          zIndex: 200
        }}>
          <button
            className="btn btn-primary"
            style={{ width: "100%", padding: 18, fontSize: 17, borderRadius: 16, justifyContent: "space-between" }}
            onClick={() => setShowCart(true)}
          >
            <div style={{
              background: "rgba(255,255,255,0.25)", borderRadius: 8,
              padding: "2px 10px", fontWeight: 800, fontSize: 15
            }}>{cartCount}</div>
            <span>Voir le panier</span>
            <span style={{ fontWeight: 800 }}>{cartTotal.toLocaleString("fr-FR")} F</span>
          </button>
        </div>
      )}

      {/* Success overlay */}
      {showSuccess && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(22,163,74,0.97)",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", zIndex: 9999, animation: "fadeIn 0.2s ease"
        }}>
          <CheckCircle size={90} color="white" strokeWidth={1.5} />
          <div style={{ color: "white", fontSize: 26, fontWeight: 800, marginTop: 20 }}>Commande validée !</div>
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, marginTop: 8 }}>
            {cartTotal.toLocaleString("fr-FR")} FCFA
          </div>
        </div>
      )}
    </div>
  );
}
