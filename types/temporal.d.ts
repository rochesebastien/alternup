// Schedule-X v4 type ses dates avec le namespace global `Temporal`
// (`@schedule-x/calendar` déclare `temporal-polyfill` en peerDependency et lit
// l'implémentation sur `globalThis`). Cet import de type rend ces déclarations
// visibles au projet ; le chargement du polyfill lui-même reste côté client,
// dans `pages/calendar.vue`.
import 'temporal-polyfill/global'
