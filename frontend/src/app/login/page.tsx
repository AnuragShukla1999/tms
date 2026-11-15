"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, Lock, Mail, Truck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RouteMap } from "@/components/auth/route-map";
import { authService } from "@/features/auth/auth.service";
import { getErrorMessage } from "@/lib/errors";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";

// Mirrors LoginDto: valid email, password of at least 8 characters.

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

function ExpiredNotice() {
  const expired = useSearchParams().get("reason") === "expired";
  return expired ? (
    <p
      role="status"
      className="mb-5 rounded-lg border border-line bg-sunken px-3.5 py-2.5 text-sm text-muted"
    >
      Your session ended. Sign in again to continue.
    </p>
  ) : null;
}

export default function LoginPage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const setSession = useAuthStore((s) => s.setSession);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const res = await authService.login(values);
      setSession(res);
      // toast.success(`Welcome back, ${res.user.name.split(" ")[0]}`);
      toast.success(`Welcome back, ${res.user.name.split(" ")[0]}`, {
        duration: 6000,
        closeButton: true,
      });
      router.replace("/dashboard");
    } catch (e) {
      setFormError(getErrorMessage(e));
    }
  }

  return (
    <main className="grid min-h-screen bg-bg lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="relative hidden overflow-hidden bg-brand text-brand-fg lg:block">
        <RouteMap />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-fg/15">
              <Truck className="h-5 w-5" aria-hidden />
            </span>
            TMS
          </div>
          <div className="max-w-md">
            <h2 className="text-4xl font-semibold leading-[1.15] tracking-tight">
              Every load, every route, one place.
            </h2>
            <p className="mt-4 text-base leading-relaxed opacity-75">
              Plan trips, manage your fleet and keep billing in step, from one
              workspace for your whole team.
            </p>
          </div>
          <p className="text-sm opacity-60">Transportation management system</p>
        </div>
      </section>

      <section className="flex flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center gap-2 font-semibold tracking-tight lg:hidden">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-fg">
            <Truck className="h-4 w-4" aria-hidden />
          </span>
          TMS
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-100">
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight">
              Sign in
            </h1>
            <p className="mb-8 mt-2 text-sm text-muted">
              Use the email and password your company admin gave you.
            </p>

            <Suspense>
              <ExpiredNotice />
            </Suspense>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
              noValidate
            >
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-danger"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden
                  />
                  <span>{formError}</span>
                </div>
              )}

              <Field label="Email" error={errors.email?.message}>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                    aria-hidden
                  />
                  <Input
                    type="email"
                    autoComplete="username"
                    placeholder="you@company.com"
                    className="h-11 pl-10"
                    aria-invalid={!!errors.email}
                    {...register("email")}
                  />
                </div>
              </Field>

              <Field label="Password" error={errors.password?.message}>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                    aria-hidden
                  />
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="h-11 px-10"
                    aria-invalid={!!errors.password}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-ink"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>

              <Button
                type="submit"
                className="h-11 w-full text-[15px]"
                loading={isSubmitting}
              >
                {isSubmitting ? "Signing in" : "Sign in"}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-muted">
              New here?{" "}
              <Link
                href="/signup"
                className="font-medium text-ink underline-offset-4 hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
