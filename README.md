# modelright

Model everything right.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure your database:
   ```bash
   cp .env.example .env
   # Edit .env and set DATABASE_URL to your PostgreSQL connection string
   ```

3. Generate and run migrations:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Stack

- **Next.js 14** — App Router
- **React 18** — UI
- **Drizzle ORM** — Type-safe SQL
- **PostgreSQL** — Database
- **TypeScript** — Type safety

## Scripts

- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm start` — Run production build
- `npm run typecheck` — Type check without emitting
- `npm run db:generate` — Generate migrations from schema
- `npm run db:migrate` — Apply migrations to database
