import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { chromium } from "playwright";
import { formatMinorUnitsByCurrency } from "@/lib/money/money";
import { defaultTemplateCss } from "@/lib/templates/placeholders";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type BusinessDetails = {
  businessName: string;
  logoFileUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxNumber: string | null;
};

type CustomerDetails = {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxNumber: string | null;
};

type PdfLineItem = {
  description: string;
  quantity: { toString(): string };
  unitPriceAmount: number;
  discountAmount: number;
  taxRateBps: number;
  taxAmount: number;
  lineTotalAmount: number;
};

type DocumentPdfTemplate = {
  sourceType?: string;
  htmlContent: string | null;
  cssContent: string | null;
  uploadedFileUrl?: string | null;
  fields?: Array<{
    fieldKey: string;
    label: string;
    fieldType: string;
    xPosition: { toString(): string } | number | null;
    yPosition: { toString(): string } | number | null;
    width: { toString(): string } | number | null;
    height: { toString(): string } | number | null;
    pageNumber: number | null;
    fontSize: { toString(): string } | number | null;
  }>;
} | null;

type InvoicePdfInput = {
  invoiceNumber: string;
  currencyCode: string;
  issueDate: Date;
  dueDate: Date | null;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  notes: string | null;
  terms: string | null;
  businessProfile: BusinessDetails;
  customer: CustomerDetails;
  lineItems: PdfLineItem[];
  payments: Array<{
    paymentDate: Date;
    amount: number;
    paymentMethod: string;
    referenceNumber: string | null;
    receiptNumber: string | null;
  }>;
  template?: DocumentPdfTemplate;
};

type QuotationPdfInput = {
  quotationNumber: string;
  currencyCode: string;
  issueDate: Date;
  expiryDate: Date | null;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  terms: string | null;
  businessProfile: BusinessDetails;
  customer: CustomerDetails;
  lineItems: PdfLineItem[];
  template?: DocumentPdfTemplate;
};

export async function createInvoicePdfBytes(input: InvoicePdfInput) {
  if (isPdfOverlayTemplate(input.template)) {
    return createPdfOverlayBytes(input.template, createInvoiceOverlayValues(input));
  }

  return renderHtmlToPdf(await createInvoiceHtml(input));
}

export async function createQuotationPdfBytes(input: QuotationPdfInput) {
  if (isPdfOverlayTemplate(input.template)) {
    return createPdfOverlayBytes(input.template, createQuotationOverlayValues(input));
  }

  return renderHtmlToPdf(await createQuotationHtml(input));
}

function isPdfOverlayTemplate(template: DocumentPdfTemplate): template is NonNullable<DocumentPdfTemplate> {
  return template?.sourceType === "PDF_OVERLAY" && Boolean(template.uploadedFileUrl);
}

