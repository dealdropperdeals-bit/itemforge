export default function BillingCancelPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
      <p className="shell text-sm uppercase tracking-[0.24em] text-[var(--muted)]">
        Billing status
      </p>
      <h1 className="text-4xl font-semibold">Subscription checkout canceled.</h1>
      <p className="text-lg leading-8 text-[var(--muted)]">
        Keep the account on the free or pending state and offer a clean retry path from the billing
        page.
      </p>
    </main>
  );
}
