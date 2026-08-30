-- Index trigramme pour les filtres `contains` insensibles de GET /api/offres
-- (q sur titre+entreprise, lieu — ADR-0004) : sans eux, chaque ILIKE '%…%'
-- est un seq scan sur un stock national de plusieurs centaines de milliers
-- d'offres. pg_trgm est une extension "trusted" (PostgreSQL ≥ 13) : le CREATE
-- EXTENSION ne demande pas de superuser, seulement CREATE sur la base.
-- Prisma ne modélise pas les index d'opérateurs (gin_trgm_ops) : migration SQL
-- manuelle, comme le permet `prisma migrate dev --create-only`.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "offres_titre_trgm_idx" ON "offres" USING GIN ("titre" gin_trgm_ops);
CREATE INDEX "offres_entreprise_trgm_idx" ON "offres" USING GIN ("entreprise" gin_trgm_ops);
CREATE INDEX "offres_lieu_trgm_idx" ON "offres" USING GIN ("lieu" gin_trgm_ops);
