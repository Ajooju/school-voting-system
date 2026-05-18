import { formatMinorUnitsByCurrency } from "@/lib/money/money";

const sampleCurrency = "USD";

const sampleLineItems = [
  {
    description: "Design consultation",
    quantity: "2",
    unitPriceAmount: 12500,
    discountAmount: 0,
    taxAmount: 1250,
    lineTotalAmount: 26250,
  },
  {
    description: "Implementation package",
    quantity: "1",
    unitPriceAmount: 75000,
    discountAmount: 5000,
    taxAmount: 3500,
    lineTotalAmount: 73500,
  },
];

const samplePayments = [
  {
    paymentDate: "May 10, 2026",
    method: "Bank transfer",
    reference: "TRN-10045",
    amount: formatMinorUnitsByCurrency(30000, sampleCurrency),
  },
];

const sampleValues: Record<string, string> = {
  "business.logo": "https://placehold.co/240x120/e2e8f0/0f172a?text=Logo",
  "business.name": escapeHtml("Acme Studio"),
  "business.address": escapeHtml("123 Market Street\nSan Francisco, CA\nhello@acmestudio.test\n+1 555 0100"),
  "customer.name": escapeHtml("Northwind Traders"),
  "customer.details": escapeHtml("456 Client Avenue\nSeattle, WA\nap@northwind.test"),
  "document.number": escapeHtml("INV-2026-0001 / QUO-2026-0001"),
  "document.issueDate": escapeHtml("May 18, 2026"),
  "document.dueOrExpiryDate": escapeHtml("June 17, 2026"),
  "document.lineItems": renderLineItemsTable(),
  "document.subtotal": formatMinorUnitsByCurrency(100000, sampleCurrency),
  "document.discount": formatMinorUnitsByCurrency(5000, sampleCurrency),
  "document.tax": formatMinorUnitsByCurrency(4750, sampleCurrency),
  "document.total": formatMinorUnitsByCurrency(99750, sampleCurrency),
  "document.paymentHistory": renderPaymentHistoryTable(),
  "document.balanceDue": formatMinorUnitsByCurrency(69750, sampleCurrency),
  "document.notes": escapeHtml("Thank you for your business. This preview uses sample data."),
  "document.terms": escapeHtml("Payment is due according to the document date shown above."),
};

export function renderTemplatePreview(htmlContent: string, cssContent: string) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>${sanitizeTemplateCss(cssContent)}</style>
</head>
<body>${replacePlaceholders(sanitizeTemplateHtml(htmlContent))}</body>
</html>`;
}

function replacePlaceholders(htmlContent: string) {
  return htmlContent.replace(/{{\s*([a-zA-Z0-9.]+)\s*}}/g, (_match, key: string) => sampleValues[key] ?? "");
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderLineItemsTable() {
  const rows = sampleLineItems
    .map((lineItem) => `
      <tr>
        <td>${lineItem.description}</td>
        <td>${lineItem.quantity}</td>
        <td class="amount">${formatMinorUnitsByCurrency(lineItem.unitPriceAmount, sampleCurrency)}</td>
        <td class="amount">${formatMinorUnitsByCurrency(lineItem.discountAmount, sampleCurrency)}</td>
        <td class="amount">${formatMinorUnitsByCurrency(lineItem.taxAmount, sampleCurrency)}</td>
        <td class="amount">${formatMinorUnitsByCurrency(lineItem.lineTotalAmount, sampleCurrency)}</td>
      </tr>
    `)
    .join("");

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
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderPaymentHistoryTable() {
  const rows = samplePayments
    .map((payment) => `
      <tr>
        <td>${payment.paymentDate}</td>
        <td>${payment.method}</td>
        <td>${payment.reference}</td>
        <td class="amount">${payment.amount}</td>
      </tr>
    `)
    .join("");

  return `
    <section class="payment-history">
      <h3>Payment history</h3>
      <table class="line-items">
        <thead>
          <tr>
            <th>Date</th>
            <th>Method</th>
            <th>Reference</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
}
