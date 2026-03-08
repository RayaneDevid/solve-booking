# Système de Réservation de Créneaux Serveurs de Jeu

## Contexte

Application web permettant à des utilisateurs de réserver des créneaux horaires sur des serveurs de jeu. Un admin gère les demandes, attribue les serveurs et distribue les mots de passe. L'interface entière doit être **en français**.

Les maquettes Figma sont disponibles via le MCP Figma — utilise-les comme référence pour le design et la structure des pages.

## Stack technique

- **Frontend** : React + Vite + TypeScript
- **Backend / Auth / BDD** : Supabase (Auth, PostgreSQL, Row Level Security)
- **Styling** : Tailwind CSS (dark mode par défaut)
- **Routing** : React Router v6+

---

## Règles métier

### Serveurs

- Il y a **3 serveurs** de jeu disponibles.
- Chaque serveur a un nom/numéro (Serveur 1, Serveur 2, Serveur 3).

### Créneaux horaires

- **Lundi → Jeudi** : réservable de **18h00 à 03h00** (lendemain).
- **Vendredi → Dimanche** : réservable de **18h00 à 04h00** (lendemain).
- Durée maximale d'un créneau : **2 heures**.
- Si les 3 serveurs sont déjà réservés (confirmés) sur un créneau donné, ce créneau est **indisponible** (complet).

### Réservation (côté User)

- L'utilisateur choisit **uniquement un jour, une heure de début et une heure de fin**.
- Il ne choisit **PAS** le serveur — c'est l'admin qui l'attribue.
- L'heure de fin max dans le formulaire s'adapte dynamiquement au jour sélectionné (03h00 en semaine, 04h00 le weekend).
- L'utilisateur peut ajouter une **note optionnelle** à sa demande.

### Gestion des réservations (côté Admin)

- L'admin voit les demandes en attente (pending).
- **Accepter** : l'admin choisit le serveur à attribuer (dropdown Serveur 1/2/3) ET saisit le **mot de passe du serveur** (champ texte). Le user voit ensuite le numéro du serveur + le mot de passe sur sa réservation acceptée.
- **Refuser** : l'admin saisit un **motif de refus** obligatoire. Le user voit le motif sur sa réservation refusée.

### Comptes utilisateurs

- **Pas d'inscription publique**. Seul l'admin peut créer des comptes (username + mot de passe).
- 2 rôles : `admin` et `user`.

---

## Pages & fonctionnalités

### 1. Page de Login (`/login`)

- Formulaire : nom d'utilisateur + mot de passe.
- Pas de lien d'inscription.
- Redirection vers le dashboard approprié selon le rôle (admin ou user).

### 2. Dashboard User (`/dashboard`)

#### Calendrier hebdomadaire

- Vue par semaine, du **lundi au dimanche**.
- Axe horaire de **18h00 à 03h00** (lun–jeu) / **18h00 à 04h00** (ven–dim). Pas de ligne supplémentaire après la dernière heure — le calendrier s'arrête à 03h00 ou 04h00 selon le jour.
- **Navigation entre les semaines** : flèche gauche (semaine précédente), label central avec la plage de dates (ex: "2 – 8 Mars 2026"), flèche droite (semaine suivante), bouton "Aujourd'hui" pour revenir à la semaine courante.
- Les réservations confirmées de tous les serveurs sont visibles (pour éviter les doublons) avec un **code couleur par serveur** :
  - Serveur 1 → Bleu
  - Serveur 2 → Vert
  - Serveur 3 → Orange
- Quand plusieurs serveurs sont réservés sur le même créneau, les blocs s'affichent **côte à côte** (sous-colonnes).
- Créneaux complets (3/3 serveurs occupés) → indicateur visuel "Complet".

#### Styles des blocs de réservation

| Statut | Style |
|---|---|
| **Confirmée** | Bloc coloré plein (bleu/vert/orange selon serveur), affiche : nom d'utilisateur, horaire, numéro de serveur |
| **En attente** | Bloc gris, bordure pointillée, opacité 50%, label "En attente" |
| **Refusée** | Bloc rouge/rouge foncé, texte barré ou badge "Refusée", opacité 40% |

#### Formulaire de nouvelle réservation

