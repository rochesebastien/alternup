-- NB : les trois `DROP INDEX offres_*_trgm_idx` générés par le diff Prisma ont
-- été retirés à la main (faux positif récurrent, voir la migration
-- 20260901223014_offres_ville_code_postal) : ces index GIN restent nécessaires
-- aux filtres de `GET /api/offres` et ne doivent JAMAIS être droppés.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboarding_completed_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "onboarding_profiles" (
    "user_id" UUID NOT NULL,
    "situation" TEXT,
    "etablissement" TEXT,
    "formation" TEXT,
    "niveau_etudes" TEXT,
    "entreprise" TEXT,
    "date_debut_contrat" DATE,
    "date_fin_contrat" DATE,
    "rythme" TEXT,
    "fonction" TEXT,
    "organisation" TEXT,
    "effectif" TEXT,
    "poste" TEXT,
    "objectifs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "onboarding_profiles_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "onboarding_profiles" ADD CONSTRAINT "onboarding_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
