import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { loginUser } from "@/app/user-actions";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-[0_25px_60px_rgba(54,37,26,0.08)]">
        <p className="shell text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Beta access</p>
        <h1 className="mt-4 text-3xl font-semibold">Sign in</h1>
        {params.error ? (
          <p className="mt-4 rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--foreground)]">
            {decodeURIComponent(params.error)}
          </p>
        ) : null}
        <form action={loginUser} className="mt-6 space-y-4">
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
            Sign in
          </button>
        </form>
        <p className="mt-5 text-sm text-[var(--muted)]">
          Need an account?{" "}
          <Link className="font-medium text-[var(--foreground)] underline" href="/sign-up">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
