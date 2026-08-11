/*
  Warnings:

  - You are about to drop the column `note` on the `presence_entries` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PresenceKind" AS ENUM ('entreprise_sur_site', 'entreprise_teletravail', 'entreprise_conges', 'ecole_formation');

-- CreateEnum
CREATE TYPE "PresenceRevisionAction" AS ENUM ('created', 'updated');

-- AlterTable
ALTER TABLE "presence_entries" DROP COLUMN "note",
ADD COLUMN     "kind" "PresenceKind" NOT NULL DEFAULT 'entreprise_sur_site';

-- CreateTable
CREATE TABLE "presence_entry_revisions" (
    "id" UUID NOT NULL,
    "entry_id" UUID NOT NULL,
    "action" "PresenceRevisionAction" NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "kind" "PresenceKind" NOT NULL,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presence_entry_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "presence_entry_revisions_entry_id_changed_at_idx" ON "presence_entry_revisions"("entry_id", "changed_at");

-- AddForeignKey
ALTER TABLE "presence_entry_revisions" ADD CONSTRAINT "presence_entry_revisions_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "presence_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presence_entry_revisions" ADD CONSTRAINT "presence_entry_revisions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
