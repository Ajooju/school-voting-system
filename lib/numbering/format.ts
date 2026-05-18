export type DocumentNumberType = "invoice" | "quotation" | "receipt";

const documentNumberPrefixes: Record<DocumentNumberType, string> = {
  invoice: "INV",
  quotation: "QUO",
  receipt: "RCT",
};

export function getDocumentYear(date: Date) {
  if (Number.isNaN(date.getTime())) {
    throw new Error("A valid document date is required to assign a document number.");
  }

  return date.getUTCFullYear();
}

export function formatDocumentNumber(documentType: DocumentNumberType, year: number, sequenceNumber: number) {
  const prefix = documentNumberPrefixes[documentType];

  if (!prefix) {
    throw new Error("Unsupported document type.");
  }

  if (!Number.isInteger(year) || year < 1) {
    throw new Error("A valid document year is required.");
  }

  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
    throw new Error("Document sequence number must be a positive integer.");
  }

  return `${prefix}-${year}-${String(sequenceNumber).padStart(4, "0")}`;
}
