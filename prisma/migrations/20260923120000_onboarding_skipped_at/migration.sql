-- NB : les `DROP INDEX offres_*_trgm_idx` proposés par le diff Prisma sont un
-- faux positif récurrent (voir 20260901223014_offres_ville_code_postal) :
-- retirés, ne JAMAIS les réintroduire.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboarding_skipped_at" TIMESTAMPTZ;

-- Jusqu'ici, « Compléter plus tard » remplissait `onboarding_completed_at` sans
-- créer de réponses. Ces comptes n'ont donc jamais répondu : ils passent à
-- l'état « passé » (onboarding à terminer), la date est conservée.
UPDATE "users" u
SET "onboarding_skipped_at" = u."onboarding_completed_at",
    "onboarding_completed_at" = NULL
WHERE u."onboarding_completed_at" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "onboarding_profiles" p WHERE p."user_id" = u."id");
