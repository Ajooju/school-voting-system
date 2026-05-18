# Agent Instructions

This repository contains a private personal invoicing application. Follow these instructions for all files in this repository unless a more specific `AGENTS.md` overrides them.

## Project

- This is a private personal invoicing app for one owner only.
- It is not a SaaS app.
- There is only one login/admin user.
- Do not introduce multi-tenant, organization, team, role-management, or public self-signup assumptions unless explicitly requested.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL via Supabase
- Supabase Auth
- Supabase Storage
- Zod
- React Hook Form
- shadcn/ui
- GrapesJS for visual invoice/quotation templates
- Mammoth.js for DOCX import
- pdf-lib for PDF overlay templates and receipts
- Playwright for HTML-to-PDF generation

## Architecture Rules

- Use Prisma for all database access.
- Use Zod validation for all form and server inputs.
- Store money as integer minor units, such as cents.
- Never use floating point math for money.
- Draft invoices, quotations, and receipts must not consume official numbers.
- Invoice numbers reset yearly.
- Quotation numbers reset yearly.
- Receipt numbers reset yearly.
- Numbering happens only when finalizing or generating the official document.
- Receipt template is fixed/simple for MVP.
- Invoice and quotation templates are editable visual templates.
- DOCX uploads are imported into editable HTML templates.
- PDF uploads are used as locked backgrounds with mapped fields.
- Keep business logic out of placeholder pages until the relevant feature is explicitly requested.
- Prefer small, composable React components under `components/`.
- Keep route-level UI in `app/` and shared helpers in `lib/`.
- Use TypeScript for all application code.

## Security

- Never expose Supabase service role keys to the browser.
- Never commit `.env` files.
- Use server-side checks for protected routes.
- Only expose variables prefixed with `NEXT_PUBLIC_` when they are safe for browser use.

## Commands

Run these commands when relevant and when dependencies are available:

```bash
npm run dev
npm run build
npm run lint
npx prisma generate
npx prisma migrate dev
```
