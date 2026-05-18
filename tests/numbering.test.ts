import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDocumentNumber, getDocumentYear } from "../lib/numbering/format.ts";

describe("numbering utilities", () => {
  it("formats invoice numbers", () => {
    assert.equal(formatDocumentNumber("invoice", 2026, 1), "INV-2026-0001");
  });

  it("formats quotation numbers", () => {
    assert.equal(formatDocumentNumber("quotation", 2026, 12), "QUO-2026-0012");
  });

  it("formats receipt numbers", () => {
    assert.equal(formatDocumentNumber("receipt", 2026, 123), "RCT-2026-0123");
  });

  it("formats yearly sequence numbers independently", () => {
    assert.equal(formatDocumentNumber("invoice", 2026, 1), "INV-2026-0001");
    assert.equal(formatDocumentNumber("invoice", 2027, 1), "INV-2027-0001");
  });

  it("rejects invalid sequence numbers", () => {
    assert.throws(() => formatDocumentNumber("invoice", 2026, 0), /positive integer/);
  });

  it("uses the provided document date year", () => {
    assert.equal(getDocumentYear(new Date("2027-01-01T00:00:00.000Z")), 2027);
  });
});
