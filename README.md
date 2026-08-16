> # ⏸️ ALPHABRIEF IS PAUSED — since 2026-08-16
>
> The site is still live at alphabrief.io and the database is intact, but **nothing runs
> automatically and nothing spends money.** Vercel crons are deregistered and the `PAUSED` env var
> short-circuits every route that would spend Anthropic tokens or send email.
>
> 👉 **Full details and the resume procedure: [`PAUSED.md`](./PAUSED.md)**
>
> Resuming takes two steps — clear the `PAUSED` env var in Vercel, then restore the `crons` array
> in `vercel.json`. Both are described in `PAUSED.md`. Don't do one without the other.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
