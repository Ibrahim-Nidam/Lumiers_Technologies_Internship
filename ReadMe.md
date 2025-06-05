# 📋 Fiche de Déplacement & Note de Frais – Lumières et Technologie

Ce projet est une application web locale développée pour les employés de **Lumières et Technologie**.  
Elle permet de gérer les déplacements professionnels et les notes de frais internes de manière simple, sécurisée et efficace.

## ✅ Fonctionnalités

- Connexion et inscription sécurisées
- Gestion des rôles : Administrateur, Manager, Utilisateur
- Validation des comptes par les managers
- Saisie, modification et consultation des déplacements
- Ajout de justificatifs (optionnels)
- Exportation en PDF des fiches mensuelles
- Envoi automatique par e-mail
- Interface responsive (mobile/tablette/PC)

---

## 🧰 Technologies utilisées

- **Backend :** Node.js, Express.js, Sequelize, PostgreSQL, JWT
- **Frontend :** React.js, Axios, Tailwind CSS
- **PDF & Email :** pdf-lib, nodemailer

---

## 🖥️ Comment exécuter le projet (pas à pas)

### 📦 Prérequis

- [Node.js](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Git](https://git-scm.com/)

---

### 🔁 Étape 1 – Cloner le projet

```bash
git clone https://github.com/Ibrahim-Nidam/Lumiers_Technologies_Internship.git
cd Lumiers_Technologies_Internship
```
---

### ⚙️ Étape 2 – Configurer le backend

1. Accédez au dossier backend :

    ``` bash
    cd backend/
    ```

2. Créez un fichier `.env` dans ce dossier avec les informations suivantes :

   ```env
   PG_DATABASE=fiche_deplacement
   PG_USERNAME=TON_USERNAME⚠️
   PG_PASSWORD=TON_MOT_DE_PASSE⚠️
   PG_HOST=localhost
   PG_PORT=5432
   JWT_SECRET=TiriOtfpjMYs2LCapxRkpPmM5E8Gn2CD
   ```
⚠️ Adaptez ces informations selon votre identifiants pour PostgreSQL.

3. Installez les dépendances backend :

   ```bash
   npm install
   ```

---

### 🗃️ Étape 3 – Créer la base de données

1. Ouvrez pgAdmin ou un terminal PostgreSQL

2. Exécutez :

   ```sql
   CREATE DATABASE fiche_deplacement;
   ```

---

### 🚀 Étape 4 – Lancer le backend

Toujours dans le dossier `backend` :

```bash
node server.js
```

Le serveur API démarre sur `http://localhost:3001`.

---

### 🧑‍💻 Étape 5 – Lancer le frontend

1. Ouvrez un **nouveau terminal**

2. Allez dans le dossier `frontend` :

   ```bash
   cd ../frontend
   ```

3. Installez les dépendances :

   ```bash
   npm install
   ```

4. Lancez le serveur React :

   ```bash
   npm run dev
   ```

   Le site s’ouvrira automatiquement dans votre navigateur (ex: `http://localhost:5173`)

---

## 📁 Structure du projet

```
Lumiers_Technologies_Internship/
│
├── backend/         ← API Node.js, Express, Sequelize
│   ├── models/      ← Modèles de la base de données
│   ├── routes/      ← Points d’entrée de l’API
│   └── .env         ← Configuration locale
│
├── frontend/        ← Interface utilisateur (React.js)
│
└── README.md        ← Ce fichier
```

---

## 👤 Auteur

Stage réalisé par **Ibrahim Nidam**
Encadré par **M. Abdessamad Mouih**
Centre de formation : **YOUCODE Safi**

---

## 📬 Contact

Pour toute question, remarque ou problème, n'hésitez pas à me contacter.