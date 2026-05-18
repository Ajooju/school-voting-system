export type TemplatePlaceholder = {
  key: string;
  label: string;
  category: string;
  description: string;
  html: string;
};

export const templatePlaceholders: TemplatePlaceholder[] = [
  {
    key: "business.logo",
    label: "Business logo",
    category: "Business",
    description: "Logo image for the active business profile.",
    html: '<img src="{{business.logo}}" alt="Business logo" style="max-width: 160px; max-height: 80px; object-fit: contain;" />',
  },
  {
    key: "business.name",
    label: "Business name",
    category: "Business",
    description: "Registered or trading name for the business.",
    html: "<h2>{{business.name}}</h2>",
  },
  {
    key: "business.address",
    label: "Business address",
    category: "Business",
    description: "Address and contact details for the business.",
    html: '<p style="white-space: pre-line;">{{business.address}}</p>',
  },
  {
    key: "customer.name",
    label: "Customer name",
    category: "Customer",
    description: "Customer display name.",
    html: "<h3>{{customer.name}}</h3>",
  },
  {
    key: "customer.details",
    label: "Customer details",
    category: "Customer",
    description: "Customer address and contact details.",
    html: '<p style="white-space: pre-line;">{{customer.details}}</p>',
  },
  {
    key: "document.number",
    label: "Document number",
    category: "Document",
    description: "Invoice or quotation number.",
    html: '<p><strong>Document #:</strong> {{document.number}}</p>',
  },
  {
    key: "document.issueDate",
    label: "Issue date",
    category: "Document",
    description: "Document issue date.",
    html: '<p><strong>Issue date:</strong> {{document.issueDate}}</p>',
  },
  {
    key: "document.dueOrExpiryDate",
    label: "Due / expiry date",
    category: "Document",
    description: "Invoice due date or quotation expiry date.",
    html: '<p><strong>Due / expiry:</strong> {{document.dueOrExpiryDate}}</p>',
  },
  {
    key: "document.lineItems",
    label: "Line items table",
    category: "Amounts",
    description: "Line-item table for invoice or quotation rows.",
    html: "{{document.lineItems}}",
  },
  {
    key: "document.subtotal",
    label: "Subtotal",
    category: "Amounts",
    description: "Subtotal before discounts and tax.",
    html: '<p><strong>Subtotal:</strong> {{document.subtotal}}</p>',
  },
  {
    key: "document.discount",
    label: "Discount",
    category: "Amounts",
    description: "Total discount amount.",
    html: '<p><strong>Discount:</strong> {{document.discount}}</p>',
  },
  {
    key: "document.tax",
    label: "Tax",
    category: "Amounts",
    description: "Total tax amount.",
    html: '<p><strong>Tax:</strong> {{document.tax}}</p>',
  },
  {
    key: "document.total",
    label: "Total",
    category: "Amounts",
    description: "Document total.",
    html: '<p style="font-size: 20px;"><strong>Total:</strong> {{document.total}}</p>',
  },
  {
    key: "document.paymentHistory",
    label: "Payment history",
    category: "Invoice only",
    description: "Invoice payment history table.",
    html: "{{document.paymentHistory}}",
  },
  {
    key: "document.balanceDue",
    label: "Balance due",
    category: "Invoice only",
    description: "Outstanding invoice balance.",
    html: '<p><strong>Balance due:</strong> {{document.balanceDue}}</p>',
  },
  {
    key: "document.notes",
    label: "Notes",
    category: "Content",
    description: "Document notes.",
    html: '<section><h3>Notes</h3><p style="white-space: pre-line;">{{document.notes}}</p></section>',
  },
  {
    key: "document.terms",
    label: "Terms",
    category: "Content",
    description: "Document terms.",
    html: '<section><h3>Terms</h3><p style="white-space: pre-line;">{{document.terms}}</p></section>',
  },
];

export const defaultTemplateHtml = `
<section class="document-template">
  <header class="template-header">
    <div>
      <img src="{{business.logo}}" alt="Business logo" class="business-logo" />
      <h1>{{business.name}}</h1>
      <p>{{business.address}}</p>
    </div>
    <div class="document-meta">
      <h2>{{document.number}}</h2>
      <p><strong>Issue date:</strong> {{document.issueDate}}</p>
      <p><strong>Due / expiry:</strong> {{document.dueOrExpiryDate}}</p>
    </div>
  </header>

  <section class="bill-to">
    <h3>Bill to</h3>
    <p><strong>{{customer.name}}</strong></p>
    <p>{{customer.details}}</p>
  </section>

  {{document.lineItems}}

  <section class="totals">
    <p><span>Subtotal</span><strong>{{document.subtotal}}</strong></p>
    <p><span>Discount</span><strong>{{document.discount}}</strong></p>
    <p><span>Tax</span><strong>{{document.tax}}</strong></p>
    <p class="grand-total"><span>Total</span><strong>{{document.total}}</strong></p>
    <p><span>Balance due</span><strong>{{document.balanceDue}}</strong></p>
  </section>

  {{document.paymentHistory}}

  <section class="notes-terms">
    <div>
      <h3>Notes</h3>
      <p>{{document.notes}}</p>
    </div>
    <div>
      <h3>Terms</h3>
      <p>{{document.terms}}</p>
    </div>
  </section>
</section>
`;

export const defaultTemplateCss = `
.document-template {
  color: #0f172a;
  font-family: Arial, Helvetica, sans-serif;
  line-height: 1.5;
  padding: 32px;
}
.template-header {
  align-items: flex-start;
  border-bottom: 2px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  gap: 32px;
  padding-bottom: 24px;
}
.business-logo {
  display: block;
  max-height: 80px;
  max-width: 160px;
  object-fit: contain;
}
.document-meta {
  text-align: right;
}
.bill-to,
.notes-terms {
  margin-top: 24px;
}
.line-items {
  border-collapse: collapse;
  margin-top: 24px;
  width: 100%;
}
.line-items th,
.line-items td {
  border-bottom: 1px solid #e2e8f0;
  padding: 10px;
  text-align: left;
}
.line-items th {
  background: #f8fafc;
  color: #475569;
  text-transform: uppercase;
}
.line-items .amount {
  text-align: right;
}
.totals {
  margin-left: auto;
  margin-top: 24px;
  max-width: 320px;
}
.totals p {
  display: flex;
  justify-content: space-between;
  margin: 0;
  padding: 7px 0;
}
.totals .grand-total {
  border-top: 1px solid #cbd5e1;
  font-size: 18px;
  margin-top: 8px;
  padding-top: 12px;
}
.payment-history {
  margin-top: 24px;
}
.notes-terms {
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr 1fr;
}
`;
