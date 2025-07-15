# 📋 Fiche de Déplacement & Note de Frais – Lumières et Technologie

Ce projet est une application web locale développée pour les employés de **Lumières et Technologie**.
Elle permet de gérer les déplacements professionnels et les notes de frais internes de manière simple, sécurisée et efficace.

## ✅ Fonctionnalités

* Connexion et inscription sécurisées
* Gestion des rôles : Administrateur, Manager, Utilisateur
* Validation des comptes par les managers
* Saisie, modification et consultation des déplacements
* Ajout de justificatifs (optionnels)
* Exportation en PDF, Excel et ZIP des fiches mensuelles
* Envoi automatique par e-mail
* Interface responsive (mobile/tablette/PC)

---

## 🛠️ Technologies utilisées

* **Backend :** Node.js, Express.js, Sequelize, PostgreSQL, JWT
* **Frontend :** React.js, Axios, Tailwind CSS
* **PDF & Email :** pdf-lib, ExcelJS, nodemailer

---

## 🖥️ Comment utiliser le projet

### 🗖️ Choisissez votre mode :

#### ⚖️ Mode Développement (pour les contributeurs)

### 📆 Prérequis

* [Node.js](https://nodejs.org/)
* [PostgreSQL](https://www.postgresql.org/)
* [Git](https://git-scm.com/)

### ➟ 1. Cloner le projet

```bash
git clone https://github.com/Ibrahim-Nidam/Lumiers_Technologies_Internship.git
cd Lumiers_Technologies_Internship
```

### ➟ 2. Configurer le backend

```bash
cd backend
```

Créez un fichier `.env` :

```env
PG_DATABASE=fiche_deplacement
PG_USERNAME=TON_USERNAME⚠️
PG_PASSWORD=TON_MOT_DE_PASSE⚠️
PG_HOST=localhost
PG_PORT=5432
JWT_SECRET=TiriOtfpjMYs2LCapxRkpPmM5E8Gn2CD⚠️(generer 32bit)
```
⚠️ Adaptez ces informations selon votre identifiants pour PostgreSQL.

### ➟ 3. Créer la base de données

Ouvrez un terminal PostgreSQL :

```sql
CREATE DATABASE fiche_deplacement;
```

### ➟ 4. Installer les dépendances

```bash
# Backend
npm install
# Frontend
cd ../frontend
npm install
```

### ➟ 5. Lancer l'application en mode dev

* Démarrer le backend :

```bash
cd ../backend
node server.js
```

* Démarrer le frontend :

```bash
cd ../frontend
npm run dev
```

Accédez à `http://localhost:5173`

---

#### 🎉 Mode Production (version .exe)

Cette version est pré-packagée avec `pkg` pour Windows. Elle contient :

* Le backend compilé
* Le frontend déjà buildé (React)

### ➟ Prérequis

* [PostgreSQL](https://www.postgresql.org/)
* Aucune installation de Node.js n'est nécessaire

### ➟ Structure du dossier de déploiement

```
deploy/
├── fiche-app.exe        ← Serveur backend + frontend intégré
├── start.bat            ← Script de lancement
├── .env                 ← Fichier de configuration PostgreSQL
├── dist/                ← Frontend buildé (React)
├── uploads/             ← Dossier pour les justificatifs
└── launcher/            ← Dossier contenant la version Electron
    └── release/         ← Version finale de l'application Electron
        ├── [Application portable]
        └── [Version avec installateur]
```

### ➟ Lancement de l'application

#### Option 1 : Version Web (.exe)
1. Configurez le fichier `.env` dans le dossier `deploy` comme dans l'exemple du mode dev
2. Double-cliquez sur `start.bat`
3. Accédez à :

   ```
   http://localhost:3001
   ou depuis un autre appareil : http://[votre-ip-locale]:3001
   ```

#### Option 2 : Version Electron (Application de bureau)
1. Naviguez vers le dossier `deploy/launcher/release/`
2. Choisissez entre :
   - **Version portable** : Lancez directement l'exécutable sans installation
   - **Version avec installateur** : Installez l'application sur votre système
3. L'application s'ouvrira dans une fenêtre dédiée

---

## ⚠️ Notes importantes

<!-- * Pour s'inscrire comme **Manager**, entrez `Manager1.` comme mot de passe à l'inscription. Vous pourrez ensuite le modifier depuis votre profil. -->
* L'application est conçue pour fonctionner **en local** sur le réseau interne.
* Si l'application est lente ou vide : essayez de **rafraîchir la page**, cela peut être causé par le cache ou un chargement lourd de bibliothèques (ex: PDF, Excel).

---

## 📁 Structure complète du projet (dev)

```
Lumiers_Technologies_Internship/
│
├── backend/
│   ├── .env
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── uploads/
│   ├── seed-initial-data.js
│   └── server.js
│
├── frontend/
│   ├── dist/           ← Build frontend (production)
│   ├── public/
│   ├── src/
│   └── vite.config.js
│
├── deploy/             ← Version compilée pour Windows
│   ├── fiche-app.exe
│   ├── start.bat
│   ├── .env
│   ├── dist/
│   ├── uploads/
│   └── launcher/       ← Version Electron
│       └── release/    ← Applications finales
│           ├── [Version portable]
│           └── [Version avec installateur]
│
└── README.md
```

---

## 👤 Auteur

Stage réalisé par **Ibrahim Nidam**
Encadré par **M. Abdessamad Mouih**
Centre de formation : **YOUCODE Safi**

---

## 📬 Contact

Pour toute question, remarque ou problème, n'hésitez pas à me contacter