async function createPdfOverlayBytes(template: NonNullable<DocumentPdfTemplate>, values: Record<string, string>) {
  if (!template.uploadedFileUrl) {
    throw new Error("PDF overlay template is missing the uploaded PDF.");
  }

  const pdfFile = await downloadStorageObject(template.uploadedFileUrl, "templates");

  if (!pdfFile) {
    throw new Error("PDF overlay template file could not be loaded.");
  }

  const pdfDoc = await PDFDocument.load(pdfFile.bytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const logoBytes = await downloadLogoBytesForPdf(values["business.logo"]);
  const logoImage = logoBytes
    ? logoBytes.contentType.includes("png")
      ? await pdfDoc.embedPng(logoBytes.bytes)
      : await pdfDoc.embedJpg(logoBytes.bytes)
    : null;

  for (const field of template.fields ?? []) {
    const page = pdfDoc.getPages()[(field.pageNumber ?? 1) - 1] ?? pdfDoc.getPage(0);
    const x = toNumber(field.xPosition, 0);
    const yFromTop = toNumber(field.yPosition, 0);
    const width = toNumber(field.width, 160);
    const height = toNumber(field.height, 18);
    const fontSize = toNumber(field.fontSize, 10);
    const y = page.getHeight() - yFromTop - height;

    if (field.fieldKey === "business.logo" && logoImage) {
      const scaled = logoImage.scaleToFit(width, height);
      page.drawImage(logoImage, {
        x,
        y,
        width: scaled.width,
        height: scaled.height,
      });
      continue;
    }

    const value = values[field.fieldKey] ?? "";

    if (!value) {
      continue;
    }

    drawWrappedText(page, value, {
      font,
      fontSize,
      height,
      width,
      x,
      y,
    });
  }

  return pdfDoc.save();
}

type DrawTextOptions = {
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  fontSize: number;
  height: number;
  width: number;
  x: number;
  y: number;
};

function drawWrappedText(page: ReturnType<PDFDocument["getPage"]>, value: string, options: DrawTextOptions) {
  const lineHeight = options.fontSize * 1.2;
  const maxLines = Math.max(1, Math.floor(options.height / lineHeight));
  const lines = wrapText(value, Math.max(8, Math.floor(options.width / (options.fontSize * 0.55)))).slice(0, maxLines);

  lines.forEach((line, index) => {
    page.drawText(line, {
      x: options.x,
      y: options.y + options.height - options.fontSize - index * lineHeight,
      size: options.fontSize,
      font: options.font,
      color: rgb(0.06, 0.09, 0.16),
      maxWidth: options.width,
    });
  });
}

function wrapText(value: string, maxCharacters: number) {
  return value.split("\n").flatMap((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;

      if (nextLine.length > maxCharacters && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = nextLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [""];
  });
}

function createInvoiceOverlayValues(input: InvoicePdfInput) {
  return {
    "business.logo": input.businessProfile.logoFileUrl ?? "",
    "business.name": input.businessProfile.businessName,
    "customer.name": input.customer.name,
    "document.number": input.invoiceNumber,
    "document.issue_date": formatDate(input.issueDate),
    "document.due_or_expiry_date": input.dueDate ? formatDate(input.dueDate) : "—",
    "document.total": formatMoney(input.totalAmount, input.currencyCode),
    "document.balance_due": formatMoney(input.balanceDue, input.currencyCode),
    line_items_table: formatLineItemsForOverlay(input.lineItems, input.currencyCode),
  };
}

function createQuotationOverlayValues(input: QuotationPdfInput) {
  return {
    "business.logo": input.businessProfile.logoFileUrl ?? "",
    "business.name": input.businessProfile.businessName,
    "customer.name": input.customer.name,
    "document.number": input.quotationNumber,
    "document.issue_date": formatDate(input.issueDate),
    "document.due_or_expiry_date": input.expiryDate ? formatDate(input.expiryDate) : "—",
    "document.total": formatMoney(input.totalAmount, input.currencyCode),
    "document.balance_due": "",
    line_items_table: formatLineItemsForOverlay(input.lineItems, input.currencyCode),
  };
}

function formatLineItemsForOverlay(lineItems: PdfLineItem[], currencyCode: string) {
  return lineItems
    .map((lineItem) => `${lineItem.description}  ${lineItem.quantity.toString()} × ${formatMoney(lineItem.unitPriceAmount, currencyCode)}  ${formatMoney(lineItem.lineTotalAmount, currencyCode)}`)
    .join("\n");
}

async function downloadLogoBytesForPdf(logoFileUrl: string) {
  if (!logoFileUrl) {
    return null;
  }

  const logo = logoFileUrl.startsWith("data:")
    ? null
    : logoFileUrl.startsWith("http://") || logoFileUrl.startsWith("https://")
      ? await fetchRemoteObject(logoFileUrl)
      : await downloadStorageObject(logoFileUrl, "businessLogos");

  if (!logo || (!logo.contentType.includes("png") && !logo.contentType.includes("jpeg") && !logo.contentType.includes("jpg"))) {
    return null;
  }

  return logo;
}

function toNumber(value: { toString(): string } | number | null | undefined, fallback: number) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const numberValue = typeof value === "number" ? value : Number(value.toString());

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

async function renderHtmlToPdf(html: string) {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setContent(html, { waitUntil: "networkidle" });

    return page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "16mm",
        right: "14mm",
        bottom: "16mm",
        left: "14mm",
      },
    });
  } finally {
    await browser.close();
  }
}

