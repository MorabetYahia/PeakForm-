# 🏋️ PeakForm — Reach your peak with ease

**Application mobile & web de coaching sportif et nutritionnel**, pensée pour connecter coachs et clients autour d'un seul outil : programmes personnalisés, suivi de progression, nutrition, boutique d'équipement et messagerie en temps réel.

> Projet de Fin d'Études (Licence SMI) — Université Abdelmalek Essaâdi, Faculté des Sciences de Tétouan
> Réalisé par **Yahia Morabet** & **Yasser Tazi**, encadré par **Pr. Jellouli Ismail**

---

## 💡 Le projet en bref

Un coach sportif qui gère ses clients aujourd'hui jongle souvent entre WhatsApp pour le suivi, un tableau Excel pour la nutrition, et des paiements en espèces pour vendre ses programmes. Côté client, difficile de savoir où en est vraiment sa progression sans tout centraliser soi-même.

**PeakForm** réunit tout ça dans une seule plateforme : le coach crée et vend ses programmes d'entraînement et de nutrition, suit la progression de ses clients et communique avec eux en direct ; le client découvre des programmes adaptés à ses objectifs, suit son plan jour par jour et échange avec son coach sans quitter l'application. Un site vitrine présente le produit et une plateforme d'administration permet de piloter l'ensemble de l'écosystème (utilisateurs, coachs, contenus, boutique, support).

C'est un projet complet : de la conception (UML, modélisation de la base de données) jusqu'à une application fonctionnelle sur trois fronts — mobile, web vitrine et back-office.

## ✨ Fonctionnalités

**Côté client**
- Création de compte et connexion sécurisée
- Découverte de programmes fitness/nutrition avec filtres (objectif, type, niveau, durée)
- Suivi quotidien du plan actif (exercices à cocher, progression, rappels santé)
- Boutique intégrée pour acheter équipements et compléments
- Chat en temps réel avec son coach
- Gestion du profil, des paramètres et des moyens de paiement

**Côté coach**
- Inscription avec vérification (pièce d'identité + certificat professionnel)
- Tableau de bord : clients actifs, note moyenne, revenus
- Création et personnalisation de programmes (fitness et nutrition, jour par jour)
- Suivi de la progression de chaque client
- Vente de plans et messagerie directe avec les clients

**Côté administrateur**
- Gestion des clients, des coachs (validation des profils) et des plans
- Gestion de la boutique (produits, stocks, commandes)
- Traitement des tickets de support
- Tableau de bord analytique (revenus, répartition des plans, statistiques d'usage)

**Site vitrine**
- Présentation de l'application et de ses opportunités (objectifs fitness/nutrition)
- Téléchargement via QR code ou lien direct
- Témoignages utilisateurs, inscription en ligne, interface multilingue (FR/EN)

## 🛠️ Stack technique

| Domaine | Technologies |
|---|---|
| Application mobile | React Native, Expo, TypeScript / JavaScript |
| Site vitrine | React.js, Framer Motion, Chart.js |
| Plateforme d'administration | React.js 19, Chart.js, Lucide React |
| Backend & base de données | Supabase (BaaS), PostgreSQL, Row Level Security (RLS), API RESTful |
| Internationalisation | i18next (détection automatique de la langue) |
| Outils & environnement | Android Studio, VS Code, Draw.io (modélisation UML), Git/GitHub |

## 🗄️ Base de données

Modèle relationnel PostgreSQL géré via Supabase, avec des politiques RLS pour sécuriser l'accès aux données selon le rôle de l'utilisateur (client, coach, admin). Les entités principales : `user`, `client`, `coach`, `admin`, `plan`, `client_plan`, `fitness_schedule`, `nutrition_schedule`, `product`, `shopping_cart`, `chat_session` / `chat_message`. Cette structure permet de gérer proprement l'attribution des plans, le suivi des commandes et la communication en temps réel entre coachs et clients.

## 📱 Aperçu

*(Ajoute ici 2-4 captures d'écran de l'app — écran d'accueil, dashboard coach, suivi client. Un GIF de la navigation fait toujours bon effet.)*

```
/screenshots
  ├── landing-page.png
  ├── mobile-home.png
  └── admin-dashboard.png
```

## 🎓 Ce que ce projet m'a appris

Ce PFE a été ma première expérience de conception complète d'un produit multi-plateforme : penser l'architecture avant de coder (diagrammes de cas d'utilisation, diagramme de classes), gérer les rôles et permissions de trois types d'utilisateurs différents, sécuriser une base de données avec des politiques RLS, et construire une expérience cohérente entre une app mobile, un site web et un back-office. C'est aussi le projet où j'ai appris à travailler en binôme sur une base de code partagée sur la durée, avec de vraies contraintes d'organisation et de planning.

## 🚀 Installation (aperçu rapide)

```bash
# Cloner le repo
git clone https://github.com/MorabetYahia/PeakForm-.git
cd PeakForm-

# Installer les dépendances
npm install

# Configurer les variables d'environnement (clés Supabase)
cp .env.example .env

# Lancer l'application avec Expo
npx expo start
```

## 👤 Auteurs

- **Yahia Morabet** — [GitHub](https://github.com/MorabetYahia) · [LinkedIn](https://www.linkedin.com/in/yahia-morabet-52149639b/)
- **Yasser Tazi**

---

*Projet académique réalisé dans le cadre du Projet de Fin d'Études, Licence Sciences Mathématiques et Informatique — 2024/2025.*
