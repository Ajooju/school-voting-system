import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatMinorUnitsByCurrency } from "@/lib/money/money";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type ReceiptPdfInput = {
  receiptNumber: string;
  receiptDate: Date;
  business: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    taxNumber: string | null;
    logoFileUrl: string | null;
  };
  customer: {
    name: string;
  };
  invoice: {
    invoiceNumber: string | null;
    balanceDue: number;
  };
  payment: {
    amount: number;
    currencyCode: string;
    method: string;
    referenceNumber: string | null;
    notes: string | null;
  };
};

const margin = 48;
const pageWidth = 612;
const pageHeight = 792;

export async function createReceiptPdfBytes(input: ReceiptPdfInput) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  await drawLogo(pdfDoc, page, input.business.logoFileUrl);
  drawHeader(page, boldFont, regularFont, input);
  drawReceiptDetails(page, regularFont, boldFont, input);
  drawPaymentSummary(page, regularFont, boldFont, input);
  drawFooter(page, regularFont);

  return pdfDoc.save();
}

function drawHeader(page: PDFPage, boldFont: PDFFont, regularFont: PDFFont, input: ReceiptPdfInput) {
  page.drawText("RECEIPT", {
    x: margin,
    y: 720,
    size: 26,
    font: boldFont,
    color: rgb(0.06, 0.09, 0.16),
  });
  page.drawText(input.business.name, {
    x: margin,
    y: 680,
    size: 16,
    font: boldFont,
    color: rgb(0.06, 0.09, 0.16),
  });

  const contactLines = [
    input.business.address,
    input.business.phone,
    input.business.email,
    input.business.taxNumber ? `Tax no: ${input.business.taxNumber}` : null,
  ]
    .filter(Boolean)
    .flatMap((line) => wrapText(String(line), 64));

  contactLines.slice(0, 5).forEach((line, index) => {
    page.drawText(line, {
      x: margin,
      y: 658 - index * 14,
      size: 10,
      font: regularFont,
      color: rgb(0.29, 0.33, 0.39),
    });
  });
}

async function drawLogo(pdfDoc: PDFDocument, page: PDFPage, logoFileUrl: string | null) {
  const logoBytes = await downloadLogoBytes(logoFileUrl);

  if (!logoBytes) {
    drawLogoPlaceholder(page);
    return;
  }

  try {
    const image = logoBytes.contentType === "image/png"
      ? await pdfDoc.embedPng(logoBytes.bytes)
      : await pdfDoc.embedJpg(logoBytes.bytes);
    const scaled = image.scaleToFit(120, 70);
    page.drawImage(image, {
      x: pageWidth - margin - scaled.width,
      y: 688,
      width: scaled.width,
      height: scaled.height,
    });
  } catch {
    drawLogoPlaceholder(page);
  }
}

function drawLogoPlaceholder(page: PDFPage) {
  page.drawRectangle({
    x: pageWidth - margin - 120,
    y: 688,
    width: 120,
    height: 70,
    borderColor: rgb(0.8, 0.84, 0.9),
    borderWidth: 1,
  });
}

async function downloadLogoBytes(logoFileUrl: string | null) {
  if (!logoFileUrl) {
    return null;
  }

  const lowerLogoUrl = logoFileUrl.toLowerCase();

  if (lowerLogoUrl.endsWith(".svg")) {
    return null;
  }

  const response = logoFileUrl.startsWith("http://") || logoFileUrl.startsWith("https://")
    ? await fetchRemoteObject(logoFileUrl)
    : await downloadStorageObject(logoFileUrl);

  if (!response) {
    return null;
  }

  const contentType = response.contentType.toLowerCase();

  if (!contentType.includes("png") && !contentType.includes("jpeg") && !contentType.includes("jpg")) {
    return null;
  }

  return response;
}

async function downloadStorageObject(path: string) {
  const bucket = process.env.SUPABASE_BUSINESS_LOGOS_BUCKET;

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

function drawReceiptDetails(page: PDFPage, regularFont: PDFFont, boldFont: PDFFont, input: ReceiptPdfInput) {
  const leftDetails = [
    ["Receipt number", input.receiptNumber],
    ["Receipt date", formatDate(input.receiptDate)],
    ["Customer", input.customer.name],
    ["Invoice number", input.invoice.invoiceNumber ?? "—"],
  ];
  const rightDetails = [
    ["Payment method", formatPaymentMethod(input.payment.method)],
    ["Reference number", input.payment.referenceNumber ?? "—"],
    ["Payment amount", formatMinorUnitsByCurrency(input.payment.amount, input.payment.currencyCode)],
    ["Remaining balance", formatMinorUnitsByCurrency(input.invoice.balanceDue, input.payment.currencyCode)],
  ];

  drawKeyValueSection(page, regularFont, boldFont, leftDetails, margin, 548);
  drawKeyValueSection(page, regularFont, boldFont, rightDetails, 330, 548);
}

function drawPaymentSummary(page: PDFPage, regularFont: PDFFont, boldFont: PDFFont, input: ReceiptPdfInput) {
  page.drawRectangle({
    x: margin,
    y: 330,
    width: pageWidth - margin * 2,
    height: 92,
    color: rgb(0.96, 0.98, 1),
  });
  page.drawText("Amount received", {
    x: margin + 20,
    y: 382,
    size: 12,
    font: regularFont,
    color: rgb(0.29, 0.33, 0.39),
  });
  page.drawText(formatMinorUnitsByCurrency(input.payment.amount, input.payment.currencyCode), {
    x: margin + 20,
    y: 352,
    size: 24,
    font: boldFont,
    color: rgb(0.06, 0.09, 0.16),
  });

  page.drawText("Notes", {
    x: margin,
    y: 280,
    size: 12,
    font: boldFont,
    color: rgb(0.06, 0.09, 0.16),
  });

  wrapText(input.payment.notes ?? "—", 100).slice(0, 8).forEach((line, index) => {
    page.drawText(line, {
      x: margin,
      y: 258 - index * 16,
      size: 11,
      font: regularFont,
      color: rgb(0.29, 0.33, 0.39),
    });
  });
}

function drawFooter(page: PDFPage, regularFont: PDFFont) {
  page.drawLine({
    start: { x: margin, y: 84 },
    end: { x: pageWidth - margin, y: 84 },
    thickness: 1,
    color: rgb(0.86, 0.89, 0.93),
  });
  page.drawText("Thank you for your payment.", {
    x: margin,
    y: 60,
    size: 10,
    font: regularFont,
    color: rgb(0.29, 0.33, 0.39),
  });
}

function drawKeyValueSection(page: PDFPage, regularFont: PDFFont, boldFont: PDFFont, rows: string[][], x: number, startY: number) {
  rows.forEach(([label, value], index) => {
    const y = startY - index * 38;
    page.drawText(label, {
      x,
      y,
      size: 9,
      font: regularFont,
      color: rgb(0.39, 0.45, 0.55),
    });
    page.drawText(value, {
      x,
      y: y - 17,
      size: 12,
      font: boldFont,
      color: rgb(0.06, 0.09, 0.16),
    });
  });
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

function wrapText(text: string, maxCharacters: number) {
  const words = text.split(/\s+/).filter(Boolean);
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

  return lines.length > 0 ? lines : ["—"];
}

function inferContentType(path: string) {
  const lowerPath = path.toLowerCase();

  if (lowerPath.endsWith(".png")) {
    return "image/png";
  }

  if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  return "application/octet-stream";
}
