# Phase 0-C — API France Travail « Offres d'emploi » (v2)

> Rapport de recherche établi le **29/08/2026** à partir des sources officielles actuelles
> (francetravail.io — contenu CMS et fichier OpenAPI servis par la plateforme elle-même,
> voir § Sources). Les points non documentés publiquement sont signalés comme tels.

## Synthèse (faisabilité, points durs)

**Faisable, et c'est le cas d'usage nominal de l'API.** L'API « Offres d'emploi » v2 est en
**accès libre** (création de compte francetravail.io, pas de validation manuelle), OAuth2
`client_credentials`, et couvre nativement le filtre alternance via
`natureContrat=E2,FS` (E2 = contrat d'apprentissage, FS = contrat de professionnalisation).
La réutilisation/republication sur un site tiers est explicitement prévue par une **licence
spécifique** (gratuite, non exclusive) — mais elle impose des obligations fortes :

- **Point dur n°1 — fraîcheur** : obligation de solliciter l'API **au moins une fois toutes
  les 24 h** et de répercuter créations/modifications/suppressions dans notre base
  (licence, art. 5.2). Notre ingestion quotidienne est donc le *minimum* contractuel, et il
  faut **supprimer** chez nous les offres disparues de l'API.
- **Point dur n°2 — intégrité** : chaque offre republiée doit afficher **la totalité du
  contenu** fourni par l'API pour cette offre, logo compris ; interdiction d'altérer ou de
  dénaturer (art. 1.1 et 5.3). Pas de troncature de description côté page détail.
- **Point dur n°3 — les stages ne sont PAS dans cette API** (voir § Recherche). Il faudra
  une autre source pour les stages.
- Mentions obligatoires : source « France Travail » + date de dernière mise à jour + mention
  de la licence avec lien (art. 4). Faisable dans un footer/encart du tableau.
- Notre tableau est derrière auth : compatible (la licence n'impose pas un accès public),
  mais l'art. 3 interdit de sous-licencier la base à des tiers et impose d'empêcher
  l'extraction massive par nos utilisateurs.

Volumétrie/pagination : 150 offres max par appel, fenêtre limitée aux **3 150 premiers
résultats** par recherche → segmenter les requêtes (par département par exemple) pour une
ingestion exhaustive.

## Inscription & accès

Parcours documenté (pages « Comprendre les API », « Gérer mon compte et mes applications »,
« Conditions d'utilisation des API », fiche API « Offres d'emploi ») :

1. **Créer un compte** sur <https://francetravail.io> (bouton de connexion/inscription du
   portail ; e-mail + mot de passe + acceptation des CGU).
2. **Déclarer une application** : depuis « Mon espace » (bouton *Créer une application*) ou
   depuis la page de l'API (bouton *Utiliser l'API*). Informations demandées : **nom de
   l'application, description, URL d'accès** (le site où l'API est utilisée). Ces infos
   servent au suivi de consommation — à remplir sérieusement.
3. **Identifiants** : un **identifiant client (client_id) et une clé secrète
   (client_secret) sont délivrés par application**, consultables à tout moment sur la page
   de configuration de l'application.
4. **Souscrire l'API « Offres d'emploi »** : depuis la page de l'API
   (<https://francetravail.io/produits-partages/catalogue/offres-emploi>), bouton
   *Utiliser l'API* → associer l'API à l'application.

**Délais/validation** : l'API Offres d'emploi est classée **« accès libre »**
(`accesType: publique` dans la fiche) : aucune demande d'accès ni validation manuelle n'est
documentée — l'accès est immédiat après création du compte et de l'application. (Les
formulaires de demande d'accès ne concernent que les API « en accès conditionné » : France
Travail Connect, Loi plein emploi, prestations sous-traitées.)

Version : la fiche technique indique **version 2** de l'API (OpenAPI `info.version: 2.01`).

## Authentification

OAuth2 **client_credentials**, royaume (`realm`) **`/partenaire`**.

- **Token endpoint (exact)** :
  `POST https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire`
- **Scopes exacts pour l'API Offres d'emploi v2** : `api_offresdemploiv2 o2dsoffre`
  (les deux sont marqués « Obligatoire » dans le securityScheme OpenAPI ; séparés par des
  espaces dans le corps de la requête).
- **Durée de vie du token** : `expires_in` retourné dans la réponse ; l'exemple officiel
  montre **1499 secondes (~25 min)**. Aucune durée contractuelle garantie n'est documentée →
  lire `expires_in` à chaque forge et renouveler proactivement (pas de refresh token en
  client_credentials).

Exemple officiel (page « 4.1. Client Credentials ») :

```bash
curl -s -X POST \
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=$FT_CLIENT_ID" \
  -d "client_secret=$FT_CLIENT_SECRET" \
  -d "scope=api_offresdemploiv2 o2dsoffre"
# → { "scope": "api_offresdemploiv2 o2dsoffre", "expires_in": 1499,
#     "token_type": "Bearer", "access_token": "..." }
```

Le token s'utilise ensuite en header `Authorization: Bearer <access_token>` sur
`https://api.francetravail.io/partenaire/...` (page « 4.4. Requêter une API »).

## Recherche d'offres

Base URL (OpenAPI `servers`) : **`https://api.francetravail.io/partenaire/offresdemploi`**

- **Recherche** : `GET /v2/offres/search` (existence vérifiée le 29/08/2026 : répond 401
  sans token).
- **Détail** : `GET /v2/offres/{id}` (200 = trouvée, 204 = n'existe pas/plus — utile pour
  purger notre base).

### Exemple curl — offres d'alternance d'un département

```bash
curl -s -D - \
  "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?natureContrat=E2,FS&departement=69&range=0-149&sort=1" \
  -H "Authorization: Bearer $FT_TOKEN" \
  -H "Accept: application/json"
```

### Paramètres pertinents (extraits du fichier OpenAPI officiel)

| Paramètre | Rôle / valeurs |
|---|---|
| `motsCles` | Mots-clés séparés par virgule, opérateur **ET** ; cherche dans intitulé, ROME, compétences, etc. |
| `commune` | Code **INSEE** (pas code postal), jusqu'à 5 valeurs ; `distance=0` pour la commune stricte |
| `distance` | Rayon en km autour de la commune (défaut 10 ; tolérance +30 % documentée) |
| `departement` | Jusqu'à 5 valeurs ; `inclureLimitrophes=true` possible |
| `region`, `paysContinent` | Cf. référentiels |
| `typeContrat` | Codes du référentiel `typesContrats` (CDI, CDD, MIS, SAI, DDI, DIN…) |
| `natureContrat` | Codes du référentiel `naturesContrats` — **OU logique avec `typeContrat`** (attention : combiner les deux élargit les résultats au lieu de les restreindre) |
| `publieeDepuis` | Offres publiées depuis X jours max (valeurs usuelles 1, 3, 7, 14, 31) |
| `minCreationDate` / `maxCreationDate` | Fenêtre de dates `yyyy-MM-dd'T'hh:mm:ss'Z'` — idéal pour l'ingestion incrémentale quotidienne |
| `range` | `p-d`, **150 résultats max par page**, `p` ≤ 3000 et `d` ≤ 3149 (fenêtre max 3 150 offres par recherche) |
| `sort` | `0` pertinence, `1` **date de création décroissante** (recommandé pour l'ingestion), `2` distance |
| `origineOffre` | `1` France Travail, `2` partenaire |
| `experience`, `experienceExigence`, `qualification`, `niveauFormation`, `salaireMin`+`periodeSalaire`, `dureeHebdo`, `codeROME` (jusqu'à 200), `appellation`, `secteurActivite`, `codeNAF`, `accesTravailleurHandicape`, `entreprisesAdaptees`, `employeursHandiEngages`… | Filtres secondaires |

### Filtrer l'ALTERNANCE — précisément

- **`natureContrat=E2,FS`** :
  - **`E2` = Contrat d'apprentissage**
  - **`FS` = Contrat de professionnalisation**
  - Confirmations croisées : le site officiel candidat.francetravail.fr utilise exactement
    `natureOffre=E2,FS` pour son filtre « Alternance », et le service public « La bonne
    alternance » (mission-apprentissage, adossé à France Travail) interroge cette même API
    avec `natureContrat: "E2,FS"`. Les libellés exacts font foi dans
    `GET /v2/referentiel/naturesContrats` (à vérifier au premier appel authentifié).
- **Ne pas** utiliser `typeContrat` en plus de `natureContrat` pour l'alternance : les deux
  filtres sont combinés en **OU**, on récupérerait des non-alternances.
- En retour, chaque offre porte un booléen **`alternance`** — à utiliser comme garde-fou de
  classification côté ingestion.

### Les STAGES — verdict clair : absents de cette API

**Les stages (conventions de stage) ne sont pas diffusés par l'API Offres d'emploi.**
L'API ne restitue que les offres d'emploi de francetravail.fr, c'est-à-dire des **contrats
de travail** ; aucun code « stage » n'existe dans les référentiels `typesContrats` /
`naturesContrats`, et aucun paramètre de recherche ne cible les stages. Chercher
`motsCles=stage` ne remonte que du bruit (offres d'emploi mentionnant le mot). Pour le volet
« stage » d'Alternup, prévoir une **autre source** (piste : API jobs/stages de
1jeune1solution / La bonne alternance côté mission-apprentissage — à instruire dans une
phase discovery dédiée).

## Format de réponse

`GET /v2/offres/search` → objet `ResultatRecherche` :

```jsonc
{
  "resultats": [ /* Offre[] */ ],
  "filtresPossibles": [ // agrégations par filtre (typeContrat, experience, qualification…)
    { "filtre": "typeContrat", "agregation": [ { "valeurPossible": "CDI", "nbResultats": 12 } ] }
  ]
}
```

Champs principaux d'une **Offre** (schéma OpenAPI officiel) :

| Champ | Type | Note |
|---|---|---|
| `id` | string | Identifiant de l'offre (clé de dédup / upsert) |
| `intitule`, `description` | string | Description complète — à republier **intégralement** (licence art. 5.3) |
| `dateCreation`, `dateActualisation` | string (ISO) | À conserver et afficher (licence art. 5.2) |
| `lieuTravail` | objet | `libelle`, `latitude`, `longitude`, `codePostal`, `commune` (code INSEE) |
| `romeCode`, `romeLibelle`, `appellationlibelle` | string | (minuscule au « l » d'`appellationlibelle`, tel quel dans le schéma) |
| `entreprise` | objet | `nom`, `description`, `logo` (URL), `url`, `entrepriseAdaptee` |
| `typeContrat` / `typeContratLibelle` | string | ex. CDD + « Contrat à durée déterminée - 12 Mois » |
| `natureContrat` | string | **libellé** de la nature (ex. « Contrat apprentissage ») |
| `alternance` | boolean | Vrai si offre d'alternance |
| `salaire` | objet | `libelle`, `commentaire`, `complement1/2`, `listeComplements` |
| `dureeTravailLibelle`, `dureeTravailLibelleConverti` | string | |
| `experienceExige` (`D`/`S`/`E`), `experienceLibelle` | string | |
| `formations`, `langues`, `permis`, `competences`, `qualitesProfessionnelles` | array | |
| `nombrePostes`, `accessibleTH`, `qualificationCode/Libelle`, `codeNAF`, `secteurActivite(Libelle)` | | |
| `contact` | objet | `nom`, `coordonnees1-3`, `telephone`, `courriel`, `urlRecruteur`, **`urlPostulation`** — données personnelles : RGPD (licence art. 8) |
| `origineOffre` | objet | `origine` (`1` FT, `2` partenaire), **`urlOrigine`** (lien vers l'offre d'origine → notre « lien vers l'offre d'origine »), `partenaires[]` (`nom`, `url`, `logo`) |

### Codes HTTP & pagination

- **200** : tous les résultats récupérés. **206** : résultats partiels, il en reste
  (pagination). **204** : aucune offre (`Content-Range: */0`). 400 : requête invalide.
- Header **`Content-Range`** : `offres p-d/t` (p = index du premier élément renvoyé,
  d = index du dernier, t = **total** de la recherche). Boucler tant que 206 en avançant
  `range`, sans dépasser `3149` ; si `t > 3150`, découper la recherche (par département,
  par fenêtre de dates…).

## Quotas

- **Rate limit par application** : la fiche technique de l'API sur francetravail.io indique
  `nombreAppelMax: 100` et l'interface l'affiche en « appels / seconde » →
  **jusqu'à 100 appels/s** pour l'API Offres d'emploi. ⚠️ **Ambiguïté** : la fiche
  data.gouv.fr officielle indique « **10 appels / seconde** » (et 99,8 % de disponibilité).
  Le quota réel applicable à *notre* application sera affiché dans « Mon espace » sur
  francetravail.io ; une augmentation peut être demandée (le support contacte le titulaire).
  Dimensionner l'ingestion pour ~10 req/s max par prudence.
- **429 Too Many Requests** en cas de dépassement, avec header **`Retry-After`** (secondes)
  et headers `X-Ratelimit-Burst-Capacity-Clientidlimiter` (appels max/s autorisés) et
  `X-Ratelimit-Remaining-Clientidlimiter` (appels restants sur la seconde) → à honorer dans
  le client Nitro (backoff exponentiel recommandé par la doc « Consommer une API de manière
  résiliente »).
- **Aucun quota journalier documenté** publiquement (la page API mentionne 40 M
  d'appels/mois toutes applications confondues en 2023, à titre indicatif).

## CGU & republication (section CRITIQUE)

Texte applicable : **« Licence de réutilisation de la base de données des offres d'emploi
de France Travail »** (page officielle « 3.1. Licence Offres d'emploi »). C'est une licence
**spécifique** (`licence_specifique` dans la fiche API) — PAS la licence Etalab (qui couvre
les autres API France Travail), et PAS l'« Open Licence 2.0 » affichée par défaut sur
data.gouv.fr. Acceptée à la création du compte ; sans contractualisation supplémentaire.
Clauses pertinentes pour Alternup :

- **Droits cédés (art. 1.1)** : cession gratuite, non exclusive, monde entier — droits
  d'extraction, reproduction, **représentation/diffusion auprès de tout public**,
  adaptation/intégration dans une « Création » (notre app). La republication dans un tableau
  interne est donc couverte. Réserve : « ne pas altérer le Contenu de la Base de données ou
  en dénaturer le sens ».
- **Attribution obligatoire (art. 4)** : toute mise à disposition doit mentionner, de façon
  aisément accessible : **la source (France Travail) et la date de dernière mise à jour** ;
  le fait que la réutilisation est soumise à la Licence, **avec un lien hypertexte** vers
  celle-ci. Si nous modifions la base (filtrage, normalisation), un **fichier décrivant les
  modifications ou la méthode** (ex. description de l'algorithme de filtrage) doit être mis
  à disposition des utilisateurs.
- **Gratuité (art. 5.1)** : interdiction de faire payer les personnes en recherche d'emploi
  pour l'accès aux offres, et interdiction de vendre des offres d'emploi (code du travail
  L. 5321-3, L. 5331-1). Notre tableau derrière auth doit rester gratuit pour les
  alternants/stagiaires.
- **Mise à jour / rétention (art. 5.2)** : conserver la **date de première publication /
  de mise à jour** de chaque offre ; **mise à jour constante du Contenu** avec obligation de
  solliciter l'API **au minimum une fois toutes les 24 heures** — le contenu créé, supprimé
  ou modifié dans la base FT doit être créé, supprimé ou modifié chez nous. → Les offres
  disparues de l'API doivent disparaître de notre tableau (ou au minimum ne plus être
  affichées).
- **Intégrité (art. 5.3)** : pour toute réutilisation « rapprochement offre/demande
  d'emploi » (notre cas), afficher sur chaque offre **la totalité du Contenu mis à
  disposition par l'API pour cette offre**, **logo compris**. Interdiction de tronquer les
  champs sur la page de détail de l'offre.
- **Pas de sous-licence / anti-scraping (art. 3)** : la Base n'est accessible que via
  francetravail.io ; interdiction de la mettre à disposition de tiers (sous-licence) ;
  obligation de prendre des mesures techniques/contractuelles pour que **nos utilisateurs ne
  puissent pas extraire/exploiter le Contenu en masse**.
- **Partage à l'identique (art. 6)** : une « base de données dérivée » redistribuée doit
  l'être sous la même Licence ; notre application (Création) n'a pas à être sous licence FT,
  mais la base intégrée si.
- **Offres supprimées (art. 7)** : si nous conservons du contenu **après sa suppression** de
  la base FT (historique, stats), obligation d'**anonymiser** : suppression du nom /
  description / URL de l'entreprise, contacts, téléphones, URL de l'offre chez l'entreprise,
  et même **code postal / code INSEE / libellé de commune**. → Pour un historique interne,
  prévoir une purge/anonymisation.
- **RGPD (art. 8)** : les offres contiennent des données personnelles (contact recruteur).
  Finalité compatible exigée (rapprochement offre/demande d'emploi — notre cas) ; usage
  commercial type constitution de fichier clients incompatible ; minimisation, durée de
  conservation limitée, **stockage dans l'UE** (ou équivalent).
- **Logos (art. 9)** : pour une finalité de rapprochement offre/demande, le logo fait partie
  du contenu à afficher (art. 5.3) ; pour toute autre finalité, l'exploitation des logos FT
  ou partenaires nécessite un accord exprès.
- **Résiliation (art. 10)** : suspension sans préavis en cas de manquement ; résiliation de
  plein droit si l'API n'est **pas sollicitée pendant 12 mois consécutifs**.
- **Audit (art. 13)**, **responsabilité limitée de FT (art. 11)** — aucune garantie
  d'exhaustivité/exactitude, **loi française, tribunaux parisiens (art. 14)**.
- **Évolution de la licence (art. 2)** : acceptation tacite d'une nouvelle version sous
  15 jours après notification.

**Lien vers l'offre d'origine** : la licence ne l'impose pas en tant que tel (elle impose
l'intégralité du contenu) ; le champ `origineOffre.urlOrigine` fournit l'URL cible — le
prévoir sur chaque ligne du tableau comme demandé, c'est cohérent avec l'esprit de la
licence et le fonctionnement de l'API (les candidatures se font sur francetravail.fr ou chez
le partenaire).

## API sœurs utiles

- **Référentiels intégrés à l'API Offres d'emploi elle-même** (mêmes scopes, même token) —
  pas besoin d'API séparée pour nos filtres :
  `GET /v2/referentiel/{communes | departements | regions | pays | continents | metiers |
  appellations | domaines | themes | naturesContrats | typesContrats | niveauxFormations |
  permis | langues | nafs | secteursActivites}`.
  À ingérer au démarrage : `communes` (codes INSEE), `departements`, `naturesContrats`
  (validation E2/FS), `typesContrats`.
- **ROME 4.0** (Métiers/Compétences/Contextes) : API distinctes sur francetravail.io, utiles
  seulement si on veut une taxonomie métiers riche ; non nécessaires pour le filtrage de
  base (le référentiel `metiers` de l'API Offres suffit).
- **La bonne alternance** (mission-apprentissage) : piste pour compléter l'alternance et
  couvrir les **stages** — hors périmètre de cette API, à instruire séparément.

## Sources (consultées le 29/08/2026)

Le portail francetravail.io est une SPA : le contenu des pages ci-dessous a été lu via l'API
de contenu de la plateforme elle-même (`https://francetravail.io/api-peio/v2/pages/page?slug=…`)
et via le fichier OpenAPI officiel servi par la plateforme
(`https://francetravail.io/api-peio/v2/api/84/openapi`) — mêmes données que celles affichées
par le site. URLs publiques correspondantes :

- Fiche API Offres d'emploi : <https://francetravail.io/produits-partages/catalogue/offres-emploi> (alias <https://francetravail.io/data/api/offres-emploi>)
- Licence Offres d'emploi (texte intégral) : <https://francetravail.io/produits-partages/documentation/conditions-dutilisation-api/licence-offres-emploi>
- Conditions d'utilisation des API : <https://francetravail.io/produits-partages/documentation/conditions-dutilisation-api>
- Client Credentials (token, scopes, exemple) : <https://francetravail.io/produits-partages/documentation/utilisation-api-france-travail/client-credentials>
- Requêter une API (base URL api.francetravail.io/partenaire) : <https://francetravail.io/produits-partages/documentation/utilisation-api-france-travail/requeter-api>
- Gérer mon compte et mes applications : <https://francetravail.io/produits-partages/documentation/gestion-compte-applications>
- Erreurs fréquentes (429, Retry-After, X-Ratelimit-*) : <https://francetravail.io/produits-partages/documentation/erreurs-frequentes>
- Consommer une API de manière résiliente : <https://francetravail.io/produits-partages/documentation/consommation-resiliente>
- Fiche data.gouv.fr (rate limit « 10 appels/s », dispo 99,8 %) : <https://www.data.gouv.fr/dataservices/api-offres-demploi>
- Confirmation codes E2/FS : filtre alternance du site officiel candidat
  (<https://candidat.francetravail.fr/offres/recherche?lieux=59D&natureOffre=E2%2CFS>) et
  client France Travail du dépôt public `mission-apprentissage/labonnealternance`
  (`server/src/common/apis/france-travail/france-travail.client.ts`).
- Vérification live de l'endpoint (401 sans token) :
  `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search`

### Informations introuvables ou ambiguës (à vérifier au premier appel authentifié)

- **Quota exact** : 100 appels/s (fiche francetravail.io) vs 10 appels/s (data.gouv.fr) — le
  chiffre faisant foi est celui affiché dans « Mon espace » pour notre application.
- **Durée de vie du token** : ~1499 s dans l'exemple officiel, non garantie contractuellement.
- **Libellés exacts des référentiels** `naturesContrats`/`typesContrats` : les codes E2/FS
  sont confirmés par recoupement officiel mais le référentiel `GET /v2/referentiel/naturesContrats`
  fait foi.
- Aucun quota **journalier** documenté.
