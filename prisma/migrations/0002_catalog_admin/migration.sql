ALTER TABLE "Product"
  ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "compareAt" DECIMAL(10, 2),
  ADD COLUMN "badge" TEXT,
  ADD COLUMN "rating" DECIMAL(2, 1) NOT NULL DEFAULT 5.0,
  ADD COLUMN "reviews" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "skuPrefix" TEXT NOT NULL DEFAULT '';

ALTER TABLE "ProductVariant"
  ADD COLUMN "colorCode" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "colorHex" TEXT NOT NULL DEFAULT '#191919',
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE "ProductVariant"
SET "colorCode" = upper(regexp_replace("sku", '^.*-([^-]+)-[^-]+$', '\1')),
    "colorHex" = CASE lower("color")
      WHEN 'oliva' THEN '#73765d'
      WHEN 'areia' THEN '#c7b89c'
      WHEN 'vinho' THEN '#70444b'
      WHEN 'cinza' THEN '#777777'
      WHEN 'azul' THEN '#445a70'
      ELSE '#191919'
    END;

UPDATE "Product" AS product
SET "skuPrefix" = COALESCE(
  (
    SELECT regexp_replace(variant."sku", '-[^-]+-[^-]+$', '')
    FROM "ProductVariant" AS variant
    WHERE variant."productId" = product."id"
    ORDER BY variant."createdAt"
    LIMIT 1
  ),
  upper(regexp_replace(product."slug", '[^a-zA-Z0-9]+', '-', 'g'))
);
