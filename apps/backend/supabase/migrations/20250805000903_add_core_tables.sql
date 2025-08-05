-- Migration: Add core tables (tutor_students, courses)
-- Created: 2025-08-05
-- Description: Create core relationship and course tables

-- Step 1: Create tutor_students relationship table
CREATE TABLE public.tutor_students (
  tutor_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tutor_id, student_id)
);

-- Step 2: Create courses table
CREATE TABLE public.courses (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text,
  created_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Step 3: Add comments for documentation
COMMENT ON TABLE public.tutor_students IS 'Relation many-to-many entre tuteurs et etudiants (alternants/stagiaires)';
COMMENT ON COLUMN public.tutor_students.tutor_id IS 'ID du tuteur (profil avec role Tutor)';
COMMENT ON COLUMN public.tutor_students.student_id IS 'ID de l''etudiant (profil avec role Alternant ou Stagiaire)';
COMMENT ON COLUMN public.tutor_students.added_at IS 'Date d''ajout de la relation tuteur-etudiant';

COMMENT ON TABLE public.courses IS 'Cours disponibles dans l''application';
COMMENT ON COLUMN public.courses.id IS 'Identifiant unique du cours';
COMMENT ON COLUMN public.courses.title IS 'Titre du cours';
COMMENT ON COLUMN public.courses.description IS 'Description detaillee du cours';
COMMENT ON COLUMN public.courses.created_by IS 'ID du profil qui a cree le cours';
COMMENT ON COLUMN public.courses.created_at IS 'Date de creation du cours';

-- Step 4: Enable RLS on new tables
ALTER TABLE public.tutor_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for tutor_students
CREATE POLICY "Tutors can view their students" ON public.tutor_students
    FOR SELECT USING (auth.uid() = tutor_id);

CREATE POLICY "Students can view their tutors" ON public.tutor_students
    FOR SELECT USING (auth.uid() = student_id);

-- Step 6: Create RLS policies for courses
CREATE POLICY "All authenticated users can view courses" ON public.courses
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only tutors can create courses" ON public.courses
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'Tutor'
        )
    );

CREATE POLICY "Course creators can update their courses" ON public.courses
    FOR UPDATE USING (auth.uid() = created_by);