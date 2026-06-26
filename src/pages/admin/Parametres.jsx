import { useState, useEffect } from "react";
import { useAuth } from "../../lib/AuthContext";
import { useToast } from "../../components/shared/Toast";
import { getObjectif, setObjectif, activerNotifications } from "../../lib/notifications";
import { Settings, Bell, BellOff, Target, Check, Info } from "lucide-react";

export default function Parametres() {
  const { userData, user } = useAuth();
  const toast = useToast();
  const [objectif, setObjectifLocal] = useState(100000);
  const [inputObjectif, setInputObjectif] = useState("");
  const [notifActive, setNotifActive] = useState(false);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [loadingObjectif, setLoadingObjectif] = useState(false);

  useEffect(() => {
    getObjectif().then((val) => {
      setObjectifLocal(val);
      setInputObjectif(String(val));
    });
    if ("Notification" in window) {
      setNotifActive(Notification.permission === "granted");
    }
  }, []);

  const saveObjectif = async () => {
    const val = parseInt(inputObjectif);
    if (!val || val <= 0) return toast("Montant invalide", "error");
    setLoadingObjectif(true);
    try {
      await setObjectif(val);
      setObjectifLocal(val);
      toast("Objectif mis a jour : " + val.toLocaleString("fr-FR") + " FCFA ✓", "success");
    } catch {
      toast("Erreur sauvegarde", "error");
    } finally {
      setLoadingObjectif(false);
    }
  };

  const toggleNotifications = async () => {
    if (notifActive) {
      toast("Pour desactiver, va dans les reglages de ton navigateur", "info");
      return;
    }
    setLoadingNotif(true);
    try {
      const result = await activerNotifications(user?.uid);
      if (result.success) {
        setNotifActive(true);
        toast("Notifications activees ! 🔔", "success");
      } else {
        if (result.reason === "Permission refusee") {
          toast("Autorise les notifications dans les reglages", "error");
        } else {
          toast("Erreur : " + result.reason, "error");
        }
      }
    } catch (e) {
      toast("Erreur activation", "error");
    } finally {
      setLoadingNotif(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Parametres</h1>
        <p style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 2 }}>Configuration du systeme</p>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: "var(--brand-pale)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Target size={18} color="var(--brand)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Objectif journalier</div>
            <div style={{ fontSize: 12, color: "var(--gray-500)" }}>
              Notification quand l'objectif est atteint
            </div>
          </div>
        </div>

        <div
          style={{
            background: "var(--brand-pale)",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <span style={{ fontSize: 13, color: "var(--gray-700)" }}>Objectif actuel</span>
          <span style={{ fontWeight: 800, fontSize: 16, color: "var(--brand)" }}>
            {objectif.toLocaleString("fr-FR")} FCFA
          </span>
        </div>

        <label>Nouvel objectif (FCFA)</label>
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <input
            className="input"
            type="number"
            placeholder="Ex: 150000"
            value={inputObjectif}
            onChange={(e) => setInputObjectif(e.target.value)}
            inputMode="numeric"
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            onClick={saveObjectif}
            disabled={loadingObjectif}
            style={{ flexShrink: 0 }}
          >
            {loadingObjectif ? <span className="loader" /> : <><Check size={16} /> Sauvegarder</>}
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {[50000, 100000, 150000, 200000].map((v) => (
            <button
              key={v}
              onClick={() => setInputObjectif(String(v))}
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                border: "1.5px solid var(--gray-100)",
                background: inputObjectif === String(v) ? "var(--brand)" : "white",
                color: inputObjectif === String(v) ? "white" : "var(--gray-700)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {v / 1000}k
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: notifActive ? "#DCFCE7" : "var(--gray-100)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {notifActive ? (
              <Bell size={18} color="var(--success)" />
            ) : (
              <BellOff size={18} color="var(--gray-500)" />
            )}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Notifications push</div>
            <div style={{ fontSize: 12, color: notifActive ? "var(--success)" : "var(--gray-500)" }}>
              {notifActive ? "✓ Activees sur cet appareil" : "Desactivees"}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#FEF3C7",
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 14,
            display: "flex",
            gap: 8,
            alignItems: "flex-start"
          }}
        >
          <Info size={15} color="#92400E" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>
            Sur iPhone, ajoute l'app sur l'ecran d'accueil via Safari pour recevoir les notifications.
            Sur Android, Chrome gere les notifications directement, aucune installation requise.
          </p>
        </div>

        <button
          className={"btn " + (notifActive ? "btn-secondary" : "btn-primary")}
          style={{ width: "100%", gap: 8 }}
          onClick={toggleNotifications}
          disabled={loadingNotif}
        >
          {loadingNotif ? (
            <span
              className="loader"
              style={{ borderTopColor: notifActive ? "var(--gray-700)" : "white" }}
            />
          ) : notifActive ? (
            <><BellOff size={16} /> Desactiver les notifications</>
          ) : (
            <><Bell size={16} /> Activer les notifications</>
          )}
        </button>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: "var(--brand-pale)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Info size={18} color="var(--brand)" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Informations</span>
        </div>
        {[
          ["Restaurant", "LA TOUCHE D"],
          ["Ville", "Bouake, Cote d'Ivoire"],
          ["WhatsApp rapport", "+225 07 08 17 50 27"],
          ["Version", "1.0.0"],
          ["Compte", userData?.name],
          ["Role", userData?.role === "admin" ? "Administrateur" : "Caissier"]
        ].map(([k, v]) => (
          <div
            key={k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid var(--gray-100)"
            }}
          >
            <span style={{ fontSize: 13, color: "var(--gray-500)" }}>{k}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
