export default function BillingSuccessPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
      <p className="shell text-sm uppercase tracking-[0.24em] text-[var(--muted)]">
        Billing status
      </p>
      <h1 className="text-4xl font-semibold">Subscription approval received.</h1>
      <p className="text-lg leading-8 text-[var(--muted)]">
        The next step is webhook reconciliation. Keep the user in a pending paid state until the
        server confirms the subscription directly with PayPal.
      </p>
    </main>
  );
}
