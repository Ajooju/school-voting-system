import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const currencies = [
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    decimalPlaces: 2,
    isEnabled: true,
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    decimalPlaces: 2,
    isEnabled: true,
  },
  {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    decimalPlaces: 2,
    isEnabled: true,
  },
  {
    code: "MVR",
    name: "Maldivian Rufiyaa",
    symbol: "Rf",
    decimalPlaces: 2,
    isEnabled: true,
  },
];

async function main() {
  await Promise.all(
    currencies.map((currency) =>
      prisma.currency.upsert({
        where: {
          code: currency.code,
        },
        update: {
          name: currency.name,
          symbol: currency.symbol,
          decimalPlaces: currency.decimalPlaces,
          isEnabled: currency.isEnabled,
        },
        create: currency,
      }),
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
