-- NB : les trois `DROP INDEX offres_*_trgm_idx` générés par le diff Prisma ont
-- été retirés à la main (faux positif récurrent, voir la migration
-- 20260901223014_offres_ville_code_postal). Ne JAMAIS les réintroduire.

-- AlterTable
ALTER TABLE "calendar_events" ADD COLUMN     "invitation_id" UUID;

-- AlterTable
ALTER TABLE "onboarding_profiles" ADD COLUMN     "rythme_semaines_ecole" INTEGER,
ADD COLUMN     "rythme_semaines_entreprise" INTEGER;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex : événements en attente d'une invitation (rattachement à l'acceptation).
CREATE INDEX "calendar_events_invitation_id_idx" ON "calendar_events"("invitation_id");