async function createInvoiceHtml(input: InvoicePdfInput) {
  const logoDataUri = await getLogoDataUri(input.businessProfile.logoFileUrl);

  if (input.template?.sourceType !== "PDF_OVERLAY" && input.template?.htmlContent) {
    return createVisualTemplateHtml({
      title: `Invoice ${input.invoiceNumber}`,
      htmlContent: input.template.htmlContent,
      cssContent: input.template.cssContent,
      values: createInvoicePlaceholderValues(input, logoDataUri),
    });
  }
  const paymentRows = input.payments
    .map((payment) => `
      <tr>
        <td>${escapeHtml(formatDate(payment.paymentDate))}</td>
        <td>${escapeHtml(formatPaymentMethod(payment.paymentMethod))}</td>
        <td>${escapeHtml(payment.referenceNumber ?? "—")}</td>
        <td>${escapeHtml(payment.receiptNumber ?? "—")}</td>
        <td class="amount">${escapeHtml(formatMoney(payment.amount, input.currencyCode))}</td>
      </tr>
    `)
    .join("");

  return createDocumentHtml({
    title: "Invoice",
    numberLabel: "Invoice number",
    number: input.invoiceNumber,
    business: input.businessProfile,
    customer: input.customer,
    logoDataUri,
    dateRows: [
      ["Issue date", formatDate(input.issueDate)],
      ["Due date", input.dueDate ? formatDate(input.dueDate) : "—"],
    ],
    lineItems: input.lineItems,
    currencyCode: input.currencyCode,
    totals: [
      ["Subtotal", input.subtotalAmount, false],
      ["Discount", input.discountAmount, false],
      ["Tax", input.taxAmount, false],
      ["Total", input.totalAmount, true],
      ["Paid amount", input.paidAmount, false],
      ["Balance due", input.balanceDue, true],
    ],
    notes: input.notes,
    terms: input.terms,
    extraSection: input.payments.length > 0
      ? `
        <section class="section">
          <h2>Payment history</h2>
          <table>
            <thead>
              <tr>
                <th>Payment date</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Receipt</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>${paymentRows}</tbody>
          </table>
        </section>
      `
      : "",
  });
}

async function createQuotationHtml(input: QuotationPdfInput) {
  const logoDataUri = await getLogoDataUri(input.businessProfile.logoFileUrl);

  if (input.template?.sourceType !== "PDF_OVERLAY" && input.template?.htmlContent) {
    return createVisualTemplateHtml({
      title: `Quotation ${input.quotationNumber}`,
      htmlContent: input.template.htmlContent,
      cssContent: input.template.cssContent,
      values: createQuotationPlaceholderValues(input, logoDataUri),
    });
  }

  return createDocumentHtml({
    title: "Quotation",
    numberLabel: "Quotation number",
    number: input.quotationNumber,
    business: input.businessProfile,
    customer: input.customer,
    logoDataUri,
    dateRows: [
      ["Issue date", formatDate(input.issueDate)],
      ["Expiry date", input.expiryDate ? formatDate(input.expiryDate) : "—"],
    ],
    lineItems: input.lineItems,
    currencyCode: input.currencyCode,
    totals: [
      ["Subtotal", input.subtotalAmount, false],
      ["Discount", input.discountAmount, false],
      ["Tax", input.taxAmount, false],
      ["Total", input.totalAmount, true],
    ],
    notes: input.notes,
    terms: input.terms,
    extraSection: "",
  });
}

type VisualTemplateHtmlInput = {
  title: string;
  htmlContent: string;
  cssContent: string | null;
  values: Record<string, string>;
};

