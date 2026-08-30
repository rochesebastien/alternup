-- Split des espaces par rôle (ADR-0001 §7) : migration de données sur
-- `notifications.link`. Les anciens chemins sont préfixés par l'espace du
-- destinataire (/tuteur ou /alternant). Réversible fonctionnellement : les
-- anciens chemins restent résolus par le middleware `legacy-redirect.global.ts`.

-- 1. Liens mono-rôle : cible fixe, indépendante du destinataire.
UPDATE "notifications"
SET "link" = '/tuteur' || "link"
WHERE "link" = '/alternants' OR "link" LIKE '/alternants/%'
   OR "link" = '/projects'   OR "link" LIKE '/projects/%';

UPDATE "notifications"
SET "link" = '/alternant' || "link"
WHERE "link" = '/courses'  OR "link" LIKE '/courses/%'
   OR "link" = '/missions' OR "link" LIKE '/missions/%';

-- 2. Liens ex-mixtes : l'espace dépend du rôle du destinataire de la
--    notification (jointure sur users.role).
UPDATE "notifications" AS n
SET "link" = CASE WHEN u."role" = 'Tutor' THEN '/tuteur' ELSE '/alternant' END || n."link"
FROM "users" AS u
WHERE u."id" = n."user_id"
  AND (
    n."link" IN (
      '/dashboard', '/calendar', '/presences', '/annonces', '/messages',
      '/rapports', '/bulletins', '/competences', '/visites'
    )
    OR n."link" LIKE '/messages/%'
    OR n."link" LIKE '/rapports/%'
    OR n."link" LIKE '/bulletins/%'
    OR n."link" LIKE '/calendar?%'
    OR n."link" LIKE '/competences?%'
  );
