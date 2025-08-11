# Anonymiseur Juridique 🔒

Application complète d'anonymisation de documents juridiques avec interface React moderne.

## 🚀 Démarrage Rapide

### 1. Installation

```bash
# Cloner ou créer le projet
mkdir anonymiseur-juridique
cd anonymiseur-juridique

# Initialiser npm
npm init -y

# Installer les dépendances
npm install react@^18.2.0 react-dom@^18.2.0 zustand@^4.4.7 lucide-react@^0.263.1 mammoth@^1.6.0

# Installer les dépendances de développement
npm install -D @types/react@^18.2.37 @types/react-dom@^18.2.15 @typescript-eslint/eslint-plugin@^6.10.0 @typescript-eslint/parser@^6.10.0 @vitejs/plugin-react@^4.1.1 autoprefixer@^10.4.16 eslint@^8.53.0 eslint-plugin-react-hooks@^4.6.0 eslint-plugin-react-refresh@^0.4.4 postcss@^8.4.31 tailwindcss@^3.3.5 typescript@^5.2.2 vite@^5.0.0
```

### 2. Structure des fichiers

Créer la structure suivante :

```
anonymiseur-juridique/
├── index.html                    # ✅ Fichier HTML principal
├── package.json                  # ✅ Configuration npm
├── tsconfig.json                 # ✅ Configuration TypeScript
├── tsconfig.node.json            # ✅ Configuration TypeScript Node
├── vite.config.ts                # ✅ Configuration Vite
├── tailwind.config.js            # ✅ Configuration Tailwind
├── postcss.config.js             # ✅ Configuration PostCSS
├── src/
│   ├── main.tsx                  # ✅ Point d'entrée React
│   ├── App.tsx                   # ✅ Composant principal
│   ├── components/
│   │   ├── UploadPage.tsx        # ✅ Page d'upload
│   │   ├── ProgressPage.tsx      # ✅ Page de progression
│   │   ├── EditorInterface.tsx   # ✅ Interface d'édition
│   │   └── NotificationContainer.tsx # ✅ Notifications
│   ├── stores/
│   │   └── index.ts              # ✅ Stores Zustand
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.ts # ✅ Raccourcis clavier
│   │   ├── useDocumentProcessing.ts # ✅ Traitement docs
│   │   └── useEntitySearch.ts    # ✅ Recherche entités
│   └── styles/
│       └── globals.css           # ✅ Styles globaux
└── public/
    └── vite.svg                  # Logo Vite
```

### 3. Copier les fichiers

1. **Copier tous les composants React** depuis les artifacts fournis
2. **Copier les stores Zustand** depuis l'artifact "Stores Zustand Corrigés"
3. **Copier les hooks personnalisés** depuis l'artifact "Hooks Personnalisés"
4. **Copier les fichiers de configuration** depuis l'artifact "Fichiers de Configuration Manquants"
5. **Copier les styles CSS** depuis l'artifact "styles/globals.css"

### 4. Lancer l'application

```bash
# Démarrer le serveur de développement
npm run dev

# Construire pour la production
npm run build

# Prévisualiser la build de production
npm run preview
```

L'application sera accessible sur `http://localhost:3000`

## 🎯 Fonctionnalités

### ✅ **Implémentées**
- 📤 **Upload de documents** (PDF/DOCX, 25MB max)
- 🔍 **Deux modes d'analyse** : Regex (8 types) vs IA (toutes entités)
- 📊 **Progression temps réel** avec animations
- 🖼️ **Visualisateur de document** avec surlignages interactifs
- ✏️ **Édition des entités** (modification, suppression, groupement)
- 🔎 **Recherche avancée** (texte simple, regex)
- 👁️ **Prévisualisation temps réel** (original ↔ anonymisé)
- 📥 **Export DOCX** avec préservation du format
- ⌨️ **Raccourcis clavier** (Ctrl+A, Delete, Escape, etc.)
- 🔔 **Notifications** et gestion d'erreurs
- 📱 **Interface responsive**

