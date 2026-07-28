-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('planifiee', 'realisee', 'annulee');

-- CreateTable
CREATE TABLE "report_periods" (
    "id" UUID NOT NULL,
    "tutor_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "closed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_periods_tutor_id_idx" ON "report_periods"("tutor_id");

-- CreateTable
CREATE TABLE "report_cards" (
    "id" UUID NOT NULL,
    "period_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "general_comment" TEXT,
    "snapshot" JSONB,
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "report_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "report_cards_period_id_student_id_key" ON "report_cards"("period_id", "student_id");

-- CreateIndex
CREATE INDEX "report_cards_student_id_idx" ON "report_cards"("student_id");

-- CreateTable
CREATE TABLE "tutor_visits" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "tutor_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMPTZ NOT NULL,
    "mode" TEXT,
    "location" TEXT,
    "status" "VisitStatus" NOT NULL DEFAULT 'planifiee',
    "summary" TEXT,
    "next_steps" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tutor_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tutor_visits_tutor_id_scheduled_at_idx" ON "tutor_visits"("tutor_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "tutor_visits_student_id_idx" ON "tutor_visits"("student_id");

-- AddForeignKey
ALTER TABLE "report_periods" ADD CONSTRAINT "report_periods_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "report_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_visits" ADD CONSTRAINT "tutor_visits_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_visits" ADD CONSTRAINT "tutor_visits_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
