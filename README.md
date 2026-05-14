# College0

College0 is a full-stack academic operations platform built with a modern Next.js frontend and a FastAPI/PostgreSQL backend. It supports visitor applications, student and instructor registration flows, course and roster management, complaints and academic reviews, plus AI-assisted guidance and college-specific knowledge retrieval.

## Key Features

- Frontend built with Next.js 16, React 19, and Tailwind CSS
- Backend built with FastAPI and SQLAlchemy
- PostgreSQL schema with academic domain models, user roles, enrollments, reviews, complaints, and semesters
- Role-based dashboard experience for students, instructors, and registrars
- Visitor application flows for student and instructor applicants
- Student course registration, waitlisting, course reviews, and graduation checks
- Instructor roster management and warning issuance
- Registrar tools for applications, semester control, grade/audit review, and policy oversight
- AI assistant routes for contextual Q&A and academic advising

## Repository Structure

- `app/` - Next.js App Router frontend pages and API routes
- `components/` - Shared UI components, including AI chat panels and instructor roster tables
- `lib/` - Frontend utility types and API helpers
- `main.py` - FastAPI backend entrypoint with authentication, registration, complaints, and advisor endpoints
- `schema.sql` - PostgreSQL schema definitions for College0 data models
- `requirements.txt` - Python backend dependencies
- `package.json` - Frontend dependencies and Next.js scripts
- `proxy.ts` - route middleware for dashboard authentication and role redirects
- `logic_engine.py`, `crud.py`, `services.py` - backend business logic and helper utilities
- `seed_db.py` / `seed.sql` / `seed_classes.sql` - seed data and database initialization helpers

## Getting Started

### Prerequisites

- Node.js (recommended latest LTS)
- PostgreSQL with the `vector` extension available
- Python 3.11+ (or compatible)

### Backend Setup

1. Create a PostgreSQL database.
2. Enable the vector extension and apply the schema:

```bash
psql "$DATABASE_URL" -f schema.sql
```

3. Create a `.env.local` file in the repository root with:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/college0
```

4. Install Python dependencies:

```bash
python -m pip install -r requirements.txt
```

5. Run the backend server:

```bash
uvicorn main:app --reload
```

### Frontend Setup

1. Install frontend dependencies:

```bash
npm install
```

2. Run the Next.js development server:

```bash
npm run dev
```

3. Open the app at:

```text
http://localhost:3000
```

## Development Notes

- The frontend uses the App Router (`app/` directory) and client/server components.
- API routes under `app/api/` support AI chat, advisor queries, registration, classes, and more.
- Backend startup includes lightweight migrations and sequence resetting for seeded tables.
- Visitor users may browse public dashboards and apply without a fully activated account.

## Useful Scripts

- `npm run dev` — start the frontend development server
- `npm run build` — build the frontend for production
- `npm run start` — run the production Next.js server
- `npm run lint` — run ESLint checks

## Notes

- The project includes AI/chat functionality with scoped responses for `visitor`, `student`, and `instructor` roles.
- Registrar workflows are enforced using middleware in `proxy.ts`.
- Passwords are hashed in the backend with `bcrypt`.

---

If you want, I can also add example environment variables or a quick walkthrough for registering test users.
