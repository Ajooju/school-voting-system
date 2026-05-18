-- Initial schema for the private personal invoicing app.
-- Generated from prisma/schema.prisma for PostgreSQL/Supabase deployments.

CREATE TYPE "DocumentType" AS ENUM ('invoice', 'quotation', 'receipt');
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'finalized', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled');
CREATE TYPE "QuotationStatus" AS ENUM ('draft', 'finalized', 'sent', 'accepted', 'rejected', 'expired', 'converted');
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'bank_transfer', 'card', 'cheque', 'other');
CREATE TYPE "TemplateType" AS ENUM ('invoice', 'quotation');
CREATE TYPE "TemplateSourceType" AS ENUM ('visual', 'docx_import', 'pdf_overlay');
CREATE TYPE "TemplateFieldType" AS ENUM ('text', 'number', 'date', 'money', 'image', 'boolean', 'multiline');
CREATE TYPE "TemplateFieldAlignment" AS ENUM ('left', 'center', 'right');

CREATE TABLE "Currency" (
  "code" VARCHAR(3) NOT NULL,
  "name" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "BusinessProfile" (
  "id" TEXT NOT NULL,
  "businessName" TEXT NOT NULL,
  "defaultCurrencyCode" VARCHAR(3) NOT NULL,
  "logoFileUrl" TEXT,
  "address" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "taxNumber" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "taxNumber" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentNumberSequence" (
  "id" TEXT NOT NULL,
  "documentType" "DocumentType" NOT NULL,
  "year" INTEGER NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentNumberSequence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "quotationId" TEXT,
  "businessProfileId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "invoiceNumber" TEXT,
  "invoicePdfUrl" TEXT,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
  "currencyCode" VARCHAR(3) NOT NULL,
  "issueDate" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3),
  "subtotalAmount" INTEGER NOT NULL DEFAULT 0,
  "taxAmount" INTEGER NOT NULL DEFAULT 0,
  "discountAmount" INTEGER NOT NULL DEFAULT 0,
  "totalAmount" INTEGER NOT NULL DEFAULT 0,
  "paidAmount" INTEGER NOT NULL DEFAULT 0,
  "balanceDue" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "terms" TEXT,
  "finalizedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvoiceLineItem" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(12,4) NOT NULL,
  "unitPriceAmount" INTEGER NOT NULL,
  "discountAmount" INTEGER NOT NULL DEFAULT 0,
  "taxRateBps" INTEGER NOT NULL DEFAULT 0,
  "taxAmount" INTEGER NOT NULL DEFAULT 0,
  "lineTotalAmount" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Quotation" (
  "id" TEXT NOT NULL,
  "businessProfileId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "quotationNumber" TEXT,
  "quotationPdfUrl" TEXT,
  "status" "QuotationStatus" NOT NULL DEFAULT 'draft',
  "currencyCode" VARCHAR(3) NOT NULL,
  "issueDate" TIMESTAMP(3) NOT NULL,
  "expiryDate" TIMESTAMP(3),
  "subtotalAmount" INTEGER NOT NULL DEFAULT 0,
  "taxAmount" INTEGER NOT NULL DEFAULT 0,
  "discountAmount" INTEGER NOT NULL DEFAULT 0,
  "totalAmount" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "terms" TEXT,
  "finalizedAt" TIMESTAMP(3),
  "convertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuotationLineItem" (
  "id" TEXT NOT NULL,
  "quotationId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(12,4) NOT NULL,
  "unitPriceAmount" INTEGER NOT NULL,
  "discountAmount" INTEGER NOT NULL DEFAULT 0,
  "taxRateBps" INTEGER NOT NULL DEFAULT 0,
  "taxAmount" INTEGER NOT NULL DEFAULT 0,
  "lineTotalAmount" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "QuotationLineItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvoicePayment" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "receiptNumber" TEXT,
  "paymentDate" TIMESTAMP(3) NOT NULL,
  "amount" INTEGER NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "referenceNumber" TEXT,
  "notes" TEXT,
  "receiptPdfUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "templateType" "TemplateType" NOT NULL,
  "sourceType" "TemplateSourceType" NOT NULL,
  "htmlContent" TEXT,
  "cssContent" TEXT,
  "editorJson" JSONB,
  "uploadedFileUrl" TEXT,
  "previewImageUrl" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TemplateField" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "fieldType" "TemplateFieldType" NOT NULL,
  "xPosition" DECIMAL(10,2),
  "yPosition" DECIMAL(10,2),
  "width" DECIMAL(10,2),
  "height" DECIMAL(10,2),
  "pageNumber" INTEGER,
  "fontSize" DECIMAL(5,2),
  "alignment" "TemplateFieldAlignment",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TemplateField_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentNumberSequence_documentType_year_key" ON "DocumentNumberSequence"("documentType", "year");
CREATE UNIQUE INDEX "Invoice_quotationId_key" ON "Invoice"("quotationId");
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE UNIQUE INDEX "Quotation_quotationNumber_key" ON "Quotation"("quotationNumber");
CREATE UNIQUE INDEX "InvoicePayment_receiptNumber_key" ON "InvoicePayment"("receiptNumber");
CREATE UNIQUE INDEX "TemplateField_templateId_fieldKey_key" ON "TemplateField"("templateId", "fieldKey");

CREATE INDEX "Currency_isEnabled_idx" ON "Currency"("isEnabled");
CREATE INDEX "BusinessProfile_businessName_idx" ON "BusinessProfile"("businessName");
CREATE INDEX "BusinessProfile_defaultCurrencyCode_idx" ON "BusinessProfile"("defaultCurrencyCode");
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
CREATE INDEX "Customer_email_idx" ON "Customer"("email");
CREATE INDEX "DocumentNumberSequence_year_idx" ON "DocumentNumberSequence"("year");
CREATE INDEX "Invoice_businessProfileId_idx" ON "Invoice"("businessProfileId");
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");
CREATE INDEX "Invoice_currencyCode_idx" ON "Invoice"("currencyCode");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_issueDate_idx" ON "Invoice"("issueDate");
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");
CREATE INDEX "Invoice_finalizedAt_idx" ON "Invoice"("finalizedAt");
CREATE INDEX "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");
CREATE INDEX "InvoiceLineItem_invoiceId_sortOrder_idx" ON "InvoiceLineItem"("invoiceId", "sortOrder");
CREATE INDEX "Quotation_businessProfileId_idx" ON "Quotation"("businessProfileId");
CREATE INDEX "Quotation_customerId_idx" ON "Quotation"("customerId");
CREATE INDEX "Quotation_currencyCode_idx" ON "Quotation"("currencyCode");
CREATE INDEX "Quotation_status_idx" ON "Quotation"("status");
CREATE INDEX "Quotation_issueDate_idx" ON "Quotation"("issueDate");
CREATE INDEX "Quotation_expiryDate_idx" ON "Quotation"("expiryDate");
CREATE INDEX "Quotation_finalizedAt_idx" ON "Quotation"("finalizedAt");
CREATE INDEX "Quotation_convertedAt_idx" ON "Quotation"("convertedAt");
CREATE INDEX "QuotationLineItem_quotationId_idx" ON "QuotationLineItem"("quotationId");
CREATE INDEX "QuotationLineItem_quotationId_sortOrder_idx" ON "QuotationLineItem"("quotationId", "sortOrder");
CREATE INDEX "InvoicePayment_invoiceId_idx" ON "InvoicePayment"("invoiceId");
CREATE INDEX "InvoicePayment_currencyCode_idx" ON "InvoicePayment"("currencyCode");
CREATE INDEX "InvoicePayment_paymentDate_idx" ON "InvoicePayment"("paymentDate");
CREATE INDEX "InvoicePayment_paymentMethod_idx" ON "InvoicePayment"("paymentMethod");
CREATE INDEX "DocumentTemplate_templateType_idx" ON "DocumentTemplate"("templateType");
CREATE INDEX "DocumentTemplate_sourceType_idx" ON "DocumentTemplate"("sourceType");
CREATE INDEX "DocumentTemplate_isDefault_idx" ON "DocumentTemplate"("isDefault");
CREATE INDEX "DocumentTemplate_templateType_isDefault_idx" ON "DocumentTemplate"("templateType", "isDefault");
CREATE INDEX "TemplateField_templateId_idx" ON "TemplateField"("templateId");
CREATE INDEX "TemplateField_fieldType_idx" ON "TemplateField"("fieldType");

ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_defaultCurrencyCode_fkey" FOREIGN KEY ("defaultCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuotationLineItem" ADD CONSTRAINT "QuotationLineItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TemplateField" ADD CONSTRAINT "TemplateField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
