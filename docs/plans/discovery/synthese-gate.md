# Phase 0 — Synthèse de gate (discovery)

> Synthèse orchestrateur des cinq rapports de `docs/plans/discovery/`.
> Gate 🧑 : validation humaine requise avant la phase 1 (ADR).

## Verdict global

La mission est faisable telle que décrite, avec **un ajustement de périmètre à trancher**
(les stages) et **un choix d'architecture d'ingestion** (FT direct vs via LBA) qui découle
des CGU relevées.

## Ce que la discovery a établi

### Split des espaces (rapports A + B)

- **Les rôles existent déjà de bout en bout** : enum Prisma `Role { Tutor, Alternant, Stagiaire }`
  sur un modèle `User` unique, relation N-N `TutorStudent`, rôle embarqué dans la session
  nuxt-auth-utils et typé dans `types/auth.d.ts`. L'app est **déjà bi-rôle de fait**
  (inscription libre ou invitation par token avec rattachement tuteur).
- La sécurité serveur est systématique (guard global `server/middleware/auth-guard.ts`,
  `requireRole` dans 103/108 handlers, ownership en 404) : le split est surtout un
  chantier **front** (routes, navigation, redirections), pas un chantier sécurité.
- Point d'accroche : `shared/utils/auth-redirect.ts` (`DEFAULT_LANDING` pointe les 3 rôles
  sur `/dashboard`). Attention : pas de dossier `layouts/` (shell dans `app.vue`),
  ~11 pages mixtes à éclater, protection de rôle côté client opt-in et absente de ces pages,
  liens en dur (`Notification.link`, `?redirect=`) qui casseront au renommage d'URLs.
- Conventions relevées (rapport B) : squelette d'endpoint invariant (`requireAuth`/`requireRole`
  → `safeParse` + `z.guid()` → `createError` FR → singleton `~/server/utils/prisma`),
  quasi-absence de pagination server-side existante (à définir pour `/api/offres`),
  `pages/alternants/index.vue` comme gabarit de tableau, tests Vitest sur `shared/` seulement.

### Sources d'offres (rapports C + D)

| | France Travail (direct) | La Bonne Alternance (API Apprentissage) |
|---|---|---|
| Accès | Libre, OAuth2 client_credentials, realm `/partenaire`, scope `api_offresdemploiv2 o2dsoffre` | Clé API gratuite self-service, header Bearer |
| Alternance | `natureContrat=E2,FS` | Oui (apprentissage + professionnalisation) |
| **Stages** | **Absents de l'API** | **Absents** |
| Ingestion | `GET /v2/offres/search`, 150/appel, fenêtre max 3 150 → segmentation nécessaire | **`GET /job/v1/export`** : dump JSON complet quotidien (3h00 Paris) — idéal |
| Chevauchement | — | **Inclut les offres FT** (`partner_job_id` = id FT) |
| CGU | Licence spécifique **exigeante** : attribution + date de maj + lien licence, **sync ≤ 24 h suppressions comprises**, affichage **intégral** de l'offre sans altération, anonymisation après suppression | Republication marque blanche prévue, **réservée aux usages non lucratifs** ; licence Etalab 2.0 (mention de source) |

Les deux CGU **autorisent** la republication dans un tableau interne gratuit derrière auth
→ le périmètre offres tient. Mais elles imposent des exigences d'implémentation (phase 4) :
lien d'origine, attribution, fraîcheur quotidienne, propagation des expirations/suppressions
à l'affichage.

### Scheduling & Firecrawl (rapport E)

- **Confirmation de l'option par défaut de la mission** : script d'ingestion isolé
  (`scripts/ingest-offres.ts`, exécutable par Node 22.18+ en type stripping), déclenché par
  un **Schedule Job Dokploy** (type Application, `docker exec`, cron 5 champs, log par
  exécution), relançable à la main. Nitro tasks écartées (toujours expérimentales).
  Aucune scheduled task n'existe aujourd'hui côté Dokploy (rapport B).
- Firecrawl v2 : scrape 1 crédit/page, extraction JSON +4 (5 au total), `/map` 1 crédit,
  surcoût stealth ×5 **périmé** (proxy `enhanced` = 1 crédit). Free 1 000 crédits/mois,
  Hobby 16 $/mois (annuel) = 5 000. SDK npm actuel : **`firecrawl`** v4 (ex `@mendable/firecrawl-js`).

## Décisions à trancher à la gate

1. **Périmètre stages** : ni FT ni LBA ne servent d'offres de stage. Options :
   (a) v1 = alternance uniquement, stages plus tard ;
   (b) stages via Firecrawl en phase 5 sur des sites cibles à lister ;
   (c) chercher une autre API officielle (piste 1jeune1solution) en début de phase 3.
2. **Architecture d'ingestion** : LBA incluant les offres FT, deux stratégies :
   - **LBA seule** : un export quotidien, CGU plus simples, les offres FT arrivent via LBA —
     recommandation orchestrateur pour la v1 (moins de code, pas de licence FT à honorer
     directement, dédup triviale) ;
   - **FT direct + LBA avec dédup** `(partner_label, partner_job_id)` : plus de contrôle
     (filtres FT riches), au prix de la licence FT (sync ≤ 24 h, affichage intégral) et
     d'une segmentation de la pagination.
3. **Clause non lucratif LBA** : OK tant qu'Alternup ne facture pas l'accès aux offres ;
   à re-valider avec l'équipe LBA si le modèle change.
4. **Point produit hors veille** (rapport A) : l'inscription libre permet aujourd'hui de
   choisir le rôle Tuteur — à confirmer ou restreindre lors du split.

## Prochaine étape (après validation)

Phase 1 — ADR courts dans `docs/adr/` : arborescence des deux espaces + middleware +
redirection par rôle ; delta Prisma (Offre, OffreSource, OffreUserStatut, ScrapeRun + enums) ;
mécanisme de planification (script + Dokploy) ; page offres derrière auth (v1).