function createVisualTemplateHtml({ title, htmlContent, cssContent, values }: VisualTemplateHtmlInput) {
  const safeHtml = replaceTemplatePlaceholders(sanitizeTemplateHtml(htmlContent), values);
  const safeCss = sanitizeTemplateCss(cssContent ?? defaultTemplateCss);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${safeCss}</style>
</head>
<body>${safeHtml}</body>
</html>`;
}

function createInvoicePlaceholderValues(input: InvoicePdfInput, logoDataUri: string | null) {
  return {
    ...createSharedPlaceholderValues({
      business: input.businessProfile,
      customer: input.customer,
      currencyCode: input.currencyCode,
      dueOrExpiryDate: input.dueDate ? formatDate(input.dueDate) : "—",
      issueDate: formatDate(input.issueDate),
      lineItems: input.lineItems,
      logoDataUri,
      notes: input.notes,
      number: input.invoiceNumber,
      subtotalAmount: input.subtotalAmount,
      discountAmount: input.discountAmount,
      taxAmount: input.taxAmount,
      totalAmount: input.totalAmount,
      terms: input.terms,
    }),
    "document.paymentHistory": renderPaymentHistoryTable(input.payments, input.currencyCode),
    "document.balanceDue": escapeHtml(formatMoney(input.balanceDue, input.currencyCode)),
  };
}

function createQuotationPlaceholderValues(input: QuotationPdfInput, logoDataUri: string | null) {
  return {
    ...createSharedPlaceholderValues({
      business: input.businessProfile,
      customer: input.customer,
      currencyCode: input.currencyCode,
      dueOrExpiryDate: input.expiryDate ? formatDate(input.expiryDate) : "—",
      issueDate: formatDate(input.issueDate),
      lineItems: input.lineItems,
      logoDataUri,
      notes: input.notes,
      number: input.quotationNumber,
      subtotalAmount: input.subtotalAmount,
      discountAmount: input.discountAmount,
      taxAmount: input.taxAmount,
      totalAmount: input.totalAmount,
      terms: input.terms,
    }),
    "document.paymentHistory": "",
    "document.balanceDue": "",
  };
}

type SharedPlaceholderInput = {
  business: BusinessDetails;
  customer: CustomerDetails;
  currencyCode: string;
  dueOrExpiryDate: string;
  issueDate: string;
  lineItems: PdfLineItem[];
  logoDataUri: string | null;
  notes: string | null;
  number: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  terms: string | null;
};

function createSharedPlaceholderValues(input: SharedPlaceholderInput) {
  return {
    "business.logo": escapeAttribute(input.logoDataUri ?? ""),
    "business.name": escapeHtml(input.business.businessName),
    "business.address": escapeHtml(formatContactDetails([
      input.business.address,
      input.business.phone,
      input.business.email,
      input.business.taxNumber ? `Tax no: ${input.business.taxNumber}` : null,
    ])),
    "customer.name": escapeHtml(input.customer.name),
    "customer.details": escapeHtml(formatContactDetails([
      input.customer.address,
      input.customer.email,
      input.customer.phone,
      input.customer.taxNumber ? `Tax no: ${input.customer.taxNumber}` : null,
    ])),
    "document.number": escapeHtml(input.number),
    "document.issueDate": escapeHtml(input.issueDate),
    "document.dueOrExpiryDate": escapeHtml(input.dueOrExpiryDate),
    "document.lineItems": renderLineItemsTable(input.lineItems, input.currencyCode),
    "document.subtotal": escapeHtml(formatMoney(input.subtotalAmount, input.currencyCode)),
    "document.discount": escapeHtml(formatMoney(input.discountAmount, input.currencyCode)),
    "document.tax": escapeHtml(formatMoney(input.taxAmount, input.currencyCode)),
    "document.total": escapeHtml(formatMoney(input.totalAmount, input.currencyCode)),
    "document.notes": escapeHtml(input.notes ?? "—"),
    "document.terms": escapeHtml(input.terms ?? "—"),
  };
}

function replaceTemplatePlaceholders(htmlContent: string, values: Record<string, string>) {
  return htmlContent.replace(/{{\s*([a-zA-Z0-9.]+)\s*}}/g, (_match, key: string) => values[key] ?? "");
}

function sanitizeTemplateHtml(htmlContent: string) {
  return htmlContent
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, "")
    .replace(/\s+(href|src)\s*=\s*javascript:[^\s>]+/gi, "");
}

function sanitizeTemplateCss(cssContent: string) {
  return cssContent
    .replace(/<\/?style\b[^>]*>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/javascript:/gi, "");
}

function formatContactDetails(lines: Array<string | null>) {
  const details = lines.filter(Boolean).join("\n");

  return details || "—";
}

function renderLineItemsTable(lineItems: PdfLineItem[], currencyCode: string) {
  return `
    <table class="line-items">
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th class="amount">Unit price</th>
          <th class="amount">Discount</th>
          <th class="amount">Tax</th>
          <th class="amount">Line total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems.map((lineItem) => renderLineItemRow(lineItem, currencyCode)).join("")}
      </tbody>
    </table>
  `;
}

function renderPaymentHistoryTable(payments: InvoicePdfInput["payments"], currencyCode: string) {
  if (payments.length === 0) {
    return "";
  }

  const rows = payments
    .map((payment) => `
      <tr>
        <td>${escapeHtml(formatDate(payment.paymentDate))}</td>
        <td>${escapeHtml(formatPaymentMethod(payment.paymentMethod))}</td>
        <td>${escapeHtml(payment.referenceNumber ?? "—")}</td>
        <td>${escapeHtml(payment.receiptNumber ?? "—")}</td>
        <td class="amount">${escapeHtml(formatMoney(payment.amount, currencyCode))}</td>
      </tr>
    `)
    .join("");

  return `
    <section class="payment-history">
      <h3>Payment history</h3>
      <table class="line-items">
        <thead>
          <tr>
            <th>Payment date</th>
            <th>Method</th>
            <th>Reference</th>
            <th>Receipt</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
}