- Bouton "Nouvelle réservation" ouvrant un modal/panneau latéral.
- Champs : sélecteur de date, heure de début, heure de fin (max 2h d'écart, max dynamique selon le jour), note optionnelle.
- L'utilisateur ne choisit pas le serveur.

#### Mes réservations

- Section ou onglet avec 3 filtres : **En attente**, **Acceptées**, **Refusées** (+ Passées).
- Chaque carte affiche : date, créneau horaire, statut (badge), et si acceptée → numéro de serveur + mot de passe. Si refusée → motif de l'admin.

### 3. Dashboard Admin (`/admin`)

#### Calendrier

- Même composant calendrier que le user, avec navigation semaine et mêmes styles de blocs.
- **4 vues** accessibles via tabs ou dropdown :
  - **Tous les serveurs** (vue combinée)
  - **Serveur 1** uniquement
  - **Serveur 2** uniquement
  - **Serveur 3** uniquement

#### Demandes en attente

- Liste/panneau des réservations pending.
- Chaque demande affiche : nom d'utilisateur, date, créneau demandé.
- Actions :
  - **Accepter** → Modal avec : dropdown de sélection du serveur (indication visuelle des serveurs disponibles sur ce créneau) + champ texte "Mot de passe du serveur" → Confirmer.
  - **Refuser** → Modal avec : champ texte "Motif du refus" (obligatoire) → Confirmer.

#### Gestion des utilisateurs

- Page/section pour créer de nouveaux comptes (username + mot de passe).
- Liste des utilisateurs existants avec possibilité de désactivation.

---

## Schéma de base de données (Supabase / PostgreSQL)

### Table `profiles`

| Colonne | Type | Notes |
|---|---|---|
| id | uuid (PK) | Référence `auth.users.id` |
| username | text (unique, NOT NULL) | Nom d'utilisateur affiché |
| role | text (NOT NULL) | `admin` ou `user` |
| is_active | boolean | Défaut `true` |
| created_at | timestamptz | Défaut `now()` |

### Table `reservations`

| Colonne | Type | Notes |
|---|---|---|
| id | uuid (PK) | `gen_random_uuid()` |
| user_id | uuid (FK → profiles.id) | Demandeur |
| date | date (NOT NULL) | Jour de la réservation |
| start_time | time (NOT NULL) | Heure de début (ex: `18:00`) |
| end_time | time (NOT NULL) | Heure de fin (ex: `20:00`) |
| note | text | Note optionnelle du user |
| status | text (NOT NULL) | `pending`, `accepted`, `refused` — défaut `pending` |
| assigned_server | smallint | 1, 2 ou 3 — rempli à l'acceptation |
| server_password | text | Mot de passe fourni par l'admin à l'acceptation |
| refusal_reason | text | Motif rempli par l'admin au refus |
| reviewed_by | uuid (FK → profiles.id) | Admin qui a traité la demande |
| reviewed_at | timestamptz | Date de traitement |
| created_at | timestamptz | Défaut `now()` |

### Row Level Security (RLS)

- **Users** : peuvent lire toutes les réservations confirmées (nécessaire pour voir le calendrier), lire/créer leurs propres réservations.
- **Admins** : accès complet en lecture/écriture sur `reservations` et `profiles`.
- Les mots de passe serveur (`server_password`) ne doivent être visibles que par le user propriétaire de la réservation et les admins.

---

## Design & UI

- **Dark mode** uniquement, thème sombre type dashboard SaaS (Linear, Vercel, Raycast).
- Accents bleu/cyan.
- Cards avec glassmorphism subtil, coins arrondis, ombres douces.
- Navigation via **sidebar gauche** avec icônes + labels.
- Police sans-serif.
- Icônes : Lucide React.
- **Toute l'interface est en français** : labels, boutons, messages d'erreur, placeholders, etc.

---

## Contraintes techniques

- Validation côté client ET côté serveur (RLS + éventuellement des fonctions Supabase) :
  - Durée max 2h.
  - Heure de fin ≤ 03h00 (lun–jeu) ou 04h00 (ven–dim).
  - Heure de début ≥ 18h00.
  - Impossible de créer une réservation sur un créneau déjà complet (3 serveurs confirmés).
- Realtime : utiliser Supabase Realtime pour rafraîchir le calendrier en temps réel quand une réservation est créée/modifiée.
- Responsive : priorité desktop, mais le site doit rester utilisable sur tablette.

## Supabase Env

- Anon key : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmdndybGRyZGFibXpjeXRhcHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODE4ODgsImV4cCI6MjA4ODU1Nzg4OH0.aYxt0m2o9rjCmLm5SHBzdfflfubbVdfobGHlJQYa40s
- Project URL : https://efvwrldrdabmzcytapsd.supabase.co

## Maquettes

- Login : https://www.figma.com/design/8rfR15ZOIKUcPE14I0dO9o/Untitled?node-id=21-495&m=dev

Partie admin :

- Admin dashboard : https://www.figma.com/design/8rfR15ZOIKUcPE14I0dO9o/Untitled?node-id=21-3417&m=dev
- User management : https://www.figma.com/design/8rfR15ZOIKUcPE14I0dO9o/Untitled?node-id=21-987&m=dev
- Add new user modal : https://www.figma.com/design/8rfR15ZOIKUcPE14I0dO9o/Untitled?node-id=21-1612&m=dev

Partie user :

- Dashboard : 3 états 
-- https://www.figma.com/design/8rfR15ZOIKUcPE14I0dO9o/Untitled?node-id=21-3074&m=dev
-- https://www.figma.com/design/8rfR15ZOIKUcPE14I0dO9o/Untitled?node-id=21-2621&m=dev
-- https://www.figma.com/design/8rfR15ZOIKUcPE14I0dO9o/Untitled?node-id=21-3818&m=dev
- New reservation : https://www.figma.com/design/8rfR15ZOIKUcPE14I0dO9o/Untitled?node-id=24-451&m=dev