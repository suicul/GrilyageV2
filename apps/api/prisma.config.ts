import { defineConfig } from '@prisma/config';
import { config } from 'dotenv';

config({ path: '../../.env' });
config({ path: '.env' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  seed: {
    ts: {
      command: 'ts-node',
      args: ['prisma/seed.ts'],
    },
  },
});
