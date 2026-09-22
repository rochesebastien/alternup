-- NB : les `DROP INDEX offres_*_trgm_idx` proposés par le diff Prisma sont un
-- faux positif récurrent (index GIN non représentables dans schema.prisma, voir
-- 20260901223014_offres_ville_code_postal) : retirés, ne JAMAIS les réintroduire.

-- AlterTable
ALTER TABLE "offres" ADD COLUMN     "duree_mois" INTEGER;

-- Backfill : durée du contrat en mois (`contract.duration` LBA) des offres déjà
-- en base, lue dans le payload source conservé tel quel. Même règle que
-- `dureeMoisDe` (shared/utils/offres.ts) : entier strictement positif, sinon NULL.
UPDATE "offres"
SET "duree_mois" = ("raw"->'contract'->>'duration')::integer
WHERE jsonb_typeof("raw"->'contract'->'duration') = 'number'
  AND ("raw"->'contract'->>'duration') ~ '^[1-9][0-9]*$';
