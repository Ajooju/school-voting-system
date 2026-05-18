export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "MVR" | string;

export type Money = Readonly<{
  amountMinor: number;
  currency: CurrencyCode;
}>;

export type LineTotalInput = Readonly<{
  quantity: string | number;
  unitPriceAmount: number;
  discountAmount?: number;
  taxRateBps?: number;
}>;

export type LineTotals = Readonly<{
  subtotalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  lineTotalAmount: number;
}>;

export type InvoiceTotalsInput = Readonly<{
  subtotalAmount: number;
  discountAmount?: number;
  taxAmount?: number;
  lineTotalAmount?: number;
}>;

export type InvoiceTotals = Readonly<{
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
}>;

const defaultMinorUnitDigits = 2;
const defaultQuantityScale = 10_000;
const currencySymbols: Record<string, string> = {
  AUD: "$",
  CAD: "$",
  EUR: "€",
  GBP: "£",
  MVR: "Rf",
  USD: "$",
};

export function createMoney(amountMinor: number, currency: CurrencyCode): Money {
  assertSafeInteger(amountMinor, "Money amounts must be safe integer minor units.");

  return {
    amountMinor,
    currency,
  };
}

export function addMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);

  return createMoney(left.amountMinor + right.amountMinor, left.currency);
}

export function subtractMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);

  return createMoney(left.amountMinor - right.amountMinor, left.currency);
}

export function parseDisplayAmountToMinorUnits(
  displayAmount: string,
  minorUnitDigits = defaultMinorUnitDigits,
) {
  assertMinorUnitDigits(minorUnitDigits);

  const normalizedAmount = displayAmount.trim().replace(/,/g, "");
  const match = normalizedAmount.match(/^(-)?(?:\d+)(?:\.(\d+))?$/);

  if (!match) {
    throw new Error("Enter a valid money amount.");
  }

  const isNegative = Boolean(match[1]);
  const [majorPart, rawMinorPart = ""] = normalizedAmount.replace("-", "").split(".");

  if (rawMinorPart.length > minorUnitDigits) {
    throw new Error(`Amount cannot have more than ${minorUnitDigits} decimal places.`);
  }

  const minorPart = rawMinorPart.padEnd(minorUnitDigits, "0");
  const scale = 10n ** BigInt(minorUnitDigits);
  const amount = BigInt(majorPart) * scale + BigInt(minorPart || "0");
  const signedAmount = isNegative ? -amount : amount;

  return bigIntToSafeNumber(signedAmount, "Money amount is too large.");
}

export function formatMoney(money: Money, minorUnitDigits = defaultMinorUnitDigits) {
  return formatMinorUnitsByCurrency(money.amountMinor, money.currency, minorUnitDigits);
}

export function formatMinorUnitsByCurrency(
  amountMinor: number,
  currency: CurrencyCode,
  minorUnitDigits = defaultMinorUnitDigits,
) {
  assertSafeInteger(amountMinor, "Money amounts must be safe integer minor units.");
  assertMinorUnitDigits(minorUnitDigits);

  const formattedAmount = formatMinorUnits(amountMinor, minorUnitDigits);
  const symbol = currencySymbols[currency.toUpperCase()];

  if (!symbol) {
    return `${currency.toUpperCase()} ${formattedAmount}`;
  }

  return symbol.length === 1 ? `${symbol}${formattedAmount}` : `${symbol} ${formattedAmount}`;
}

export function calculateTax(amountMinor: number, taxRateBps: number) {
  assertSafeInteger(amountMinor, "Taxable amount must be integer minor units.");
  assertBasisPoints(taxRateBps);

  if (taxRateBps === 0 || amountMinor === 0) {
    return 0;
  }

  return roundDivide(BigInt(amountMinor) * BigInt(taxRateBps), 10_000n);
}

