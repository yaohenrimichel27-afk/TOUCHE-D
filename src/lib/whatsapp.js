const WHATSAPP_NUMBER = "2250708175027";

/**
 * Génère le texte du rapport WhatsApp
 */
export function buildRapportMessage({ date, totalVentes, nbCommandes, platsVendus, boissonsVendues, topProduits }) {
  const ligneTop = topProduits?.length
    ? topProduits.map((p, i) => `  ${i + 1}. ${p.name} (${p.qty} vendus)`).join("\n")
    : "  Aucune donnée";

  return (
    `🍽️ *RAPPORT LA TOUCHE D*\n` +
    `📅 ${date}\n\n` +
    `💰 *Total ventes :* ${totalVentes.toLocaleString("fr-FR")} FCFA\n` +
    `🧾 *Commandes :* ${nbCommandes}\n` +
    `🍔 *Plats vendus :* ${platsVendus}\n` +
    `🥤 *Boissons vendues :* ${boissonsVendues}\n\n` +
    `🏆 *Top produits :*\n${ligneTop}\n\n` +
    `_Envoyé depuis le système POS La Touche D_`
  );
}

/**
 * Ouvre WhatsApp avec le rapport pré-rempli.
 * Gère les problèmes de redirection Safari iOS.
 */
export function envoyerRapportWhatsApp(rapportData) {
  const message = buildRapportMessage(rapportData);
  const encoded = encodeURIComponent(message);

  // On tente d'abord le schéma universel wa.me
  const urlWaMe = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
  // Schéma natif iOS (fallback si Safari bloque)
  const urlNatif = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${encoded}`;

  // Détection Safari iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  if (isIOS || isSafari) {
    // Sur Safari/iOS : on crée un lien cliquable visible pour contourner le blocage
    return { type: "manual", url: urlWaMe, urlNatif };
  }

  // Sur Chrome/Android/Desktop : ouverture directe
  window.open(urlWaMe, "_blank", "noopener,noreferrer");
  return { type: "auto" };
}
