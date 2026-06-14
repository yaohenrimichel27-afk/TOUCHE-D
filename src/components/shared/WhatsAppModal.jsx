import { useState } from "react";
import { MessageCircle, X, ExternalLink, Copy, Check } from "lucide-react";
import { envoyerRapportWhatsApp } from "../../lib/whatsapp";

export default function WhatsAppModal({ rapportData, onClose }) {
  const [copied, setCopied] = useState(false);
  const [result] = useState(() => envoyerRapportWhatsApp(rapportData));

  const message = rapportData._messageText || "";

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older iOS
      const el = document.createElement("textarea");
      el.value = message;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      zIndex: 10000, display: "flex", alignItems: "flex-end",
      justifyContent: "center", padding: "0"
    }}>
      <div style={{
        background: "white", borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: "480px", padding: "24px",
        paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
        animation: "slideUp 0.3s ease"
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "#25D366", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageCircle size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Envoyer le rapport</div>
              <div style={{ fontSize: 12, color: "var(--gray-500)" }}>Via WhatsApp</div>
            </div>
          </div>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Aperçu message */}
        <div style={{
          background: "var(--cream)", borderRadius: 12, padding: 16,
          marginBottom: 20, fontSize: 13, lineHeight: 1.6,
          whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto",
          border: "1px solid var(--gray-100)"
        }}>
          {message}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Bouton principal WhatsApp */}
          <a
            href={result.url || result.urlNatif}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 10, padding: "16px", background: "#25D366",
              color: "white", borderRadius: 12, fontWeight: 700,
              fontSize: 16, textDecoration: "none",
              boxShadow: "0 4px 16px rgba(37,211,102,0.3)"
            }}
          >
            <MessageCircle size={20} />
            Ouvrir WhatsApp
            <ExternalLink size={16} />
          </a>

          {/* Fallback schéma natif iOS */}
          <a
            href={result.urlNatif || result.url}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 10, padding: "13px", background: "var(--gray-100)",
              color: "var(--gray-700)", borderRadius: 12, fontWeight: 600,
              fontSize: 14, textDecoration: "none"
            }}
          >
            <MessageCircle size={16} />
            Essayer lien direct (iOS)
          </a>

          {/* Copier le message */}
          <button
            className="btn btn-secondary"
            style={{ width: "100%", gap: 8 }}
            onClick={copyMessage}
          >
            {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
            {copied ? "Message copié !" : "Copier le message"}
          </button>
        </div>

        <p style={{ fontSize: 11, color: "var(--gray-500)", textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
          Si WhatsApp ne s'ouvre pas, copie le message et colle-le manuellement dans WhatsApp au numéro <strong>+225 07 08 17 50 27</strong>
        </p>
      </div>
    </div>
  );
}
