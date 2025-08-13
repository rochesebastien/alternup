-- Migration: Add notes and calendar tables (course_notes, calendar_events)
-- Created: 2025-08-05
-- Description: Create tables for course notes and calendar events

-- Step 1: Create course_notes table
CREATE TABLE public.course_notes (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id    uuid        NOT NULL REFERENCES public.course_assignments(id) ON DELETE CASCADE,
  session_date     date        NOT NULL,
  grade            numeric(5,2),
  comment          text,
  notions_covered  jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Step 2: Create calendar_events table
CREATE TABLE public.calendar_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tutor_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  start_time   timestamptz NOT NULL,
  end_time     timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Step 3: Add indexes for performance
CREATE INDEX idx_course_notes_assignment ON public.course_notes(assignment_id);
CREATE INDEX idx_calendar_events_student ON public.calendar_events(student_id, start_time);

-- Step 4: Add comments for documentation
COMMENT ON TABLE public.course_notes IS 'Notes et retours sur chaque seance de cours';
COMMENT ON COLUMN public.course_notes.assignment_id IS 'ID de l''affectation de cours concernee';
COMMENT ON COLUMN public.course_notes.session_date IS 'Date de la seance de cours';
COMMENT ON COLUMN public.course_notes.grade IS 'Note attribuee (sur 20, avec 2 decimales)';
COMMENT ON COLUMN public.course_notes.comment IS 'Commentaire sur la seance';
COMMENT ON COLUMN public.course_notes.notions_covered IS 'Structure JSON des notions abordees lors de la seance';

COMMENT ON TABLE public.calendar_events IS 'Evenements de calendrier (periodes de cours)';
COMMENT ON COLUMN public.calendar_events.student_id IS 'ID de l''etudiant concerne par l''evenement';
COMMENT ON COLUMN public.calendar_events.tutor_id IS 'ID du tuteur responsable de l''evenement';
COMMENT ON COLUMN public.calendar_events.title IS 'Titre de l''evenement';
COMMENT ON COLUMN public.calendar_events.start_time IS 'Date et heure de debut de l''evenement';
COMMENT ON COLUMN public.calendar_events.end_time IS 'Date et heure de fin de l''evenement';

-- Step 5: Enable RLS on new tables
ALTER TABLE public.course_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for course_notes
CREATE POLICY "Students can view notes for their course assignments" ON public.course_notes
    FOR SELECT USING (
        assignment_id IN (
            SELECT id FROM public.course_assignments WHERE student_id = auth.uid()
        )
    );

CREATE POLICY "Tutors can view notes for their students' assignments" ON public.course_notes
    FOR SELECT USING (
        assignment_id IN (
            SELECT ca.id 
            FROM public.course_assignments ca
            JOIN public.tutor_students ts ON ca.student_id = ts.student_id
            WHERE ts.tutor_id = auth.uid()
        )
    );

CREATE POLICY "Tutors can create notes for their students' assignments" ON public.course_notes
    FOR INSERT WITH CHECK (
        assignment_id IN (
            SELECT ca.id 
            FROM public.course_assignments ca
            JOIN public.tutor_students ts ON ca.student_id = ts.student_id
            WHERE ts.tutor_id = auth.uid()
        )
    );

-- Step 7: Create RLS policies for calendar_events
CREATE POLICY "Students can view their calendar events" ON public.calendar_events
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Tutors can view events they created" ON public.calendar_events
    FOR SELECT USING (auth.uid() = tutor_id);

CREATE POLICY "Tutors can create calendar events for their students" ON public.calendar_events
    FOR INSERT WITH CHECK (
        auth.uid() = tutor_id AND
        student_id IN (
            SELECT student_id FROM public.tutor_students WHERE tutor_id = auth.uid()
        )
    );