import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_TYPES = [
  "Laptop",
  "Mouse",
  "Keyboard",
  "Hard Disk",
  "Monitor",
  "Headset",
  "Mobile Phone",
  "Charger",
  "Docking Station",
  "Webcam",
  "Tablet",
  "USB Drive",
  "Adapter",
  "Laptop Bag",
];

async function main() {
  for (const name of DEFAULT_TYPES) {
    await prisma.assetType.upsert({
      where: { name },
      update: {},
      create: { name, isCustom: false },
    });
  }
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
