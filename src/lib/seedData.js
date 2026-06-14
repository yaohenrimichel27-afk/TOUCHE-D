// Script de seed — colle ce code dans la console Firebase
// OU utilise-le comme référence pour ajouter les produits manuellement

const produits = [
  // Plats
  { name: "Alloco Poulet", price: 3500, category: "Plats", active: true },
  { name: "Riz Gras", price: 3000, category: "Plats", active: true },
  { name: "Attiéké Poisson", price: 3500, category: "Plats", active: true },
  { name: "Choukouya", price: 3000, category: "Plats", active: true },
  { name: "Placali Sauce", price: 3500, category: "Plats", active: true },
  { name: "Brochette", price: 2500, category: "Plats", active: true },
  { name: "Foutou Soupe", price: 2500, category: "Plats", active: true },
  { name: "Riz Sauce Graine", price: 3000, category: "Plats", active: true },
  // Boissons
  { name: "Coca Cola", price: 1000, category: "Boissons", active: true },
  { name: "Sprite", price: 1000, category: "Boissons", active: true },
  { name: "Eau Minérale", price: 500, category: "Boissons", active: true },
  { name: "Jus de Fruit", price: 1000, category: "Boissons", active: true },
  { name: "Bière Castel", price: 1500, category: "Boissons", active: true },
  // Extras
  { name: "Alloco seul", price: 500, category: "Extras", active: true },
  { name: "Pain", price: 250, category: "Extras", active: true },
];

// Dans la console Firebase (Firestore) tu peux ajouter ces produits
// manuellement en cliquant "+ Ajouter un document" dans la collection "products"
// OU utilise l'interface admin de l'app après connexion !

export default produits;
