-- CreateEnum
CREATE TYPE "SignatureDocumentType" AS ENUM ('bulletin', 'rapport');

-- CreateTable
CREATE TABLE "document_signatures" (
    "id" UUID NOT NULL,
    "document_type" "SignatureDocumentType" NOT NULL,
    "document_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "signed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_signatures_document_type_document_id_idx" ON "document_signatures"("document_type", "document_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_signatures_document_type_document_id_user_id_key" ON "document_signatures"("document_type", "document_id", "user_id");

-- AddForeignKey
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