export function calculateLineTotals({
  quantity,
  unitPriceAmount,
  discountAmount = 0,
  taxRateBps = 0,
}: LineTotalInput): LineTotals {
  assertSafeInteger(unitPriceAmount, "Unit price must be integer minor units.");
  assertSafeInteger(discountAmount, "Discount must be integer minor units.");
  assertBasisPoints(taxRateBps);

  if (discountAmount < 0) {
    throw new Error("Discount cannot be negative.");
  }

  const quantityUnits = parseQuantityToUnits(quantity);
  const subtotalAmount = roundDivide(BigInt(unitPriceAmount) * BigInt(quantityUnits), BigInt(defaultQuantityScale));
  const taxableAmount = Math.max(subtotalAmount - discountAmount, 0);
  const taxAmount = calculateTax(taxableAmount, taxRateBps);
  const lineTotalAmount = taxableAmount + taxAmount;

  return {
    subtotalAmount,
    discountAmount,
    taxableAmount,
    taxAmount,
    lineTotalAmount,
  };
}

export function calculateInvoiceTotals(lineTotals: readonly InvoiceTotalsInput[]): InvoiceTotals {
  const subtotalAmount = sumIntegerAmounts(lineTotals.map((line) => line.subtotalAmount));
  const taxAmount = sumIntegerAmounts(lineTotals.map((line) => line.taxAmount ?? 0));
  const discountAmount = sumIntegerAmounts(lineTotals.map((line) => line.discountAmount ?? 0));
  const totalAmount = subtotalAmount - discountAmount + taxAmount;

  return {
    subtotalAmount,
    taxAmount,
    discountAmount,
    totalAmount,
  };
}

function formatMinorUnits(amountMinor: number, minorUnitDigits: number) {
  const sign = amountMinor < 0 ? "-" : "";
  const absoluteMinorText = `${amountMinor < 0 ? -amountMinor : amountMinor}`;

  if (minorUnitDigits === 0) {
    return `${sign}${addThousandsSeparators(absoluteMinorText)}`;
  }

  const paddedAmount = absoluteMinorText.padStart(minorUnitDigits + 1, "0");
  const majorPart = paddedAmount.slice(0, -minorUnitDigits);
  const minorPart = paddedAmount.slice(-minorUnitDigits);

  return `${sign}${addThousandsSeparators(majorPart)}.${minorPart}`;
}

function parseQuantityToUnits(quantity: string | number) {
  const normalizedQuantity = String(quantity).trim().replace(/,/g, "");
  const match = normalizedQuantity.match(/^(?:\d+)(?:\.(\d+))?$/);

  if (!match) {
    throw new Error("Quantity must be a positive decimal number.");
  }

  const [wholePart, rawDecimalPart = ""] = normalizedQuantity.split(".");

  if (rawDecimalPart.length > 4) {
    throw new Error("Quantity cannot have more than 4 decimal places.");
  }

  const decimalPart = rawDecimalPart.padEnd(4, "0");

  return bigIntToSafeNumber(
    BigInt(wholePart) * BigInt(defaultQuantityScale) + BigInt(decimalPart || "0"),
    "Quantity is too large.",
  );
}

function sumIntegerAmounts(amounts: readonly number[]) {
  return amounts.reduce((total, amount) => {
    assertSafeInteger(amount, "Amount must be integer minor units.");

    return total + amount;
  }, 0);
}

function addThousandsSeparators(value: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function roundDivide(numerator: bigint, denominator: bigint) {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;

  return bigIntToSafeNumber(rounded, "Calculated money amount is too large.");
}

function bigIntToSafeNumber(value: bigint, message: string) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error(message);
  }

  return Number(value);
}

function assertSameCurrency(left: Money, right: Money) {
  if (left.currency !== right.currency) {
    throw new Error("Money values must use the same currency.");
  }
}

function assertMinorUnitDigits(minorUnitDigits: number) {
  if (!Number.isInteger(minorUnitDigits) || minorUnitDigits < 0) {
    throw new Error("Minor unit digits must be a non-negative integer.");
  }
}

function assertBasisPoints(taxRateBps: number) {
  assertSafeInteger(taxRateBps, "Tax rate must be integer basis points.");

  if (taxRateBps < 0) {
    throw new Error("Tax rate cannot be negative.");
  }
}

function assertSafeInteger(value: number, message: string) {
  if (!Number.isSafeInteger(value)) {
    throw new Error(message);
  }
}
