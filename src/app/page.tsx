export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-10 lg:px-10">
      <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-[0_30px_80px_rgba(54,37,26,0.12)] backdrop-blur">
        <div className="grid gap-8 px-8 py-10 lg:grid-cols-[1.4fr_0.9fr] lg:px-10 lg:py-12">
          <div className="space-y-6">
            <p className="shell text-sm uppercase tracking-[0.28em] text-[var(--muted)]">
              12-hour beta launch console
            </p>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
                Single-product SaaS for ideas, job specs, handoff, and POD-ready case workflows.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
                One Next.js app. One Postgres database. Membership tiers with credits. User-owned
                Printify connections. Server-side billing, provider calls, and AI usage only.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/sign-up"
                className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white"
              >
                Create beta account
              </a>
              <a
                href="/dashboard"
                className="rounded-full border border-[var(--border)] px-5 py-3 text-sm font-medium"
              >
                Open dashboard
              </a>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
                Fastest route to live
              </span>
              <span className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)]">
                Privacy-conscious
              </span>
              <span className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)]">
                Printify-first
              </span>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--card-strong)] p-6">
            <p className="shell text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
              Launch defaults
            </p>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-[var(--muted)]">App stack</dt>
                <dd className="text-right font-medium">Next.js 16 + Prisma + Postgres</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-[var(--muted)]">Billing</dt>
                <dd className="text-right font-medium">PayPal subscriptions + credit packs</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-[var(--muted)]">POD provider</dt>
                <dd className="text-right font-medium">Printify via user PAT + shop ID</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-[var(--muted)]">Usage model</dt>
                <dd className="text-right font-medium">Credits included in every membership</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-[var(--muted)]">Deployment</dt>
                <dd className="text-right font-medium">Docker + Caddy + VPS</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {[
          {
            title: "Launch MVP",
            body: "Auth, membership billing, credits, user Printify connection, curated item allowlist, job specs, and prep/export.",
          },
          {
            title: "Key constraint",
            body: "Launch with user-supplied Printify token and shop ID. Postpone full OAuth until after beta.",
          },
          {
            title: "Safe AI path",
            body: "Ship AI inside the product and charge simple fixed credits per generation. Postpone granular token billing.",
          },
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_20px_50px_rgba(54,37,26,0.08)]"
          >
            <h2 className="text-xl font-semibold">{item.title}</h2>
            <p className="mt-3 text-base leading-7 text-[var(--muted)]">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6">
          <p className="shell text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
            Execution order
          </p>
          <ol className="mt-5 space-y-4 text-sm leading-7">
            <li>1. Configure Postgres, auth secret, PayPal, Printify sync token, and domain env vars.</li>
            <li>2. Push schema, seed plans and packs, run catalog sync, and confirm `/api/health` is green.</li>
            <li>3. Validate signup, login, and admin bootstrap.</li>
            <li>4. Wire membership checkout, webhook reconciliation, and monthly credit posting.</li>
            <li>5. Save and validate user Printify token plus `shop_id`.</li>
            <li>6. Upload artwork and prepare exports for the curated allowlist items.</li>
            <li>7. Use credits for AI idea and job spec generation.</li>
            <li>8. Deploy to the VPS, point DNS, enable TLS, test webhooks, then open beta.</li>
          </ol>
        </article>

        <article className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card-strong)] p-6">
          <p className="shell text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
            Repo map
          </p>
          <ul className="mt-5 space-y-3 text-sm leading-7">
            <li><span className="shell">prisma/</span> data model, plans, device seed data</li>
            <li><span className="shell">src/auth.ts</span> Auth.js credentials setup</li>
            <li><span className="shell">src/lib/</span> billing, provider, entitlements, env helpers</li>
            <li><span className="shell">src/app/api/</span> health, billing, webhooks, provider endpoints</li>
            <li><span className="shell">scripts/</span> admin bootstrap and daily Printify sync</li>
            <li><span className="shell">docs/launch-blueprint.md</span> launch decisions and 12-hour runbook</li>
            <li><span className="shell">Dockerfile</span> and <span className="shell">docker-compose.yml</span> VPS deployment baseline</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
