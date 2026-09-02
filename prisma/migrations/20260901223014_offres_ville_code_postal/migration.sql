-- NB : les trois `DROP INDEX offres_*_trgm_idx` générés par le diff Prisma ont
-- été retirés à la main. Ces index GIN (`gin_trgm_ops`, migration
-- 20260830114900_offres_trgm_indexes) ne sont pas représentables dans
-- `schema.prisma` (Prisma ne modélise pas les index d'opérateurs) : à chaque
-- `prisma migrate dev`, le diff les croit absents du schéma désiré et propose
-- de les supprimer. Faux positif — ils restent nécessaires aux filtres
-- `contains` de `GET /api/offres` et ne doivent JAMAIS être droppés ici.

-- AlterTable
ALTER TABLE "offres" ADD COLUMN     "code_postal" TEXT,
ADD COLUMN     "ville" TEXT;

-- CreateIndex
CREATE INDEX "offres_code_postal_idx" ON "offres"("code_postal");

-- Backfill : ville/code_postal des offres déjà en base à partir de `lieu`
-- (adresse texte LBA, ex. « 12 rue de la Roquette, 75011 Paris »). Toute
-- offre ingérée APRÈS cette migration passe par la fonction pure
-- `parseLieu` (shared/utils/offres.ts, source de vérité, testée dans
-- tests/shared/offres.test.ts) — ce backfill n'a besoin d'en être qu'une
-- approximation ponctuelle :
--   - `'(\d{5})\s+[^,]+'` / `'\d{5}\s+([^,]+)'` : code postal à 5 chiffres
--     suivi d'un espace puis de la ville jusqu'à la virgule ou la fin de la
--     chaîne. Contrairement à `parseLieu` (regex `(?<!\d)(\d{5})(?!\d)`,
--     lookaround non disponible dans le moteur regex de PostgreSQL), un
--     numéro de voirie à 5 chiffres suivi d'un espace serait ici pris pour un
--     code postal — cas rarissime en pratique (les adresses françaises ne
--     numérotent pas les voies à 5 chiffres) ;
--   - `initcap()` met en majuscule la première lettre de chaque mot délimité
--     par un caractère non alphanumérique : couvre les tirets et apostrophes
--     (« SAINT-DENIS » → « Saint-Denis », « L'ISLE-ADAM » → « L'Isle-Adam »)
--     mais, à la différence de `parseLieu`, capitalise aussi la lettre suivant
--     un chiffre (« paris 11e » → « Paris 11E » et non « Paris 11e ») —
--     écart mineur assumé pour ce backfill ponctuel.
UPDATE "offres"
SET
  "code_postal" = substring("lieu" from '(\d{5})\s+[^,]+'),
  "ville" = NULLIF(trim(both ' ' from initcap(substring("lieu" from '\d{5}\s+([^,]+)'))), '')
WHERE "lieu" ~ '\d{5}\s+[^,]+';
