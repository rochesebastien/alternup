-- CreateEnum
CREATE TYPE "OffreSourceType" AS ENUM ('la_bonne_alternance');

-- CreateEnum
CREATE TYPE "OffreContratType" AS ENUM ('apprentissage', 'professionnalisation');

-- CreateEnum
CREATE TYPE "OffreStatut" AS ENUM ('active', 'expiree');

-- CreateEnum
CREATE TYPE "CandidatureStatut" AS ENUM ('vue', 'candidate', 'rejetee');

-- CreateEnum
CREATE TYPE "ScrapeRunStatut" AS ENUM ('en_cours', 'succes', 'erreur');

-- CreateTable
CREATE TABLE "offres" (
    "id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "dedup_hash" TEXT NOT NULL,
    "source_origine" "OffreSourceType" NOT NULL,
    "titre" TEXT NOT NULL,
    "entreprise" TEXT,
    "lieu" TEXT,
    "type_contrat" "OffreContratType",
    "niveau_diplome" TEXT,
    "rome_codes" TEXT[],
    "date_publication" TIMESTAMPTZ,
    "date_expiration" TIMESTAMPTZ,
    "raw" JSONB NOT NULL,
    "statut" "OffreStatut" NOT NULL DEFAULT 'active',
    "first_seen" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offre_sources" (
    "offre_id" UUID NOT NULL,
    "source" "OffreSourceType" NOT NULL,
    "partner_label" TEXT,
    "partner_job_id" TEXT,
    "first_seen" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offre_sources_pkey" PRIMARY KEY ("offre_id","source")
);

-- CreateTable
CREATE TABLE "offre_user_statuts" (
    "user_id" UUID NOT NULL,
    "offre_id" UUID NOT NULL,
    "statut" "CandidatureStatut" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "offre_user_statuts_pkey" PRIMARY KEY ("user_id","offre_id")
);

-- CreateTable
CREATE TABLE "scrape_runs" (
    "id" UUID NOT NULL,
    "source" "OffreSourceType" NOT NULL,
    "statut" "ScrapeRunStatut" NOT NULL DEFAULT 'en_cours',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,
    "pages_vues" INTEGER NOT NULL DEFAULT 0,
    "offres_vues" INTEGER NOT NULL DEFAULT 0,
    "offres_creees" INTEGER NOT NULL DEFAULT 0,
    "offres_maj" INTEGER NOT NULL DEFAULT 0,
    "offres_expirees" INTEGER NOT NULL DEFAULT 0,
    "credits_estimes" INTEGER NOT NULL DEFAULT 0,
    "erreurs" JSONB,

    CONSTRAINT "scrape_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "offres_url_key" ON "offres"("url");

-- CreateIndex
CREATE UNIQUE INDEX "offres_dedup_hash_key" ON "offres"("dedup_hash");

-- CreateIndex
CREATE INDEX "offres_statut_date_publication_idx" ON "offres"("statut", "date_publication");

-- CreateIndex
CREATE INDEX "offres_type_contrat_idx" ON "offres"("type_contrat");

-- CreateIndex
CREATE INDEX "offres_first_seen_idx" ON "offres"("first_seen");

-- CreateIndex
CREATE INDEX "offre_sources_source_partner_label_partner_job_id_idx" ON "offre_sources"("source", "partner_label", "partner_job_id");

-- CreateIndex
CREATE INDEX "offre_user_statuts_user_id_statut_idx" ON "offre_user_statuts"("user_id", "statut");

-- CreateIndex
CREATE INDEX "scrape_runs_source_started_at_idx" ON "scrape_runs"("source", "started_at");

-- AddForeignKey
ALTER TABLE "offre_sources" ADD CONSTRAINT "offre_sources_offre_id_fkey" FOREIGN KEY ("offre_id") REFERENCES "offres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offre_user_statuts" ADD CONSTRAINT "offre_user_statuts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offre_user_statuts" ADD CONSTRAINT "offre_user_statuts_offre_id_fkey" FOREIGN KEY ("offre_id") REFERENCES "offres"("id") ON DELETE CASCADE ON UPDATE CASCADE;
