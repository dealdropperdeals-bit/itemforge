import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { registerUser } from "@/app/user-actions";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SignUpPage({ searchParams }: Props) {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-[0_25px_60px_rgba(54,37,26,0.08)]">
        <p className="shell text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Beta access</p>
        <h1 className="mt-4 text-3xl font-semibold">Create your account</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          Launch default: new accounts activate immediately so the beta stays fast and simple.
        </p>
        {params.error ? (
          <p className="mt-4 rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--foreground)]">
            {decodeURIComponent(params.error)}
          </p>
        ) : null}
        <form action={registerUser} className="mt-6 space-y-4">
          <input
            name="name"
            type="text"
            placeholder="Name"
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
            required
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
            minLength={8}
            required
          />
          <button
            type="submit"
            className="w-full rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white"
          >
            Create account
          </button>
        </form>
        <p className="mt-5 text-sm text-[var(--muted)]">
          Already have access?{" "}
          <Link className="font-medium text-[var(--foreground)] underline" href="/sign-in">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
