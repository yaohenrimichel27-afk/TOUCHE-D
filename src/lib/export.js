import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const BRAND_COLOR = [200, 75, 15]; // #C84B0F

export function exportPDF({ orders, period, stats }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Header
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("LA TOUCHE D", 14, 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Bouaké, Côte d'Ivoire — Rapport POS", 14, 20);
  doc.text(`Généré le ${format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr })}`, 140, 20);

  // Period
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Période : ${period}`, 14, 38);

  // Stats boxes
  const statItems = [
    { label: "Total ventes", value: `${(stats.totalVentes || 0).toLocaleString("fr-FR")} FCFA` },
    { label: "Commandes", value: stats.nbCommandes || 0 },
    { label: "Plats vendus", value: stats.platsVendus || 0 },
    { label: "Boissons vendues", value: stats.boissonsVendues || 0 },
  ];

  statItems.forEach((s, i) => {
    const x = 14 + i * 46;
    doc.setFillColor(250, 246, 242);
    doc.roundedRect(x, 44, 43, 22, 3, 3, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(s.label, x + 4, 51);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_COLOR);
    doc.text(String(s.value), x + 4, 60);
  });

  // Orders table
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Détail des commandes", 14, 76);

  const rows = orders.map((o) => [
    format(o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.timestamp), "dd/MM HH:mm"),
    o.createdByName || "Caissier",
    o.items?.map((i) => `${i.name} x${i.quantity}`).join(", ") || "—",
    `${(o.total || 0).toLocaleString("fr-FR")} FCFA`,
  ]);

  autoTable(doc, {
    startY: 80,
    head: [["Date/Heure", "Caissier", "Produits", "Total"]],
    body: rows,
    headStyles: { fillColor: BRAND_COLOR, textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [252, 248, 245] },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(`Page ${i} / ${pageCount} — La Touche D POS`, 14, 290);
  }

  doc.save(`rapport-la-touche-d-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

export function exportExcel({ orders, period, stats }) {
  const wb = XLSX.utils.book_new();

  // Stats sheet
  const statsData = [
    ["LA TOUCHE D — Rapport POS"],
    [`Période : ${period}`],
    [`Généré le ${format(new Date(), "dd/MM/yyyy HH:mm")}`],
    [],
    ["Statistiques"],
    ["Total ventes (FCFA)", stats.totalVentes || 0],
    ["Nombre de commandes", stats.nbCommandes || 0],
    ["Plats vendus", stats.platsVendus || 0],
    ["Boissons vendues", stats.boissonsVendues || 0],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(statsData);
  ws1["!cols"] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Résumé");

  // Orders sheet
  const ordersData = [
    ["Date/Heure", "Caissier", "Produits", "Total (FCFA)"],
    ...orders.map((o) => [
      format(o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.timestamp), "dd/MM/yyyy HH:mm"),
      o.createdByName || "Caissier",
      o.items?.map((i) => `${i.name} x${i.quantity}`).join(", ") || "—",
      o.total || 0,
    ]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(ordersData);
  ws2["!cols"] = [{ wch: 18 }, { wch: 15 }, { wch: 50 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Commandes");

  XLSX.writeFile(wb, `rapport-la-touche-d-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}
