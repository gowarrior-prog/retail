import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, env } from 'prisma/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  process.loadEnvFile(path.resolve(__dirname, '../../.env'));
} catch {
  try {
    process.loadEnvFile(path.resolve(__dirname, '.env'));
  } catch {}
}

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.db1.prisma',
  datasource: {
    url: process.env.DB1_DATABASE_URL || process.env.DATABASE_URL || '',
  },
});