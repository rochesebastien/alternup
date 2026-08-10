-- Un événement de calendrier peut désormais exister sans alternant/stagiaire,
-- et porter un indicateur « présence obligatoire ».
ALTER TABLE "calendar_events" ALTER COLUMN "student_id" DROP NOT NULL;
ALTER TABLE "calendar_events" ADD COLUMN "presence_required" BOOLEAN NOT NULL DEFAULT false;
