import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 space-y-3 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
            Private workspace
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Sign in</h1>
          <p className="text-sm leading-6 text-slate-600">
            Access is restricted to the single owner/admin account configured in Supabase Auth.
          </p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
