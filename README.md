# modelright

Model management platform.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your database:
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL` to your PostgreSQL connection string

3. Generate and run migrations:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Scripts

- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm run start` — Start production server
- `npm run typecheck` — Type-check without building
- `npm run db:generate` — Generate Drizzle migrations
- `npm run db:migrate` — Apply migrations to database
