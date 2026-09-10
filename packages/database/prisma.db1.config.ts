import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'prisma/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadEnv = (process as any).loadEnvFile;
if (typeof loadEnv === 'function') {
  try {
    loadEnv(path.resolve(__dirname, '../../.env'));
  } catch {
    try {
      loadEnv(path.resolve(__dirname, '.env'));
    } catch {}
  }
}

export default defineConfig({
  schema: './prisma/schema.db1.prisma',
  datasource: {
    url: process.env.DB1_DATABASE_URL || process.env.DATABASE_URL || '',
  },
} as any);