type DocumentHtmlInput = {
  title: string;
  numberLabel: string;
  number: string;
  business: BusinessDetails;
  customer: CustomerDetails;
  logoDataUri: string | null;
  dateRows: Array<[string, string]>;
  lineItems: PdfLineItem[];
  currencyCode: string;
  totals: Array<[string, number, boolean]>;
  notes: string | null;
  terms: string | null;
  extraSection: string;
};

function createDocumentHtml(input: DocumentHtmlInput) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.title)} ${escapeHtml(input.number)}</title>
  <style>
    ${documentStyles}
  </style>
</head>
<body>
  <header class="header">
    <div>
      <p class="eyebrow">${escapeHtml(input.title)}</p>
      <h1>${escapeHtml(input.number)}</h1>
      ${renderContactBlock(input.business.businessName, [input.business.address, input.business.phone, input.business.email, input.business.taxNumber ? `Tax no: ${input.business.taxNumber}` : null])}
    </div>
    ${input.logoDataUri ? `<img class="logo" src="${escapeAttribute(input.logoDataUri)}" alt="Business logo" />` : ""}
  </header>

  <section class="meta-grid">
    <div class="card">
      <h2>Customer</h2>
      ${renderContactBlock(input.customer.name, [input.customer.address, input.customer.email, input.customer.phone, input.customer.taxNumber ? `Tax no: ${input.customer.taxNumber}` : null])}
    </div>
    <div class="card">
      <h2>Document details</h2>
      <dl>
        <div><dt>${escapeHtml(input.numberLabel)}</dt><dd>${escapeHtml(input.number)}</dd></div>
        ${input.dateRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
      </dl>
    </div>
  </section>

  <section class="section">
    <h2>Line items</h2>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th class="amount">Unit price</th>
          <th class="amount">Discount</th>
          <th class="amount">Tax</th>
          <th class="amount">Line total</th>
        </tr>
      </thead>
      <tbody>
        ${input.lineItems.map((lineItem) => renderLineItemRow(lineItem, input.currencyCode)).join("")}
      </tbody>
    </table>
  </section>

  <section class="summary-section">
    <div></div>
    <div class="totals">
      ${input.totals.map(([label, value, strong]) => renderTotalRow(label, value, input.currencyCode, strong)).join("")}
    </div>
  </section>

  ${input.extraSection}

  <section class="notes-grid">
    <div class="card">
      <h2>Notes</h2>
      <p>${escapeHtml(input.notes ?? "—")}</p>
    </div>
    <div class="card">
      <h2>Terms</h2>
      <p>${escapeHtml(input.terms ?? "—")}</p>
    </div>
  </section>
</body>
</html>`;
}

function renderContactBlock(title: string, lines: Array<string | null>) {
  const renderedLines = lines.filter(Boolean).map((line) => `<p>${escapeHtml(String(line))}</p>`).join("");

  return `
    <div class="contact-block">
      <strong>${escapeHtml(title)}</strong>
      ${renderedLines || "<p>—</p>"}
    </div>
  `;
}

function renderLineItemRow(lineItem: PdfLineItem, currencyCode: string) {
  return `
    <tr>
      <td>${escapeHtml(lineItem.description)}</td>
      <td>${escapeHtml(lineItem.quantity.toString())}</td>
      <td class="amount">${escapeHtml(formatMoney(lineItem.unitPriceAmount, currencyCode))}</td>
      <td class="amount">${escapeHtml(formatMoney(lineItem.discountAmount, currencyCode))}</td>
      <td class="amount">${escapeHtml(`${lineItem.taxRateBps / 100}% · ${formatMoney(lineItem.taxAmount, currencyCode)}`)}</td>
      <td class="amount strong">${escapeHtml(formatMoney(lineItem.lineTotalAmount, currencyCode))}</td>
    </tr>
  `;
}

function renderTotalRow(label: string, value: number, currencyCode: string, strong: boolean) {
  return `
    <div class="total-row${strong ? " strong" : ""}">
      <span>${escapeHtml(label)}</span>
      <span>${escapeHtml(formatMoney(value, currencyCode))}</span>
    </div>
  `;
}

async function getLogoDataUri(logoFileUrl: string | null) {
  if (!logoFileUrl) {
    return null;
  }

  const logo = logoFileUrl.startsWith("http://") || logoFileUrl.startsWith("https://")
    ? await fetchRemoteObject(logoFileUrl)
    : await downloadStorageObject(logoFileUrl, "businessLogos");

  if (!logo || !logo.contentType.startsWith("image/")) {
    return null;
  }

  return `data:${logo.contentType};base64,${Buffer.from(logo.bytes).toString("base64")}`;
}

async function downloadStorageObject(path: string, bucketType: "businessLogos" | "templates") {
  const bucket = bucketType === "businessLogos" ? process.env.SUPABASE_BUSINESS_LOGOS_BUCKET : process.env.SUPABASE_TEMPLATES_BUCKET;

  if (!bucket) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error || !data) {
    return null;
  }

  return {
    bytes: await data.arrayBuffer(),
    contentType: data.type || inferContentType(path),
  };
}

async function fetchRemoteObject(url: string) {
  const response = await globalThis.fetch(url);

  if (!response.ok) {
    return null;
  }

  return {
    bytes: await response.arrayBuffer(),
    contentType: response.headers.get("content-type") ?? inferContentType(url),
  };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

function formatPaymentMethod(method: string) {
  return method
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatMoney(amount: number, currencyCode: string) {
  return formatMinorUnitsByCurrency(amount, currencyCode);
}

function inferContentType(path: string) {
  const lowerPath = path.toLowerCase();

  if (lowerPath.endsWith(".png")) {
    return "image/png";
  }

  if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (lowerPath.endsWith(".svg")) {
    return "image/svg+xml";
  }

  return "application/octet-stream";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}

const documentStyles = `
  * { box-sizing: border-box; }
  body {
    color: #0f172a;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    line-height: 1.5;
    margin: 0;
  }
  .header {
    align-items: flex-start;
    border-bottom: 2px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    gap: 32px;
    padding-bottom: 24px;
  }
  .eyebrow {
    color: #64748b;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
    margin: 0 0 8px;
    text-transform: uppercase;
  }
  h1 {
    font-size: 32px;
    line-height: 1.1;
    margin: 0 0 18px;
  }
  h2 {
    font-size: 13px;
    margin: 0 0 12px;
    text-transform: uppercase;
  }
  .logo {
    max-height: 82px;
    max-width: 180px;
    object-fit: contain;
  }
  .contact-block strong {
    display: block;
    font-size: 14px;
    margin-bottom: 6px;
  }
  .contact-block p,
  .card p {
    color: #475569;
    margin: 0 0 3px;
    white-space: pre-line;
  }
  .meta-grid,
  .notes-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: 1fr 1fr;
    margin-top: 24px;
  }
  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 16px;
  }
  dl { margin: 0; }
  dl div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 8px;
  }
  dt { color: #64748b; }
  dd { font-weight: 700; margin: 0; text-align: right; }
  .section { margin-top: 26px; }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  th {
    background: #f1f5f9;
    color: #475569;
    font-size: 10px;
    letter-spacing: 0.08em;
    padding: 10px;
    text-align: left;
    text-transform: uppercase;
  }
  td {
    border-bottom: 1px solid #e2e8f0;
    padding: 10px;
    vertical-align: top;
  }
  .amount { text-align: right; white-space: nowrap; }
  .strong { font-weight: 700; }
  .summary-section {
    display: grid;
    gap: 24px;
    grid-template-columns: 1fr 280px;
    margin-top: 20px;
  }
  .totals {
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 14px;
  }
  .total-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 7px 0;
  }
  .total-row.strong {
    border-top: 1px solid #e2e8f0;
    font-size: 14px;
    font-weight: 700;
    margin-top: 4px;
    padding-top: 10px;
  }
`;
