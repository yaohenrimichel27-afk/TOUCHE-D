import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  where,
  doc,
  runTransaction
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/shared/Toast";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Search,
  LogOut,
  ChefHat,
  X,
  ArrowLeft,
  Banknote,
  AlertTriangle,
  Layers
} from "lucide-react";

const CATEGORIES = ["Tous", "Plats", "Boissons", "Vins", "Extras"];
const SEUIL_ALERTE = 5;

const PAYMENT_METHODS = [
  { id: "especes", label: "Especes", type: "icon" },
  {
    id: "orange_money",
    label: "Orange Money",
    type: "image",
    url: "https://res.cloudinary.com/dhdvyuaoy/image/upload/v1782312905/IMG_3609_mwypnh.png"
  },
  {
    id: "wave",
    label: "Wave",
    type: "image",
    url: "https://res.cloudinary.com/dhdvyuaoy/image/upload/v1782312906/IMG_3610_ozhzqd.jpg"
  }
];

const getEmoji = (category) => {
  if (category === "Boissons") return "🥤";
  if (category === "Vins") return "🍷";
  if (category === "Extras") return "🍟";
  return "🍽️";
};

const hasStockTracking = (p) => p.stock !== undefined && p.stock !== null;
const hasVariants = (p) => p.variants && p.variants.length > 0;

// Plus petite consommation parmi les variantes (pour savoir si on peut encore vendre QUELQUE CHOSE)
const minConsommation = (p) => {
  if (!hasVariants(p)) return 1;
  return Math.min(...p.variants.map((v) => v.consommation));
};

const isOutOfStock = (p) => {
  if (!hasStockTracking(p)) return false;
  return p.stock < minConsommation(p);
};

const isLowStock = (p) => {
  if (!hasStockTracking(p)) return false;
  if (isOutOfStock(p)) return false;
  return p.stock <= SEUIL_ALERTE;
};

// Verifie si une variante precise peut etre servie
const canServeVariant = (p, variant) => {
  if (!hasStockTracking(p)) return true;
  return p.stock >= variant.consommation;
};

