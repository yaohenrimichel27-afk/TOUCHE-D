# 🍽️ LA TOUCHE D — Système POS

Application de caisse digitale pour restaurant La Touche D, Bouaké, Côte d'Ivoire.

## Stack
- React 18 + Vite
- Firebase Firestore + Auth
- Recharts (graphiques)
- jsPDF + XLSX (exports)
- WhatsApp via lien direct (compatible Safari iOS)

## Installation

```bash
npm install
npm run dev
```

## Déploiement Vercel

1. Push sur GitHub
2. Connecte le repo sur vercel.com
3. Framework preset : **Vite**
4. Build command : `npm run build`
5. Output dir : `dist`

## Firebase Setup

### Authentication
- Activer **Email/Password** dans Authentication > Sign-in method

### Firestore
- Créer la base de données en mode **production**
- Copier les règles de `firestore.rules` dans Firestore > Rules

### Premier compte admin
Dans Firebase Console > Authentication > Users :
1. Ajoute un utilisateur email/password
2. Note l'UID généré
3. Dans Firestore > Collection "users" > Nouveau document avec l'UID comme ID :
   - name: "Admin"
   - email: "ton@email.com"
   - role: "admin"

## Produits initiaux
Ajoute les produits via l'interface admin de l'app (Menu & Prix > Ajouter)
ou consulte `src/lib/seedData.js` pour la liste complète.

## WhatsApp
Le rapport s'envoie via lien wa.me — compatible Safari iOS.
Numéro configuré : +225 07 08 17 50 27