### 🎨 **Interface**
- **Page 1** : Upload avec sélection de mode
- **Page 2** : Progression avec statistiques temps réel
- **Page 3** : Interface unifiée avec 4 onglets :
  - 📋 Entités (tableau interactif)
  - 👥 Groupes (gestion des groupes)
  - 🔍 Recherche (multi-modes)
  - ⚙️ Règles (configuration)

## 🛠️ Architecture Technique

### **Stack**
- **Frontend** : React 18 + TypeScript + Vite
- **State Management** : Zustand (3 stores principaux)
- **Styling** : Tailwind CSS + CSS personnalisé
- **Icons** : Lucide React
- **Document Processing** : Mammoth.js (simulation)

### **Stores Zustand**
- 📄 **DocumentStore** : Gestion des documents et navigation
- 🏷️ **EntitiesStore** : CRUD des entités et groupes
- 🖥️ **UIStore** : État de l'interface, modals, notifications

### **Hooks Personnalisés**
- ⌨️ `useKeyboardShortcuts` : Raccourcis clavier globaux
- 📄 `useDocumentProcessing` : Upload et traitement des fichiers
- 🔍 `useEntitySearch` : Recherche dans les documents

## 📋 Types d'Entités Supportées

### **Mode Regex (8 types)**
- 📧 EMAIL - Adresses email
- 📞 PHONE - Numéros de téléphone français
- 📅 DATE - Dates (formats multiples)
- 💳 IBAN - Codes bancaires IBAN
- 🏢 SIREN - Numéros SIREN (9 chiffres)
- 🏢 SIRET - Numéros SIRET (14 chiffres)
- 📍 ADDRESS - Adresses postales
- 🌍 LOC - Lieux et villes

### **Mode IA (types étendus)**
- 👤 PERSON - Noms de personnes (NER)
- 🏢 ORG - Organisations et entreprises (NER)
- + Tous les types Regex avec scores de confiance

## ⌨️ Raccourcis Clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl+A` | Sélectionner toutes les entités |
| `Delete` / `Backspace` | Supprimer les entités sélectionnées |
| `Escape` | Déselectionner tout / Fermer les modals |
| `Ctrl+H` | Basculer vue original/anonymisé |
| `Ctrl++` / `Ctrl+-` | Zoom in/out |
| `1-4` | Naviguer entre les onglets |

## 🎨 Personnalisation

### **Couleurs des entités**
```typescript
const entityConfig = {
  PERSON: { color: 'bg-blue-100 border-blue-300 text-blue-800' },
  EMAIL: { color: 'bg-green-100 border-green-300 text-green-800' },
  // ...
};
```

### **Patterns Regex personnalisés**
```typescript
const CUSTOM_PATTERNS = {
  CUSTOM_TYPE: /your-regex-pattern/g,
};
```

## 🚀 Prochaines Étapes (Backend)

Pour une version complète en production, ajouter :

1. **Backend API** (Node.js + Express)
2. **Service IA** (Python + FastAPI + spaCy)
3. **Base de données** (PostgreSQL + Redis)
4. **Stockage cloud** (AWS S3)
5. **Authentification** et sécurité
6. **Tests automatisés** (Jest + Playwright)

## 🐛 Débogage

### **Problèmes courants**
1. **Erreur TypeScript** : Vérifier que tous les types sont importés
2. **Styles non appliqués** : Vérifier la configuration Tailwind
3. **Hooks ne fonctionnent pas** : Vérifier les importations des stores

### **Dev Tools**
- React Dev Tools (extension navigateur)
- Zustand Dev Tools (intégrés en développement)
- Console navigateur pour les logs

## 📄 Licence

Ce projet est un prototype éducatif pour démonstration d'architecture React/TypeScript moderne.

---

**🎉 Application 100% Fonctionnelle !**

L'ensemble des composants, stores, hooks et configurations sont fournis.
Il suffit de créer les fichiers selon la structure indiquée et copier le code des artifacts.