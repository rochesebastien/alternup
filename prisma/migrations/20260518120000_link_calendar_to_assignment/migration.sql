-- AlterTable
ALTER TABLE "calendar_events" ADD COLUMN     "course_assignment_id" UUID;

-- CreateIndex
CREATE INDEX "calendar_events_course_assignment_id_idx" ON "calendar_events"("course_assignment_id");

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_course_assignment_id_fkey" FOREIGN KEY ("course_assignment_id") REFERENCES "course_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

