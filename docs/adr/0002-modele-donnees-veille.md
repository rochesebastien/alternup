# ADR-0002 — Modèle de données du module Veille d'offres

Statut : proposé (2026-08-29)

## Contexte

La v1 ingère **uniquement des offres d'alternance** depuis **La Bonne Alternance**
(`GET /job/v1/export`, dump JSON quotidien — décision de gate, rapport
`docs/plans/discovery/d-la-bonne-alternance.md`). Les offres France Travail arrivent
*via* cet export (`identifier.partner_label` / `identifier.partner_job_id`). Le modèle
doit rester ouvert à d'autres sources (FT direct, Firecrawl) sans migration structurelle,
dédupliquer les offres vues par plusieurs sources, et respecter l'exigence de fraîcheur
des CGU (statut `offer.status`, `offer.publication.expiration`, resynchro quotidienne).

Conventions à respecter (relevées dans `prisma/schema.prisma`) : modèles PascalCase +
`@@map("snake_case_pluriel")`, champs camelCase + `@map("snake_case")`, ids
`String @id @default(uuid()) @db.Uuid`, timestamps `@db.Timestamptz`, enums en valeurs
`snake_case` françaises, relations nommées avec `onDelete` explicite, miroir de chaque
enum dans `shared/utils/enums.ts` (jamais `@prisma/client` côté client).

## Décision

### Enums (dans `prisma/schema.prisma`, miroir dans `shared/utils/enums.ts`)

```prisma
enum OffreSourceType {
  la_bonne_alternance
  // futur : france_travail, firecrawl — ajout par simple migration d'enum
}

enum OffreContratType {
  apprentissage
  professionnalisation
  // v1 = alternance seule ; les stages sont explicitement hors périmètre (gate phase 0)
}

enum OffreStatut {
  active
  expiree
}

enum CandidatureStatut {
  vue
  candidate
  rejetee
}
```

### Modèle `Offre` — une offre dédupliquée

```prisma
model Offre {
  id              String            @id @default(uuid()) @db.Uuid
  // apply.url LBA : lien de candidature/origine, clé de dédup primaire
  url             String            @unique
  // sha256 de (titre + entreprise + lieu) normalisés (minuscules, accents/espaces réduits)
  dedupHash       String            @unique @map("dedup_hash")
  // première source ayant vu l'offre (les rattachements ultérieurs vivent dans OffreSource)
  sourceOrigine   OffreSourceType   @map("source_origine")

  // Champs normalisés extraits du payload (mapping export LBA entre parenthèses)
  titre           String            // offer.title
  entreprise      String?           // workplace.name ?? workplace.legal_name
  lieu            String?           // workplace.location.address
  typeContrat     OffreContratType? @map("type_contrat")       // contract.type[0]
  niveauDiplome   String?           @map("niveau_diplome")     // offer.target_diploma.level
  romeCodes       String[]          @map("rome_codes")         // offer.rome_codes
  datePublication DateTime?         @map("date_publication") @db.Timestamptz // offer.publication.creation
  dateExpiration  DateTime?         @map("date_expiration") @db.Timestamptz  // offer.publication.expiration

  // Payload source complet, non retraité (audit, réextraction future sans re-fetch)
  raw             Json

  statut          OffreStatut       @default(active)
  firstSeen       DateTime          @default(now()) @map("first_seen") @db.Timestamptz
  lastSeen        DateTime          @default(now()) @map("last_seen") @db.Timestamptz

  sources         OffreSource[]
  userStatuts     OffreUserStatut[]

  @@index([statut, datePublication])
  @@index([typeContrat])
  @@index([firstSeen])
  @@map("offres")
}
```

On ne modélise **pas** plus finement le payload LBA (salaire, compétences,
`is_delegated`, geopoint…) : ces champs restent dans `raw` et seront promus en colonnes
seulement si un filtre ou un affichage en a besoin (règle « pas de sur-modélisation »).

### Modèle `OffreSource` — rattachement n-n offre ↔ source

Une même offre peut être vue par plusieurs canaux d'ingestion (demain : LBA **et** FT
direct). Une ligne par couple (offre, source), portant l'identité de l'offre chez le
partenaire d'origine :

```prisma
model OffreSource {
  offreId      String          @map("offre_id") @db.Uuid
  source       OffreSourceType
  // Attribution LBA : identifier.partner_label (ex. « France Travail », « Hellowork »)
  partnerLabel String?         @map("partner_label")
  // identifier.partner_job_id (pour une offre FT relayée par LBA : l'id France Travail)
  partnerJobId String?         @map("partner_job_id")
  firstSeen    DateTime        @default(now()) @map("first_seen") @db.Timestamptz
  lastSeen     DateTime        @default(now()) @map("last_seen") @db.Timestamptz

  offre Offre @relation(fields: [offreId], references: [id], onDelete: Cascade)

  @@id([offreId, source])
  @@index([source, partnerLabel, partnerJobId])
  @@map("offre_sources")
}
```

L'index `(source, partnerLabel, partnerJobId)` permet la dédup croisée du jour où FT
direct est ajouté (clé robuste identifiée au rapport D).

### Modèle `OffreUserStatut` — suivi par apprenant

PK composite sur le modèle de `TutorStudent` / `AnnouncementRecipient` :

