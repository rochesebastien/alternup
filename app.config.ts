export default defineAppConfig({
  ui: {
    colors: {
      primary: 'brand',
      neutral: 'neutral'
    },
    // Le viewport des toasts est `fixed` et ancré à droite (`right-4`) : comme la
    // nav, il échappe à la compensation que Reka applique au body pendant un
    // verrou de scroll et glisse de la largeur de la scrollbar dès qu'une modale
    // est ouverte. `scroll-lock-shift` (margin-right) et non `-pad` : la boîte est
    // détachée du bord, on la déplace entière au lieu de creuser son intérieur.
    // La classe est un no-op hors verrou. Voir assets/css/main.css.
    toaster: {
      slots: {
        viewport: 'scroll-lock-shift'
      }
    },
    button: {
      slots: {
        // Style minimaliste (ShadcnUI) : coins doux, poids medium.
        // La landing (pages/index.vue) force `rounded-full` en inline → pills préservés.
        base: 'rounded-md font-medium'
      },
      variants: {
        // Padding horizontal plus généreux pour matcher la respiration de la home
        size: {
          xs: { base: 'px-3' },
          sm: { base: 'px-4' },
          md: { base: 'px-5' },
          lg: { base: 'px-6' },
          xl: { base: 'px-7' }
        }
      },
      compoundVariants: [
        // Primary jaune → texte noir (pas inverted/blanc) pour la lisibilité
        {
          color: 'primary',
          variant: 'solid',
          class: 'text-black bg-[var(--ui-primary)] hover:bg-[color-mix(in_oklab,var(--ui-primary),black_10%)] focus-visible:outline-[var(--ui-primary)]'
        },
        // Outline neutre : fond elevated + bordure ui-border (matche le bouton "Comment ça marche ?")
        {
          color: 'neutral',
          variant: 'outline',
          class: 'bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] text-[var(--ui-text)] hover:bg-[var(--ui-bg-elevated)] hover:border-[var(--ui-border-accented)]'
        }
      ],
      defaultVariants: {
        size: 'md'
      }
    }
  }
})
