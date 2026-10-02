import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  // Return dummy client or handle missing DATABASE_URL during build
  // Next.js static generation or build without DB URL
}

const client = process.env.DATABASE_URL ? postgres(process.env.DATABASE_URL) : ({} as any);
export const db = process.env.DATABASE_URL ? drizzle(client, { schema }) : ({} as any);
