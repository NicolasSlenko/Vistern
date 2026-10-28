# Vistern

Vistern is a career workspace for college students pursuing technical internships. Students can build a verified record of their experience, review and improve resumes, explore roles, and track progress across a recruiting cycle.

The current public reference is [`public_docs/documentation.md`](public_docs/documentation.md). Public architecture diagrams are in [`public_docs/diagrams/`](public_docs/diagrams/). The local `docs/` directory is for internal working material and is ignored by Git.

## Run locally

Use Node.js 24.x and npm. Copy `.env.example` to `.env.local` and fill in development credentials for the services you need.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use `npm run build` to check the production build. The application uses Next.js, React, TypeScript, Clerk, Supabase, private AWS S3 storage, an AI provider layer (UF HiPerGator by default; OpenAI and Anthropic Claude optional, chosen per user), and Adzuna; see the public documentation for workflows and data boundaries.

## Checks

```powershell
npm run test:student
npm run test:career
npm run test:resume
npm run test:parse
npm run test:merge
npm run test:score
npx tsc --noEmit
npm run build
```

Resume data is private. Never commit `.env.local`, credentials, or real student resumes. The third-party design attribution is in [`NOTICE.md`](NOTICE.md).
