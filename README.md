# Personal Invoicing App

A private personal invoicing application for one owner/admin user. This is not a SaaS product and is intentionally scoped around a single private workspace.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL via Supabase
- Supabase Auth
- Supabase Storage
- Zod
- React Hook Form
- GrapesJS for visual invoice/quotation templates
- Mammoth.js for DOCX import
- pdf-lib for PDF overlay templates and receipts
- Playwright for HTML-to-PDF generation
- ESLint
- npm

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

3. Create a Supabase project, configure the required environment variables, and create the storage buckets described below.

4. Generate the Prisma client:

   ```bash
   npx prisma generate
   ```

5. Apply database migrations locally or to a development Supabase database:

   ```bash
   npx prisma migrate dev
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser. The root route redirects to `/dashboard`.

## Required Environment Variables

Set these values locally in `.env` and in Vercel Project Settings > Environment Variables. Never commit `.env` files.

| Variable | Required | Visibility | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_NAME` | Yes | Browser-safe | Display name used by app metadata/UI. |
| `APP_URL` | Yes | Server | Canonical app URL. Use `http://localhost:3000` locally and the Vercel production URL in production. |
| `DATABASE_URL` | Yes | Server | Supabase pooled PostgreSQL connection string for Prisma runtime queries. Use the transaction pooler URL for Vercel. |
| `DIRECT_URL` | Yes | Server | Supabase direct PostgreSQL connection string for Prisma migrations. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser-safe | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser-safe | Supabase anon key used by browser-safe and server session clients. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only | Supabase service role key for server-only storage operations. Never expose with `NEXT_PUBLIC_`. |
| `AUTH_SECRET` | Yes | Server only | Random secret for server-side auth/session flows. Generate with `openssl rand -base64 32`. |
| `SUPABASE_BUSINESS_LOGOS_BUCKET` | Yes | Server only | Private Supabase Storage bucket for business profile logos. Recommended value: `business-logos`. |
| `SUPABASE_TEMPLATES_BUCKET` | Yes | Server only | Private Supabase Storage bucket for imported DOCX/PDF template source files. Recommended value: `templates`. |
| `SUPABASE_GENERATED_PDFS_BUCKET` | Yes | Server only | Private Supabase Storage bucket for generated invoice, quotation, and receipt PDFs. Recommended value: `generated-pdfs`. |
| `STORAGE_PROVIDER` | Yes | Server | Storage backend marker. Use `supabase`. |

## Supabase Setup

1. Create a new Supabase project.
2. In Supabase Auth, create the single owner/admin user manually. Do not enable public self-signup unless the app is explicitly changed to support it.
3. Copy the project URL and anon key from Project Settings > API into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Copy the service role key into `SUPABASE_SERVICE_ROLE_KEY`. Keep it server-only in local `.env` and Vercel.
5. Copy the database connection strings from Project Settings > Database:
   - Use the pooled/transaction-pooler connection string for `DATABASE_URL`.
   - Use the direct connection string for `DIRECT_URL`.
6. Add your database password to both connection strings.
7. Create the required private storage buckets listed below.

## Storage Buckets

Create these Supabase Storage buckets as **private** buckets:

| Bucket | Environment variable | Used for |
| --- | --- | --- |
| `business-logos` | `SUPABASE_BUSINESS_LOGOS_BUCKET` | Uploaded PNG/JPG business logos. |
| `templates` | `SUPABASE_TEMPLATES_BUCKET` | Imported DOCX files and locked PDF overlay template files. |
| `generated-pdfs` | `SUPABASE_GENERATED_PDFS_BUCKET` | Generated invoice PDFs, quotation PDFs, and receipt PDFs. |

The app stores object paths in the database and creates short-lived signed URLs from protected server routes when downloads/previews are requested.

## Database Migrations

Migration files are committed under `prisma/migrations/`.

### Local/development migration workflow

```bash
npx prisma generate
npx prisma migrate dev
```

### Production/Supabase migration workflow

Run migrations from a trusted machine or CI job with `DATABASE_URL` and `DIRECT_URL` set:

```bash
npx prisma generate
npx prisma migrate deploy
```

Do not run `prisma migrate dev` against production. Use `prisma migrate deploy` for Vercel/Supabase production databases.

## Vercel Deployment

1. Push the repository to GitHub/GitLab/Bitbucket.
2. Create a new Vercel project and import the repository.
3. Set the framework preset to Next.js.
4. Add all required environment variables listed above for Production (and Preview/Development if needed).
5. Use the default install command:

   ```bash
   npm install
   ```

6. Use the repository build command. It runs `prisma generate` before `next build`:

   ```bash
   npm run build
   ```

7. Before the first production deployment, apply migrations to Supabase from CI or a trusted local machine:

   ```bash
   npx prisma migrate deploy
   ```

8. Deploy the Vercel project.
9. After deployment, sign in with the manually-created Supabase owner/admin user and verify:
   - `/dashboard` loads after login.
   - Business logo uploads use `business-logos`.
   - Template imports use `templates`.
   - Generated invoices, quotations, and receipts use `generated-pdfs`.

## Available Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
npm test
npx prisma generate
npx prisma migrate dev
npx prisma migrate deploy
```

## Project Structure

```text
app/
  (protected)/
    dashboard/
    invoices/
    quotations/
    customers/
    businesses/
    templates/
    payments/
    settings/
  login/
components/
  ui/
  layout/
  invoice/
  quotation/
  customer/
  business/
  template-editor/
  payment/
lib/
  auth/
  db/
  documents/
  money/
  numbering/
  payments/
  quotations/
  receipts/
  supabase/
  templates/
  validations/
prisma/
  migrations/
tests/
```

## Architecture Notes

- Use Prisma for all database access.
- Validate all form and server inputs with Zod.
- Store money as integer minor units and never use floating point math for money.
- Draft invoices, quotations, and receipts do not consume official numbers.
- Invoice, quotation, and receipt numbers reset yearly and are assigned only when finalizing or generating official documents.
- Invoice and quotation templates are editable visual templates.
- DOCX uploads are imported into editable HTML templates.
- PDF uploads are treated as locked backgrounds with mapped fields.
- Supabase service role access is isolated to server-only modules and must never be exposed to browser code.
