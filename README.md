# modelright

Model-driven development platform.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with your DATABASE_URL
   ```

3. Run database migrations:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

The app runs at http://localhost:3000

Health check: http://localhost:3000/health
