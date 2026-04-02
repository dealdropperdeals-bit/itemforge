import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { saveLaunchSettingsAction } from "@/app/admin/launch-settings/server-actions";
import { getLaunchSettingsForAdmin } from "@/lib/runtime-settings";

function booleanFromParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] === "1";
  }

  return value === "1";
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LaunchSettingsPage({ searchParams }: Props) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard?error=Admin%20access%20required");
  }

  const [params, settings] = await Promise.all([searchParams, getLaunchSettingsForAdmin()]);
  const saved = booleanFromParam(params.saved);
  const errorParam = Array.isArray(params.error) ? params.error[0] : params.error;
  const error = errorParam ? decodeURIComponent(errorParam) : "";

  return (
    <main className="relative min-h-screen px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_28%),linear-gradient(180deg,#030816_0%,#08101d_52%,#050913_100%)]" />
      <section className="master-panel relative mx-auto w-full max-w-5xl rounded-[24px] p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Admin</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Launch settings</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
              One place to configure payments, plans, credits, and provider keys. Secrets are encrypted at rest.
            </p>
          </div>
          <Link href="/dashboard" className="secondary-action">
            Back to dashboard
          </Link>
        </div>

        {saved ? (
          <div className="mb-5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Launch settings saved and catalog sync completed.
          </div>
        ) : null}
        {error ? (
          <div className="mb-5 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <form action={saveLaunchSettingsAction} className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Core</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">App URL</span>
                <input name="appUrl" defaultValue={settings.appUrl} className="field-dark" required />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">OpenAI model</span>
                <input name="openAiModel" defaultValue={settings.openAiModel} className="field-dark" required />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-sm text-[var(--muted)]">
                  OpenAI API key {settings.secretsConfigured.openAiApiKey ? "(configured)" : "(missing)"}
                </span>
                <input name="openAiApiKey" type="password" className="field-dark" placeholder="Leave blank to keep current" />
              </label>
            </div>
          </section>

          <section className="space-y-3 border-t border-[var(--divider)] pt-6">
            <h2 className="text-lg font-semibold text-white">PayPal</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">Environment</span>
                <select name="paypalEnv" defaultValue={settings.paypalEnv} className="field-dark">
                  <option value="sandbox">sandbox</option>
                  <option value="live">live</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">PayPal client ID</span>
                <input name="paypalClientId" defaultValue={settings.paypalClientId} className="field-dark" required />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-sm text-[var(--muted)]">
                  PayPal client secret {settings.secretsConfigured.paypalClientSecret ? "(configured)" : "(missing)"}
                </span>
                <input name="paypalClientSecret" type="password" className="field-dark" placeholder="Leave blank to keep current" />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-sm text-[var(--muted)]">PayPal webhook ID</span>
                <input name="paypalWebhookId" defaultValue={settings.paypalWebhookId} className="field-dark" />
              </label>
            </div>
          </section>

          <section className="space-y-3 border-t border-[var(--divider)] pt-6">
            <h2 className="text-lg font-semibold text-white">Beta plans</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">Starter plan ID</span>
                <input name="paypalPlanStarter" defaultValue={settings.paypalPlanStarter} className="field-dark" />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">Creator plan ID</span>
                <input name="paypalPlanCreator" defaultValue={settings.paypalPlanCreator} className="field-dark" />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">Pro plan ID</span>
                <input name="paypalPlanPro" defaultValue={settings.paypalPlanPro} className="field-dark" />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">Starter $/month</span>
                <input name="starterPriceDollars" type="number" min="0" step="0.01" defaultValue={(settings.starterPriceCents / 100).toFixed(2)} className="field-dark" required />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">Creator $/month</span>
                <input name="creatorPriceDollars" type="number" min="0" step="0.01" defaultValue={(settings.creatorPriceCents / 100).toFixed(2)} className="field-dark" required />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">Pro $/month</span>
                <input name="proPriceDollars" type="number" min="0" step="0.01" defaultValue={(settings.proPriceCents / 100).toFixed(2)} className="field-dark" required />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">Starter credits</span>
                <input name="starterCredits" type="number" min="0" step="1" defaultValue={settings.starterCredits} className="field-dark" required />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">Creator credits</span>
                <input name="creatorCredits" type="number" min="0" step="1" defaultValue={settings.creatorCredits} className="field-dark" required />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">Pro credits</span>
                <input name="proCredits" type="number" min="0" step="1" defaultValue={settings.proCredits} className="field-dark" required />
              </label>
            </div>
          </section>

          <section className="space-y-3 border-t border-[var(--divider)] pt-6">
            <h2 className="text-lg font-semibold text-white">Beta credit packs</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">Pack 100 ID</span>
                <input name="paypalCreditPack100" defaultValue={settings.paypalCreditPack100} className="field-dark" />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">Pack 250 ID</span>
                <input name="paypalCreditPack250" defaultValue={settings.paypalCreditPack250} className="field-dark" />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">Pack 600 ID</span>
                <input name="paypalCreditPack600" defaultValue={settings.paypalCreditPack600} className="field-dark" />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">100 credits $</span>
                <input name="creditPack100PriceDollars" type="number" min="0" step="0.01" defaultValue={(settings.creditPack100PriceCents / 100).toFixed(2)} className="field-dark" required />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">250 credits $</span>
                <input name="creditPack250PriceDollars" type="number" min="0" step="0.01" defaultValue={(settings.creditPack250PriceCents / 100).toFixed(2)} className="field-dark" required />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">600 credits $</span>
                <input name="creditPack600PriceDollars" type="number" min="0" step="0.01" defaultValue={(settings.creditPack600PriceCents / 100).toFixed(2)} className="field-dark" required />
              </label>
            </div>
          </section>

          <section className="space-y-3 border-t border-[var(--divider)] pt-6">
            <h2 className="text-lg font-semibold text-white">Stripe (optional now)</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl border border-[var(--divider)] bg-white/[0.02] px-4 py-3 text-sm text-slate-200">
                <input name="stripeEnabled" type="checkbox" defaultChecked={settings.stripeEnabled} />
                Enable Stripe checkout (future-ready toggle)
              </label>
              <div />
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">
                  Stripe secret key {settings.secretsConfigured.stripeSecretKey ? "(configured)" : "(missing)"}
                </span>
                <input name="stripeSecretKey" type="password" className="field-dark" placeholder="Leave blank to keep current" />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">
                  Stripe webhook secret {settings.secretsConfigured.stripeWebhookSecret ? "(configured)" : "(missing)"}
                </span>
                <input name="stripeWebhookSecret" type="password" className="field-dark" placeholder="Leave blank to keep current" />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">Stripe Starter price ID</span>
                <input name="stripePriceStarter" defaultValue={settings.stripePriceStarter} className="field-dark" />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">Stripe Creator price ID</span>
                <input name="stripePriceCreator" defaultValue={settings.stripePriceCreator} className="field-dark" />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">Stripe Pro price ID</span>
                <input name="stripePricePro" defaultValue={settings.stripePricePro} className="field-dark" />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">Stripe pack 100 price ID</span>
                <input name="stripeCreditPack100" defaultValue={settings.stripeCreditPack100} className="field-dark" />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">Stripe pack 300 price ID</span>
                <input name="stripeCreditPack300" defaultValue={settings.stripeCreditPack300} className="field-dark" />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[var(--muted)]">Stripe pack 800 price ID</span>
                <input name="stripeCreditPack800" defaultValue={settings.stripeCreditPack800} className="field-dark" />
              </label>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--divider)] pt-6">
            <button type="submit" className="primary-action">
              Save launch settings
            </button>
            <p className="text-sm text-[var(--muted)]">Saving also syncs active plans and credit packs in the database.</p>
          </div>
        </form>
      </section>
    </main>
  );
}
