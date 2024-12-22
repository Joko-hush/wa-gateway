-- Log untuk memastikan file dieksekusi
DO $$
BEGIN
    RAISE NOTICE 'File init.sql sedang dieksekusi...';
END $$;

-- Cek apakah database whatsapp_gateway sudah ada
SELECT 'CREATE DATABASE whatsapp_gateway'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'whatsapp_gateway')\gexec

-- Pindah ke database whatsapp_gateway
\c whatsapp_gateway;

-- Buat tabel messages
CREATE TABLE "public"."messages" (
  "id" SERIAL PRIMARY KEY,
  "number" VARCHAR(20) NOT NULL,
  "message" TEXT,
  "type" VARCHAR(10) DEFAULT 'text',
  "status" VARCHAR(10) NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "retries" INT DEFAULT 0,
  "updated_at" TIMESTAMP
);