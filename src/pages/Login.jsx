import { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/shared/Toast";
import { Eye, EyeOff, Flame } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return toast("Remplis tous les champs", "error");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const msg = err.code === "auth/invalid-credential"
        ? "Email ou mot de passe incorrect"
        : "Erreur de connexion";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 20,
      background: "linear-gradient(135deg, #1A1410 0%, #2D1A0E 50%, #C84B0F 100%)"
    }}>
      <div style={{ width: "100%", maxWidth: 380 }} className="fade-in">

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 72, height: 72, background: "var(--brand)",
            borderRadius: 20, display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 16px",
            boxShadow: "0 8px 32px rgba(200,75,15,0.4)"
          }}>
            <Flame size={36} color="white" />
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28, fontWeight: 800, color: "white",
            letterSpacing: "-0.5px"
          }}>La Touche D</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 6 }}>
            Bouaké, Côte d'Ivoire
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Connexion</h2>
          <p style={{ fontSize: 13, color: "var(--gray-500)", marginBottom: 24 }}>
            Accès réservé au personnel autorisé
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label>Email</label>
              <input
                className="input"
                type="email"
                placeholder="exemple@restaurant.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>

            <div>
              <label>Mot de passe</label>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  style={{ paddingRight: 48 }}
                />
                <button
                  style={{
                    position: "absolute", right: 14, top: "50%",
                    transform: "translateY(-50%)", background: "none",
                    border: "none", cursor: "pointer", color: "var(--gray-500)"
                  }}
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: 8 }}
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? <span className="loader" /> : "Se connecter"}
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 24 }}>
          Système POS La Touche D — v1.0
        </p>
      </div>
    </div>
  );
}
