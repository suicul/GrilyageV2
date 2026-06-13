const path = require('path');
const { config } = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const rootDir = path.resolve(__dirname, '..', '..', '..');

config({ path: path.join(rootDir, '.env'), quiet: true });
config({ path: path.join(rootDir, 'apps', 'api', '.env'), quiet: true });

const email = (process.env.CUSTOMER_EMAIL || '').trim().toLowerCase();
const name = (process.env.CUSTOMER_NAME || '').trim();
const phone = (process.env.CUSTOMER_PHONE || '').trim();
const password = process.env.CUSTOMER_PASSWORD || '';

if (!/^\S+@\S+\.\S+$/.test(email)) {
  console.error('CUSTOMER_EMAIL must be a valid email');
  process.exit(1);
}

if (!name) {
  console.error('CUSTOMER_NAME is required');
  process.exit(1);
}

if (password.length < 6) {
  console.error('CUSTOMER_PASSWORD must be at least 6 characters');
  process.exit(1);
}

async function main() {
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, phone: phone || null, passwordHash, emailVerifiedAt: new Date() },
    create: { email, name, phone: phone || null, passwordHash, emailVerifiedAt: new Date() },
    select: { id: true, email: true, name: true, phone: true, emailVerifiedAt: true },
  });

  console.log(`Customer user ready: ${user.email}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
