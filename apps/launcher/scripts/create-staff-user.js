const path = require('path');
const { config } = require('dotenv');
const { PrismaClient, StaffRole } = require('@prisma/client');
const bcrypt = require('bcrypt');

const rootDir = path.resolve(__dirname, '..', '..', '..');

config({ path: path.join(rootDir, '.env'), quiet: true });
config({ path: path.join(rootDir, 'apps', 'api', '.env'), quiet: true });

const login = (process.env.CRM_LOGIN || '').trim();
const name = (process.env.CRM_NAME || '').trim();
const password = process.env.CRM_PASSWORD || '';
const role = (process.env.CRM_ROLE || 'OPERATOR').trim().toUpperCase();

if (!login) {
  console.error('CRM_LOGIN is required');
  process.exit(1);
}

if (!name) {
  console.error('CRM_NAME is required');
  process.exit(1);
}

if (password.length < 6) {
  console.error('CRM_PASSWORD must be at least 6 characters');
  process.exit(1);
}

if (!Object.values(StaffRole).includes(role)) {
  console.error(`CRM_ROLE must be one of: ${Object.values(StaffRole).join(', ')}`);
  process.exit(1);
}

async function main() {
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash(password, 12);
  const staff = await prisma.staffUser.upsert({
    where: { login },
    update: { name, passwordHash, role, active: true },
    create: { login, name, passwordHash, role, active: true },
    select: { id: true, login: true, name: true, role: true, active: true },
  });

  console.log(`CRM user ready: ${staff.login} (${staff.role})`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
