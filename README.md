# modelright

Model-driven application with Next.js, Drizzle ORM, and PostgreSQL.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure database**
   ```bash
   cp .env.example .env
   # Edit .env and set DATABASE_URL to your PostgreSQL connection string
   ```

3. **Generate and run migrations**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Stack

- **Next.js 14** — app router
- **Drizzle ORM** — type-safe database client
- **PostgreSQL** — relational database
- **TypeScript** — static typing

## Scripts

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run start` — run production server
- `npm run typecheck` — check TypeScript
- `npm run db:generate` — generate migrations from schema
- `npm run db:migrate` — apply migrations to database
