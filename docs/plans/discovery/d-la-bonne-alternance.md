# Phase 0-D — La Bonne Alternance / API Apprentissage

> Rapport de découverte rédigé le 2026-08-29 à partir des sources officielles actuelles
> (portail api.apprentissage.beta.gouv.fr, spec OpenAPI 3.1 téléchargée le jour même,
> data.gouv.fr, sondes HTTP sur les anciens endpoints). Aucune information « de mémoire ».

## Synthèse

- **La voie officielle et unique en 2026** pour rechercher des offres d'alternance est
  l'**Espace développeurs La bonne alternance / API Apprentissage** :
  `https://api.apprentissage.beta.gouv.fr/api` (portail : <https://api.apprentissage.beta.gouv.fr/fr>).
  C'est le « point d'entrée unique » développé par la Mission interministérielle pour
  l'apprentissage ; la page « Espace développeurs » du site labonnealternance renvoie
  exclusivement vers ce portail, et la fiche data.gouv.fr de « API La bonne alternance »
  pointe elle aussi vers `api.apprentissage.beta.gouv.fr`.
- **L'ancienne API v1 LBA est morte** (constat par sonde HTTP le 2026-08-29) :
  - `api.labonnealternance.apprentissage.beta.gouv.fr` → **DNS ne résout plus** (ENOTFOUND) ;
  - `https://labonnealternance.apprentissage.beta.gouv.fr/api/v1/jobs`, `/api/v1/formations`,
    `/api/v1/jobsEtFormations` → **404 Not Found** (le serveur répond, la route n'existe plus).
  - Aucune page officielle de « deprecation notice » n'a été retrouvée ; la disparition est
    factuelle mais non annoncée sur une page publique identifiable.
- Deux endpoints intéressent Alternup : **`GET /job/v1/search`** (recherche temps réel,
  max 450 résultats, pas de pagination) et surtout **`GET /job/v1/export`** (dump JSON complet
  de toutes les offres, régénéré chaque jour à 3h00 heure de Paris) — idéal pour une
  ingestion quotidienne.
- **Périmètre : alternance uniquement** (contrats `Apprentissage` / `Professionnalisation`).
  **Aucune offre de stage** n'est diffusée par cette API.
- **Les offres France Travail sont incluses** dans les résultats (catégorie
  `offres_emploi_partenaires`) → **risque de doublons certain** avec une ingestion France
  Travail directe ; dédup possible via `identifier.partner_label` + `identifier.partner_job_id`
  (l'`identifier.id` LBA est `null` pour les offres FT) ou via le paramètre
  `partners_to_exclude`.
- **CGU** : usage **gratuit** mais **réservé à des usages non lucratifs** ; interdiction de
  commercialiser les données. La republication en marque blanche est explicitement l'usage
  prévu (« white-label format »). Aucune clause écrite trouvée sur l'attribution, le lien
  d'origine ou une durée de cache maximale — voir section CGU.

## Accès & inscription

- **Portail** : <https://api.apprentissage.beta.gouv.fr/fr> — « Nos API sont ouvertes à tous
  et à toutes ». CGU art. 1 : « **L'inscription est gratuite et ouverte à tous.** »
- **Procédure** : création de compte par e-mail (magic link) sur
  <https://api.apprentissage.beta.gouv.fr/fr/compte/profil>, puis génération d'un **jeton
  d'accès (API key)** depuis le profil. **Immédiat, self-service, gratuit** — pas de dossier
  d'habilitation pour la lecture.
- **Deux types de clés** (l'environnement est porté par le type de clé, pas par l'URL —
  toujours `https://api.apprentissage.beta.gouv.fr/api`) :
  | | Clé **Sandbox** | Clé **Production** |
  |---|---|---|
  | Habilitations d'écriture | accordées automatiquement | sur demande au support |
  | Échanges LBA (dépôt, candidatures, RDV) | environnement de recette | production |
  | Données de lecture (offres, formations, référentiels) | identiques à la production | production |
- **Habilitations** : les endpoints de **lecture** (`/job/v1/search`, `/job/v1/offer/{id}`,
  `/job/v1/export`) ne demandent **que la clé API**, aucune habilitation. Seules les routes
  d'**écriture** exigent une habilitation (`jobs:write` pour le dépôt d'offres,
  `applications:write` pour l'envoi de candidatures, `appointments:write` pour les RDV) —
  automatique en sandbox, **par e-mail à `support_api@apprentissage.beta.gouv.fr`** pour une
  clé de production. Délai non publié.
- **Authentification** : header `Authorization: Bearer <jeton>` (scheme HTTP bearer déclaré
  dans l'OpenAPI).

## Endpoints

Base URL : `https://api.apprentissage.beta.gouv.fr/api` (serveur unique déclaré dans
l'OpenAPI). Spec OpenAPI 3.1 téléchargeable : `https://api.apprentissage.beta.gouv.fr/api/documentation/json`.

### 1. `GET /job/v1/search` — recherche temps réel

« Access in real-time all apprenticeship job opportunities available in France and offer
them to your users **for free and under a white-label format**. »

Paramètres (tous optionnels — sans critère, la recherche couvre toute la France) :

| Paramètre | Type | Détail |
|---|---|---|
| `romes` | string | Code(s) ROME séparés par des virgules (ex. `M1805,M1806`) |
| `rncp` | string | Code RNCP, motif `^RNCP\d{3,5}$` (ex. `RNCP34436`) |
| `latitude` / `longitude` | number | Coordonnées GPS du centre de recherche (obligatoires ensemble) |
| `radius` | number | Rayon en km, 0–200, **défaut 30** |
| `target_diploma_level` | enum `3\|4\|5\|6\|7` | Niveau de diplôme visé (cadre européen : 3=CAP, 4=Bac, 5=Bac+2, 6=Bac+3/4, 7=Bac+5). Le filtre renvoie le niveau demandé **et** les offres à niveau non précisé |
| `opco` | enum | Filtre par nom d'OPCO (11 valeurs : AFDAS, AKTO, ATLAS, Constructys, L'Opcommerce, OCAPIAT, OPCO 2i, Opco entreprises de proximité, Opco Mobilités, Opco Santé, Uniformation) |
| `departements` | array | Numéros de département (`departements=75&departements=06`) |
| `partners_to_exclude` | array | Labels de partenaires à exclure ; liste à jour publiée sur [ce tableau Metabase public](http://labonnealternance.apprentissage.beta.gouv.fr/metabase/public/question/70f84c13-6156-4933-9fb3-54c88887d95d) |

**Pas de paramètre de mots-clés libres** (pas de recherche full-text) : le ciblage se fait
par ROME/RNCP/géo/diplôme. **Pas de pagination** : « The results are limited to 150 for
each of the three sources i.e. **450 maximum results**, and currently, it is not possible
to retrieve all the offers matching the search criteria. » Tri : priorité de source
(LBA > France Travail > autres partenaires), puis distance croissante (si géoloc fournie),
puis date de création décroissante.

```bash
curl -H "Authorization: Bearer $LBA_API_KEY" \
  "https://api.apprentissage.beta.gouv.fr/api/job/v1/search?romes=M1805,M1806&latitude=48.8566&longitude=2.3522&radius=30&target_diploma_level=6"
```

### 2. `GET /job/v1/export` — dump complet quotidien (recommandé pour Alternup)

« Lists all job opportunities (job postings and companies to which you can send unsolicited
applications). **Opportunities are updated once a day at 3:00 AM Paris time.** »

Aucun paramètre. La réponse est un petit JSON contenant une **URL S3 présignée valable
2 minutes** pointant vers le dump JSON complet (même structure d'offre que `/job/v1/search`) :

```json
{
  "url": "https://s3.rbx.io.cloud.ovh.net/bucket/file.json?X-Amz-...",
  "lastUpdate": "2025-06-26T08:28:05.000Z"
}
```

```bash
# 1. Obtenir l'URL présignée (valide 2 min) puis 2. la télécharger immédiatement
curl -H "Authorization: Bearer $LBA_API_KEY" \
  "https://api.apprentissage.beta.gouv.fr/api/job/v1/export"
```

C'est l'option adaptée à une ingestion quotidienne en tableau interne : un cron Nitro
après 3h00 Paris, téléchargement du dump, filtrage local (ROME, département…), upsert en
base. Attention : le fichier couvre toute la France (plusieurs centaines de milliers
d'opportunités) — prévoir un parsing en streaming côté Node.

### 3. `GET /job/v1/offer/{id}` — détail d'une offre

Détail d'une offre par son identifiant LBA (ex. `6687165396d52b5e01b409545`).
Ne fonctionne que pour les offres stockées chez LBA (pas les offres France Travail, qui
n'ont pas d'`id` LBA — voir dédup).

### Autres endpoints du domaine emploi (non nécessaires en phase 1)

`POST /job/v1/offer` (dépôt, habilitation `jobs:write`), `PUT /job/v1/offer/{id}`,
`GET /job/v1/offer/{id}/publishing-informations`, `POST /job/v1/apply` (candidature,
habilitation `applications:write`).

## Format de réponse

`GET /job/v1/search` renvoie trois collections :

```
{
  "jobs":       [ JobOfferRead ],   // offres d'emploi (LBA + France Travail + partenaires)
  "recruiters": [ JobRecruiter ],   // entreprises sans offre mais à fort potentiel (candidature spontanée), max 150
  "warnings":   [ { message, code } ]
}
```

Trois familles de sources (chiffres 2025 annoncés sur le portail) :

- `offres_emploi_lba` : offres déposées directement sur LBA (~25 000/an) ; le champ
  `is_delegated=true` signale une offre gérée par un CFA pour le compte d'une entreprise ;
- `offres_emploi_partenaires` : offres des partenaires — **France Travail**, Météojobs, flux
  directs (Enedis, Engie), multidiffuseurs (Talentplug, Veritone), ATS (Kelio, Wink)
  (~325 000/an) ;
- `recruteurs_lba` : entreprises à fort potentiel d'embauche sans offre (~400 000).

Champs d'une offre (`JobOfferRead`) — les plus utiles pour Alternup :

| Champ | Contenu |
|---|---|
| `identifier.id` | Id de l'offre en base LBA — **`null` pour les offres France Travail** (récupérées à la volée, non stockées) |
| `identifier.partner_job_id` | Id de l'offre dans le SI du partenaire (pour FT : l'id France Travail) |
| `identifier.partner_label` | Partenaire d'origine (`offres_emploi_lba`, `recruteurs_lba`, ou label partenaire type France Travail, Hellowork, RH Alternance…) |
| `workplace` | `name`, `legal_name`, `brand`, `siret`, `website`, `size`, `description`, `location.address`, `location.geopoint` (GeoJSON Point), `domain` (`naf`, `opco`, `idcc`) |
| `apply.url` | **URL de redirection vers le formulaire de candidature** — le lien « offre d'origine » à afficher dans le tableau Alternup |
| `apply.phone`, `apply.recipient_id` | Téléphone recruteur ; id pour candidater via l'API (`null` = candidature API indisponible) |
| `contract.type` | Tableau, enum `Apprentissage` / `Professionnalisation` (⇒ pas de stage) |
| `contract.start`, `contract.duration`, `contract.remote` | Début, durée (mois), mode (`onsite`/`remote`/`hybrid`) |
| `offer.title`, `offer.description` | Intitulé et description |
| `offer.rome_codes`, `offer.target_diploma` | ROME, niveau de diplôme visé |
| `offer.publication.creation`, `offer.publication.expiration` | Cycle de vie (dates) |
| `offer.status` | `Active` / `Filled` / `Cancelled` |
| `offer.desired_skills`, `offer.to_be_acquired_skills`, `offer.access_conditions`, `offer.opening_count` | Compléments |
| `is_delegated` | `true` si l'offre est gérée par un CFA délégataire |

`JobRecruiter` (candidatures spontanées) ne porte que `identifier`, `workplace`, `apply`.

Le dump de `/job/v1/export` utilise « the data structure of the offers is identical to the
response of the search route ».

## Chevauchement avec France Travail (dédup)

- **Confirmé par la doc officielle** : les `offres_emploi_partenaires` incluent les offres
  **France Travail** (citées nommément sur la page « Recherche d'opportunités d'emploi en
  alternance » et dans la description du champ `jobs` de l'OpenAPI : « The offers come from:
  collection on the platform La bonne alternance, **France Travail**, publication via API by
  our partners »).
- Si Alternup ingère aussi l'API Offres d'emploi de France Travail en direct, **les mêmes
  offres arriveront deux fois**. Stratégies :
  1. **Exclusion à la source** : passer `partners_to_exclude=France Travail` sur
     `/job/v1/search` (vérifier le label exact dans la [liste Metabase publique des
     partenaires](http://labonnealternance.apprentissage.beta.gouv.fr/metabase/public/question/70f84c13-6156-4933-9fb3-54c88887d95d),
     qui « change régulièrement ») — ou filtrer le dump export sur
     `identifier.partner_label`.
  2. **Dédup par identifiant** : pour une offre FT relayée par LBA, `identifier.id` est
     `null` et `identifier.partner_job_id` est l'identifiant France Travail — il doit
     matcher l'`id` renvoyé par l'API FT directe. Clé de dédup robuste :
     `(partner_label, partner_job_id)`.
- Point d'ambiguïté à valider en phase de build : le label exact (`France Travail` vs autre
  casse) n'est pas documenté dans l'OpenAPI — à lire dans la liste Metabase ou dans un
  échantillon réel du dump.

## Quotas

Rate limiting **par consommateur (clé API)**, documenté endpoint par endpoint dans l'OpenAPI :

| Endpoint | Limite |
|---|---|
| `GET /job/v1/search` | **60 appels/min** |
| `GET /job/v1/export` | **2 appels/min** |
| `GET /job/v1/offer/{id}` (+ `publishing-informations`, quota partagé) | 120 appels/min |

Headers renvoyés à chaque réponse : `x-ratelimit-limit`, `x-ratelimit-remaining`,
`x-ratelimit-reset` ; en cas de dépassement : **HTTP 429** + header `retry-after`.
Bonnes pratiques officielles : backoff exponentiel honorant `retry-after` ; besoin de
volumes supérieurs → `support_api@apprentissage.beta.gouv.fr`.
(La fiche data.gouv.fr annonce de façon plus vague « de 5 à 20 appels/seconde, quotas
différents selon les routes » — se fier aux valeurs par endpoint de l'OpenAPI.)

## CGU & republication (section CRITIQUE)

Sources : CGU de l'espace développeurs (<https://api.apprentissage.beta.gouv.fr/fr/cgu>,
v1.0 du 31 mars 2025) + conditions spécifiques affichées sur la fiche de l'API
(<https://api.apprentissage.beta.gouv.fr/fr/explorer/recherche-offre>).

Clauses pertinentes, texte exact :

1. **Usage non lucratif obligatoire** (fiche API recherche d'offres) :
   > « L'utilisation de cette API est gratuite et **réservée à des usages non lucratifs**.
   > Notez que **toute utilisation de ces données à des fins commerciales, telles que la
   > revente ou la facturation de l'accès pour des tiers comme des candidats est
   > interdite**. »
2. **Non-commercialisation / non-communication** (CGU art. 5.2 — L'utilisateur) :
   > « Il s'engage à **ne pas commercialiser les données reçues** et à **ne pas les
   > communiquer à des tiers en dehors des cas prévus par la loi**. »
3. **Secret du jeton** (CGU art. 5.2) :
   > « L'Utilisateur s'assure de garder son jeton d'accès à l'API secret. Toute divulgation
   > du jeton quelle que soit sa forme, est interdite. »
4. **Absence de garantie** (CGU art. 5.1) :
   > « Les sources des informations diffusées […] sont réputées fiables mais la Plateforme
   > ne garantit pas qu'elle soit exempte de défauts, d'erreurs ou d'omissions. »
5. **Republication en marque blanche = usage prévu** (description OpenAPI de
   `/job/v1/search`) :
   > « offer them to your users **for free and under a white-label format** » —
   la rediffusion des offres sur un site tiers est donc explicitement le cas d'usage cible.
   Un widget marque blanche officiel existe par ailleurs.
6. **Licence du site** : « Sauf mention explicite […] les contenus de ce site sont proposés
   sous **licence etalab-2.0** » (portail) / « Open Licence 2.0 » (data.gouv.fr). La licence
   Etalab 2.0 impose la **mention de la paternité** (source + date de mise à jour) en cas
   de réutilisation — mais son articulation précise avec les données d'offres (vs « les
   contenus de ce site ») n'est pas explicitée.

**Clauses NON trouvées** (recherche explicite, aucune invention) : rien dans les CGU sur
une obligation formelle de lien vers l'offre d'origine, d'attribution visuelle « La bonne
alternance », de non-altération des offres, ni de durée maximale de cache/fraîcheur.
En pratique, la prudence impose : conserver `apply.url` comme lien de candidature/origine,
purger sur `offer.status != Active` et `offer.publication.expiration`, resynchroniser
quotidiennement (le dump est régénéré chaque jour à 3h00), et mentionner la source.
En cas de doute (notamment sur la qualification « non lucratif » d'Alternup si l'app est
un jour facturée à des écoles/entreprises) : contacter
`support_api@apprentissage.beta.gouv.fr` ou `labonnealternance@apprentissage.beta.gouv.fr`.

**Verdict pour Alternup** : republication dans un tableau interne derrière auth, gratuite
pour les utilisateurs, avec lien vers `apply.url` → compatible avec les conditions tant
qu'aucun accès aux données n'est **facturé** et que les données ne sont pas **revendues**.
Si Alternup devient un service payant, la clause « usages non lucratifs » devient un point
juridique bloquant à clarifier avec l'équipe LBA.

## Sources (consultées le 2026-08-29)

- Portail Espace développeurs La bonne alternance / API Apprentissage :
  <https://api.apprentissage.beta.gouv.fr/fr>
- Catalogue des API : <https://api.apprentissage.beta.gouv.fr/fr/explorer>
- Fiche « Recherche d'opportunités d'emploi en alternance » (conditions d'usage, sources de
  données, volumes 2025) : <https://api.apprentissage.beta.gouv.fr/fr/explorer/recherche-offre>
- Documentation technique (Swagger) : <https://api.apprentissage.beta.gouv.fr/fr/documentation-technique>
- **Spec OpenAPI 3.1 (source principale des endpoints/paramètres/schémas/quotas)** :
  <https://api.apprentissage.beta.gouv.fr/api/documentation/json> (version `41516e9`)
- CGU v1.0 du 31 mars 2025 : <https://api.apprentissage.beta.gouv.fr/fr/cgu>
- Fiche data.gouv.fr « API La bonne alternance » :
  <https://www.data.gouv.fr/dataservices/api-la-bonne-alternance>
  (redirigée depuis <https://api.gouv.fr/les-api/api-la-bonne-alternance>)
- Fiche produit beta.gouv : <https://beta.gouv.fr/startups/api.apprentissage.html>
- Page « Espace développeurs » du site LBA (renvoi vers API Apprentissage) :
  <https://labonnealternance.apprentissage.beta.gouv.fr/espace-developpeurs>
- Liste publique des partenaires (labels pour `partners_to_exclude` / dédup) :
  <http://labonnealternance.apprentissage.beta.gouv.fr/metabase/public/question/70f84c13-6156-4933-9fb3-54c88887d95d>
- Code source : <https://github.com/mission-apprentissage/api-apprentissage>
- Sondes HTTP (2026-08-29) : `api.labonnealternance.apprentissage.beta.gouv.fr` → DNS
  ENOTFOUND ; `labonnealternance.apprentissage.beta.gouv.fr/api/v1/{jobs,formations,jobsEtFormations}`
  → 404 ; `/api/version` → 200 (`1.896.1`).