```prisma
model OffreUserStatut {
  userId    String            @map("user_id") @db.Uuid
  offreId   String            @map("offre_id") @db.Uuid
  statut    CandidatureStatut
  createdAt DateTime          @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime          @updatedAt @map("updated_at") @db.Timestamptz

  user  User  @relation("UserOffreStatuts", fields: [userId], references: [id], onDelete: Cascade)
  offre Offre @relation(fields: [offreId], references: [id], onDelete: Cascade)

  @@id([userId, offreId])
  @@index([userId, statut])
  @@map("offre_user_statuts")
}
```

(+ `offreStatuts OffreUserStatut[] @relation("UserOffreStatuts")` sur `User`.)

### Modèle `ScrapeRun` — journal d'exécution de l'ingestion

```prisma
enum ScrapeRunStatut {
  en_cours
  succes
  erreur
}

model ScrapeRun {
  id             String          @id @default(uuid()) @db.Uuid
  source         OffreSourceType
  statut         ScrapeRunStatut @default(en_cours)
  startedAt      DateTime        @default(now()) @map("started_at") @db.Timestamptz
  finishedAt     DateTime?       @map("finished_at") @db.Timestamptz
  pagesVues      Int             @default(0) @map("pages_vues")      // pages/fichiers traités
  offresVues     Int             @default(0) @map("offres_vues")
  offresCreees   Int             @default(0) @map("offres_creees")
  offresMaj      Int             @default(0) @map("offres_maj")
  offresExpirees Int             @default(0) @map("offres_expirees")
  creditsEstimes Int             @default(0) @map("credits_estimes") // 0 pour LBA ; Firecrawl plus tard
  erreurs        Json?           // liste { message, contexte } sérialisée par le script

  @@index([source, startedAt])
  @@map("scrape_runs")
}
```

La durée se dérive de `finishedAt - startedAt` (pas de colonne redondante).

### Règles de déduplication (implémentées dans le script d'ingestion, ADR-0003)

1. **Conflit sur `url`** (offre déjà connue) : mise à jour `lastSeen`, champs normalisés
   et `raw` rafraîchis, `lastSeen` de la ligne `OffreSource` correspondante mis à jour.
2. **Conflit sur `dedupHash`** (même offre vue via une autre URL/source) : **pas de
   doublon** — on rattache une ligne `OffreSource` supplémentaire à l'`Offre` existante
   et on met à jour `lastSeen`.
3. La normalisation (`normalizeForDedup(titre, entreprise, lieu)` + `dedupHashOf(...)`)
   vit dans `shared/utils/offres.ts` (module pur, testé dans `tests/shared/offres.test.ts`).

### Expiration — jamais de suppression physique

Une offre passe à `statut: expiree` quand, au terme d'un run **réussi** pour sa source :

- elle n'a pas été revue depuis `OFFRE_EXPIRATION_JOURS` jours (constante dans
  `shared/utils/offres.ts`, valeur initiale **3** — le dump LBA est complet et quotidien,
  une offre absente 3 dumps consécutifs est morte) ; **ou**
- le payload LBA la déclare morte : `offer.status ∈ { Filled, Cancelled }` ou
  `offer.publication.expiration` dépassée (exigence de fraîcheur des CGU — rapport D).

Les offres expirées restent en base (historique des candidatures des apprenants,
statistiques) mais sont exclues de l'affichage par défaut (ADR-0004). Une offre revue
active dans un dump ultérieur repasse `active`.

## Conséquences

- Une migration Prisma unique (`npx prisma migrate dev --name veille-offres`) : 4 modèles,
  5 enums, 1 relation ajoutée sur `User`.
- `shared/utils/enums.ts` gagne les miroirs `OffreSourceType`, `OffreContratType`,
  `OffreStatut`, `CandidatureStatut` (et `ScrapeRunStatut`, utilisé par l'admin/logs).
- `shared/utils/offres.ts` (nouveau, pur) : normalisation, hash de dédup, constantes,
  schémas Zod de la page (ADR-0004) ; testé sous `tests/shared/offres.test.ts`.
- Ajouter une source future = 1 valeur d'enum + 1 module source (ADR-0003), zéro
  changement de structure.

## Alternatives écartées

- **Une table par source (`OffreLba`, `OffreFt`…)** : duplique le front et les filtres,
  rend la dédup inter-sources impossible sans vue d'union.
- **`source` en colonne simple sur `Offre` sans table `OffreSource`** : perd le
  rattachement multi-sources et l'identité partenaire (`partner_job_id`) nécessaire à la
  dédup FT-direct future.
- **Suppression physique des offres expirées** : casse l'historique de candidature des
  apprenants ; le soft-delete par `statut` suffit aux exigences de fraîcheur LBA (ne plus
  *afficher*). NB : si une ingestion **France Travail directe** est ajoutée un jour, sa
  licence impose l'anonymisation des offres supprimées conservées (rapport C, art. 7) —
  à traiter dans l'ADR de cette source-là.
- **`dedup_hash` calculé en base (colonne générée)** : la normalisation (accents,
  espaces) est plus simple et testable en TypeScript pur, au prix d'une discipline :
  seul le script d'ingestion écrit ces colonnes.