const ProductThumb = ({ product, size = 90 }) => {
  const [failed, setFailed] = useState(false);
  const hasImage = product.imageUrl && product.imageUrl.length > 5;

  if (hasImage && !failed) {
    return (
      <div style={{ width: "100%", height: size, overflow: "hidden" }}>
        <img
          src={product.imageUrl}
          alt={product.name}
          crossOrigin="anonymous"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }
  return (
    <div
      style={{
        width: "100%",
        height: size,
        background: "var(--brand-pale)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 38
      }}
    >
      {getEmoji(product.category)}
    </div>
  );
};

const CartThumb = ({ item }) => {
  const [failed, setFailed] = useState(false);
  const hasImage = item.imageUrl && item.imageUrl.length > 5;
  if (hasImage && !failed) {
    return (
      <img
        src={item.imageUrl}
        alt={item.name}
        crossOrigin="anonymous"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        onError={() => setFailed(true)}
      />
    );
  }
  return <span style={{ fontSize: 22 }}>{getEmoji(item.category)}</span>;
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
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [lastTotal, setLastTotal] = useState(0);
  const [variantPicker, setVariantPicker] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("name"));
    return onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const q = query(collection(db, "orders"), where("timestamp", ">=", start));
    return onSnapshot(q, (snap) => setTodayOrders(snap.size));
  }, []);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchCat = category === "Tous" || p.category === category;
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
      }),
    [products, category, search]
  );

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  // Cle unique panier : id produit + nom variante (ou "default")
  const cartKey = (productId, variantNom) => productId + "::" + (variantNom || "default");

  // Total deja consomme dans le panier pour un produit (toutes variantes confondues)
  const consommationDansPanier = (productId) => {
    return cart
      .filter((i) => i.productId === productId)
      .reduce((s, i) => s + i.consommation * i.qty, 0);
  };

  const addSimpleToCart = (product) => {
    if (isOutOfStock(product)) {
      toast(product.name + " est en rupture de stock", "error");
      return;
    }
    setCart((prev) => {
      const key = cartKey(product.id, null);
      const ex = prev.find((i) => i.cartId === key);

      if (hasStockTracking(product)) {
        const dejaConsomme = consommationDansPanier(product.id);
        if (dejaConsomme + 1 > product.stock) {
          toast("Stock insuffisant pour " + product.name, "error");
          return prev;
        }
      }

      if (ex) {
        return prev.map((i) => (i.cartId === key ? { ...i, qty: i.qty + 1 } : i));
      }
      return [
        ...prev,
        {
          cartId: key,
          productId: product.id,
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category,
          imageUrl: product.imageUrl,
          consommation: 1,
          variantNom: null,
          qty: 1
        }
      ];
    });
  };

  const addVariantToCart = (product, variant) => {
    if (!canServeVariant(product, variant)) {
      toast("Stock insuffisant pour " + variant.nom, "error");
      return;
    }
    setCart((prev) => {
      const key = cartKey(product.id, variant.nom);
      const ex = prev.find((i) => i.cartId === key);

      if (hasStockTracking(product)) {
        const dejaConsomme = consommationDansPanier(product.id);
        if (dejaConsomme + variant.consommation > product.stock) {
          toast("Stock insuffisant pour " + variant.nom, "error");
          return prev;
        }
      }

      if (ex) {
        return prev.map((i) => (i.cartId === key ? { ...i, qty: i.qty + 1 } : i));
      }
      return [
        ...prev,
        {
          cartId: key,
          productId: product.id,
          id: product.id,
          name: product.name + " (" + variant.nom + ")",
          price: variant.prix,
          category: product.category,
          imageUrl: product.imageUrl,
          consommation: variant.consommation,
          variantNom: variant.nom,
          qty: 1
        }
      ];
    });
    setVariantPicker(null);
  };

  const handleProductClick = (product) => {
    if (isOutOfStock(product)) {
      toast(product.name + " est en rupture de stock", "error");
      return;
    }
    if (hasVariants(product)) {
      setVariantPicker(product);
    } else {
      addSimpleToCart(product);
    }
  };

  const updateQty = (cartId, delta) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.cartId !== cartId) return i;
          const newQty = i.qty + delta;
          if (delta > 0) {
            const product = products.find((p) => p.id === i.productId);
            if (product && hasStockTracking(product)) {
              const dejaConsomme = consommationDansPanier(i.productId);
              if (dejaConsomme + i.consommation > product.stock) {
                toast("Stock insuffisant", "error");
                return i;
              }
            }
          }
          return { ...i, qty: newQty };
        })
        .filter((i) => i.qty > 0)
    );
  };

  const removeFromCart = (cartId) => {
    setCart((prev) => prev.filter((i) => i.cartId !== cartId));
  };

  const openPaymentStep = () => {
    if (!cart.length) return toast("Panier vide", "error");
    setPaymentMethod(null);
    setShowPayment(true);
  };

  const validateOrder = async () => {
    if (!paymentMethod) return toast("Choisis un mode de paiement", "error");
    setLoading(true);
    try {
      const consommationParProduit = {};
      cart.forEach((item) => {
        consommationParProduit[item.productId] =
          (consommationParProduit[item.productId] || 0) + item.consommation * item.qty;
      });

      for (const productId of Object.keys(consommationParProduit)) {
        const product = products.find((p) => p.id === productId);
        if (product && hasStockTracking(product)) {
          const productRef = doc(db, "products", productId);
          await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(productRef);
            if (!snap.exists()) return;
            const currentStock = snap.data().stock || 0;
            const newStock = Math.max(0, currentStock - consommationParProduit[productId]);
            transaction.update(productRef, { stock: newStock });
          });
        }
      }

      await addDoc(collection(db, "orders"), {
        timestamp: serverTimestamp(),
        total: cartTotal,
        createdByName: userData?.name || "Caissier",
        paymentMethod: paymentMethod,
        items: cart.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.qty,
          category: i.category
        }))
      });
      setLastTotal(cartTotal);
      setCart([]);
      setShowPayment(false);
      setShowCart(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2200);
    } catch {
      toast("Erreur validation", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ── VARIANT PICKER ── */
  if (variantPicker) {
    const product = variantPicker;
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 10000,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center"
        }}
        onClick={() => setVariantPicker(null)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "white",
            borderRadius: "20px 20px 0 0",
            width: "100%",
            maxWidth: 480,
            padding: 22,
            paddingBottom: "calc(22px + env(safe-area-inset-bottom))",
            animation: "slideUp 0.3s ease"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "var(--brand-pale)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20
                }}
              >
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  getEmoji(product.category)
                )}
              </div>
              <h2 style={{ fontWeight: 800, fontSize: 17 }}>{product.name}</h2>
            </div>
            <button className="btn btn-icon btn-secondary" onClick={() => setVariantPicker(null)}>
              <X size={18} />
            </button>
          </div>

          <p style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 12 }}>
            Choisis la quantite
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {product.variants.map((v, i) => {
              const possible = canServeVariant(product, v);
              return (
                <button
                  key={i}
                  onClick={() => possible && addVariantToCart(product, v)}
                  disabled={!possible}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    borderRadius: 14,
                    border: "2px solid var(--gray-100)",
                    background: possible ? "white" : "var(--gray-100)",
                    cursor: possible ? "pointer" : "not-allowed",
                    opacity: possible ? 1 : 0.5
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{v.nom}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {!possible && (
                      <span style={{ fontSize: 10, color: "var(--danger)", fontWeight: 700 }}>
                        Indisponible
                      </span>
                    )}
                    <span style={{ fontWeight: 800, fontSize: 15, color: "var(--brand)" }}>
                      {v.prix.toLocaleString("fr-FR")} F
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (showPayment) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
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
            padding: 22,
            paddingBottom: "calc(22px + env(safe-area-inset-bottom))",
            animation: "slideUp 0.3s ease"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 18
            }}
          >
            <h2 style={{ fontWeight: 800, fontSize: 17 }}>Mode de paiement</h2>
            <button className="btn btn-icon btn-secondary" onClick={() => setShowPayment(false)}>
              <X size={18} />
            </button>
          </div>

          <div
            style={{
              background: "var(--brand-pale)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 18,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span style={{ fontSize: 13, color: "var(--gray-700)" }}>Total a payer</span>
            <span style={{ fontWeight: 800, fontSize: 19, color: "var(--brand)" }}>
              {cartTotal.toLocaleString("fr-FR")} FCFA
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {PAYMENT_METHODS.map((m) => {
              const active = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    borderRadius: 14,
                    border: active ? "2.5px solid var(--brand)" : "2px solid var(--gray-100)",
                    background: active ? "var(--brand-pale)" : "white",
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 11,
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid var(--gray-100)"
                    }}
                  >
                    {m.type === "icon" ? (
                      <Banknote size={22} color="var(--success)" />
                    ) : (
                      <img
                        src={m.url}
                        alt={m.label}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: active ? "var(--brand)" : "var(--dark)",
                      flex: 1,
                      textAlign: "left"
                    }}
                  >
                    {m.label}
                  </span>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: active ? "none" : "2px solid var(--gray-200)",
                      background: active ? "var(--brand)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {active && <CheckCircle size={16} color="white" />}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: "100%", marginTop: 20, fontSize: 16, padding: 16 }}
            onClick={validateOrder}
            disabled={loading || !paymentMethod}
          >
            {loading ? <span className="loader" /> : <><CheckCircle size={19} /> Confirmer la commande</>}
          </button>
        </div>
      </div>
    );
  }

  if (showCart) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--cream)",
          display: "flex",
          flexDirection: "column",
          maxWidth: "100vw",
          overflow: "hidden"
        }}
      >
        <header
          style={{
            background: "var(--dark)",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            position: "sticky",
            top: 0,
            zIndex: 100
          }}
        >
          <button
            onClick={() => setShowCart(false)}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: 9,
              padding: 8,
              cursor: "pointer",
              color: "white",
              display: "flex"
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 16, flex: 1, color: "white" }}>
            Panier · {cartCount} article{cartCount > 1 ? "s" : ""}
          </span>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "none",
                borderRadius: 9,
                padding: 8,
                cursor: "pointer",
                color: "rgba(255,255,255,0.6)",
                display: "flex"
              }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </header>

        <div
          style={{
            flex: 1,
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            overflowY: "auto"
          }}
        >
          {!cart.length ? (
            <div className="empty-state" style={{ marginTop: 60 }}>
              <ShoppingCart size={44} />
              <p>Panier vide</p>
              <button className="btn btn-primary" onClick={() => setShowCart(false)}>
                Ajouter des plats
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.cartId}
                className="card"
                style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}
              >
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 10,
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "var(--brand-pale)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <CartThumb item={item} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {item.name}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--brand)", fontWeight: 700, marginTop: 2 }}>
                    {(item.price * item.qty).toLocaleString("fr-FR")} FCFA
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => updateQty(item.cartId, -1)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      border: "1.5px solid var(--gray-100)",
                      background: "white",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Minus size={13} />
                  </button>
                  <span style={{ fontWeight: 800, fontSize: 15, minWidth: 20, textAlign: "center" }}>
                    {item.qty}
                  </span>
                  <button
                    onClick={() => updateQty(item.cartId, 1)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      border: "none",
                      background: "var(--brand)",
                      color: "white",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(item.cartId)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--gray-300)",
                    padding: 4,
                    display: "flex"
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div
            style={{
              background: "white",
              padding: "16px 14px",
              paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
              borderTop: "1px solid var(--gray-100)",
              boxShadow: "0 -4px 20px rgba(0,0,0,0.06)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "var(--gray-500)", fontSize: 13 }}>Sous-total</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                {cartTotal.toLocaleString("fr-FR")} FCFA
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontWeight: 800, fontSize: 17 }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 20, color: "var(--brand)" }}>
                {cartTotal.toLocaleString("fr-FR")} FCFA
              </span>
            </div>
            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%", fontSize: 16, padding: 16, borderRadius: 14 }}
              onClick={openPaymentStep}
            >
              <CheckCircle size={19} /> Continuer vers paiement
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--cream)",
        display: "flex",
        flexDirection: "column",
        maxWidth: "100vw",
        overflow: "hidden"
      }}
    >
      <header
        style={{
          background: "var(--dark)",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              background: "var(--brand)",
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            <ChefHat size={16} color="white" />
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: 14,
                color: "white",
                lineHeight: 1.2
              }}
            >
              La Touche D
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", lineHeight: 1 }}>
              {userData?.name} · {todayOrders} cmd
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "none",
            borderRadius: 8,
            padding: 7,
            cursor: "pointer",
            color: "rgba(255,255,255,0.7)",
            display: "flex"
          }}
        >
          <LogOut size={16} />
        </button>
      </header>

      <div style={{ padding: "10px 12px 0" }}>
        <div style={{ position: "relative" }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--gray-300)"
            }}
          />
          <input
            className="input"
            style={{ paddingLeft: 34, fontSize: 16, padding: "10px 12px 10px 34px" }}
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="scroll-tabs" style={{ padding: "8px 12px" }}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            style={{
              padding: "7px 15px",
              borderRadius: 20,
              border: "none",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              background: category === c ? "var(--brand)" : "var(--white)",
              color: category === c ? "white" : "var(--gray-700)",
              boxShadow: category === c ? "0 2px 8px rgba(200,75,15,0.25)" : "var(--shadow)",
              transition: "all 0.15s"
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          padding: "2px 12px",
          paddingBottom: cartCount > 0 ? 88 : 20,
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10,
          alignContent: "start",
          overflowY: "auto"
        }}
      >
        {filtered.map((product) => {
          const productInCart = cart.some((i) => i.productId === product.id);
          const cartQtyTotal = cart
            .filter((i) => i.productId === product.id)
            .reduce((s, i) => s + i.qty, 0);
          const outOfStock = isOutOfStock(product);
          const lowStock = isLowStock(product);
          const variant = hasVariants(product);

          return (
            <button
              key={product.id}
              onClick={() => handleProductClick(product)}
              disabled={outOfStock}
              style={{
                background: "var(--white)",
                border: productInCart ? "2px solid var(--brand)" : "2px solid transparent",
                borderRadius: 14,
                padding: 0,
                cursor: outOfStock ? "not-allowed" : "pointer",
                textAlign: "left",
                boxShadow: productInCart ? "0 3px 14px rgba(200,75,15,0.18)" : "var(--shadow)",
                transition: "all 0.12s",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                opacity: outOfStock ? 0.55 : 1
              }}
            >
              {productInCart && !outOfStock && (
                <div
                  style={{
                    position: "absolute",
                    top: 7,
                    right: 7,
                    zIndex: 2,
                    background: "var(--brand)",
                    color: "white",
                    borderRadius: "50%",
                    width: 22,
                    height: 22,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 800,
                    boxShadow: "0 2px 6px rgba(200,75,15,0.4)"
                  }}
                >
                  {cartQtyTotal}
                </div>
              )}

              {variant && !outOfStock && (
                <div
                  style={{
                    position: "absolute",
                    top: 7,
                    left: 7,
                    zIndex: 2,
                    background: "rgba(0,0,0,0.55)",
                    color: "white",
                    borderRadius: 6,
                    padding: "2px 6px",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    fontSize: 9,
                    fontWeight: 700
                  }}
                >
                  <Layers size={9} /> Choix
                </div>
              )}

              <div style={{ position: "relative" }}>
                <ProductThumb product={product} size={90} />
                {outOfStock && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.45)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <span
                      style={{
                        background: "#DC2626",
                        color: "white",
                        fontSize: 10,
                        fontWeight: 800,
                        padding: "4px 10px",
                        borderRadius: 20,
                        textAlign: "center"
                      }}
                    >
                      RUPTURE
                    </span>
                  </div>
                )}
              </div>

              <div style={{ padding: "9px 10px 10px" }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--dark)",
                    lineHeight: 1.3,
                    marginBottom: 5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {product.name}
                </div>

                {lowStock && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      marginBottom: 5,
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#92400E"
                    }}
                  >
                    <AlertTriangle size={10} /> Plus que {product.stock}
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--brand)" }}>
                    {variant
                      ? "Dès " + Math.min(...product.variants.map((v) => v.prix)).toLocaleString("fr-FR") + " F"
                      : product.price.toLocaleString("fr-FR") + " F"}
                  </span>
                  {!outOfStock && (
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: productInCart ? "var(--brand)" : "var(--gray-100)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <Plus size={13} color={productInCart ? "white" : "var(--gray-500)"} />
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
        {!filtered.length && (
          <div style={{ gridColumn: "1/-1" }} className="empty-state">
            <p>Aucun produit</p>
          </div>
        )}
      </div>

      {cartCount > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "10px 14px",
            paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
            background: "white",
            boxShadow: "0 -3px 16px rgba(0,0,0,0.09)",
            zIndex: 200
          }}
        >
          <button
            onClick={() => setShowCart(true)}
            style={{
              width: "100%",
              padding: "14px 16px",
              fontSize: 15,
              borderRadius: 13,
              border: "none",
              cursor: "pointer",
              background: "var(--brand)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontWeight: 700,
              fontFamily: "inherit",
              boxShadow: "0 3px 14px rgba(200,75,15,0.3)"
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.2)",
                borderRadius: 7,
                padding: "2px 9px",
                fontWeight: 800,
                fontSize: 14
              }}
            >
              {cartCount}
            </div>
            <span>Voir le panier</span>
            <span style={{ fontWeight: 800 }}>{cartTotal.toLocaleString("fr-FR")} F</span>
          </button>
        </div>
      )}

      {showSuccess && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#16A34A",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            animation: "fadeIn 0.18s ease"
          }}
        >
          <CheckCircle size={80} color="white" strokeWidth={1.5} />
          <div style={{ color: "white", fontSize: 22, fontWeight: 800, marginTop: 18 }}>
            Commande validee !
          </div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, marginTop: 6 }}>
            {lastTotal.toLocaleString("fr-FR")} FCFA
          </div>
        </div>
      )}
    </div>
  );
}
