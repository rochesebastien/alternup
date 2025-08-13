-- Migration: Add assignment tables (course_assignments, projects, project_assignments)
-- Created: 2025-08-05
-- Description: Create tables for course and project assignments

-- Step 1: Create course_assignments table
CREATE TABLE public.course_assignments (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id     uuid        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  start_date    date        NOT NULL,
  end_date      date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id, start_date)
);

-- Step 2: Create projects table
CREATE TABLE public.projects (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  description  text,
  internal     boolean     NOT NULL DEFAULT true,
  created_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Step 3: Create project_assignments table
CREATE TABLE public.project_assignments (
  id             uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid               NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  student_id     uuid               NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status         project_status_enum NOT NULL DEFAULT 'non_demarre',
  tutor_comment  text,
  student_comment text,
  started_at     timestamptz,
  updated_at     timestamptz       NOT NULL DEFAULT now(),
  UNIQUE (project_id, student_id)
);

-- Step 4: Add indexes for performance
CREATE INDEX idx_course_assignments_student ON public.course_assignments(student_id);
CREATE INDEX idx_proj_assign_student ON public.project_assignments(student_id);

-- Step 5: Add comments for documentation
COMMENT ON TABLE public.course_assignments IS 'Affectation d''un cours a un alternant/stagiaire';
COMMENT ON COLUMN public.course_assignments.student_id IS 'ID de l''etudiant assigne au cours';
COMMENT ON COLUMN public.course_assignments.course_id IS 'ID du cours assigne';
COMMENT ON COLUMN public.course_assignments.start_date IS 'Date de debut du cours pour cet etudiant';
COMMENT ON COLUMN public.course_assignments.end_date IS 'Date de fin du cours (optionnelle)';

COMMENT ON TABLE public.projects IS 'Projets/missions disponibles';
COMMENT ON COLUMN public.projects.title IS 'Titre du projet/mission';
COMMENT ON COLUMN public.projects.description IS 'Description detaillee du projet';
COMMENT ON COLUMN public.projects.internal IS 'Indique si le projet est interne (true) ou externe (false)';
COMMENT ON COLUMN public.projects.created_by IS 'ID du tuteur qui a cree le projet';

COMMENT ON TABLE public.project_assignments IS 'Assignation d''un projet a un alternant/stagiaire';
COMMENT ON COLUMN public.project_assignments.project_id IS 'ID du projet assigne';
COMMENT ON COLUMN public.project_assignments.student_id IS 'ID de l''etudiant assigne au projet';
COMMENT ON COLUMN public.project_assignments.status IS 'Statut actuel du projet pour cet etudiant';
COMMENT ON COLUMN public.project_assignments.tutor_comment IS 'Commentaire du tuteur sur le projet';
COMMENT ON COLUMN public.project_assignments.student_comment IS 'Commentaire de l''etudiant sur le projet';
COMMENT ON COLUMN public.project_assignments.started_at IS 'Date de debut effectif du projet';

-- Step 6: Enable RLS on new tables
ALTER TABLE public.course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for course_assignments
CREATE POLICY "Students can view their course assignments" ON public.course_assignments
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Tutors can view their students' course assignments" ON public.course_assignments
    FOR SELECT USING (
        auth.uid() IN (
            SELECT tutor_id FROM public.tutor_students WHERE student_id = course_assignments.student_id
        )
    );

-- Step 8: Create RLS policies for projects
CREATE POLICY "All authenticated users can view projects" ON public.projects
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only tutors can create projects" ON public.projects
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'Tutor'
        )
    );

-- Step 9: Create RLS policies for project_assignments
CREATE POLICY "Students can view their project assignments" ON public.project_assignments
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Tutors can view their students' project assignments" ON public.project_assignments
    FOR SELECT USING (
        auth.uid() IN (
            SELECT tutor_id FROM public.tutor_students WHERE student_id = project_assignments.student_id
        )
    );