import type { CalendarCategoryId } from '~/shared/utils/calendar-display'

/**
 * Classes de couleur par catégorie, importé en relatif (pas auto-importé par
 * Nuxt : ce fichier n'exporte pas de composant). Chaînes STATIQUES — Tailwind
 * scanne le code source pour générer le CSS, une classe construite
 * dynamiquement (ex. `bg-${couleur}-100`) ne serait jamais générée.
 */
export const CALENDAR_CATEGORY_LABEL: Record<CalendarCategoryId, string> = {
  session: 'Session de cours',
  visite: 'Visite',
  autre: 'Autre',
  presence: 'Pointage'
}

/** Bloc de la grille horaire et chip du mois : fond clair + texte foncé + bordure. */
export const eventBlockClasses: Record<CalendarCategoryId, string> = {
  session: 'bg-emerald-100 text-emerald-900 border-emerald-500 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-500',
  visite: 'bg-brand-100 text-brand-900 border-brand-500 dark:bg-brand-900/40 dark:text-brand-100 dark:border-brand-500',
  autre: 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text)] border-[var(--ui-border-accented)] dark:bg-[var(--ui-bg-elevated)] dark:text-[var(--ui-text)] dark:border-[var(--ui-border-accented)]',
  presence: 'bg-indigo-100 text-indigo-900 border-indigo-500 dark:bg-indigo-900/40 dark:text-indigo-100 dark:border-indigo-500'
}

/** Pastille / barre de couleur pleine (légende, barre gauche des blocs). */
export const calendarDotClasses: Record<CalendarCategoryId, string> = {
  session: 'bg-emerald-600',
  visite: 'bg-brand-500',
  autre: 'bg-[var(--ui-text-muted)]',
  presence: 'bg-indigo-500'
}
