"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Building2, Eye, EyeOff, Lock, Mail, Phone, Truck, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/features/auth/auth.service";
import { getErrorMessage } from "@/lib/errors";
import { useAuthStore } from "@/store/auth.store";

// Mirrors the backend SignupDto.
const schema = z
  .object({
    companyName: z.string().trim().min(1, "Company name is required").max(150),
    name: z.string().trim().min(1, "Your name is required").max(100),
    email: z.string().trim().email("Enter a valid email address"),
    phone: z.string().trim().regex(/^\+?[0-9]{10,14}$/, "Enter a valid phone number"),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type FormValues = z.infer<typeof schema>;

function IconInput({ icon: Icon, ...props }: { icon: typeof Mail } & React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <Input className="h-11 pl-10" {...props} />
    </div>
  );
}

export default function SignupPage() {
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

  async function onSubmit({ confirmPassword: _ignored, ...values }: FormValues) {
    setFormError(null);
    try {
      const res = await authService.signup(values);
      setSession(res);
      toast.success(`Welcome, ${res.user.name.split(" ")[0]}`);
      router.replace("/dashboard");
    } catch (e) {
      setFormError(getErrorMessage(e));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-fg">
            <Truck className="h-4 w-4" aria-hidden />
          </span>
          TMS
        </div>

        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Create your account</h1>
        <p className="mb-8 mt-2 text-sm text-muted">Set up your company and become its admin.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{formError}</span>
            </div>
          )}

          <Field label="Company name" error={errors.companyName?.message}>
            <IconInput
              icon={Building2}
              placeholder="Acme Logistics"
              autoComplete="organization"
              aria-invalid={!!errors.companyName}
              {...register("companyName")}
            />
          </Field>

          <Field label="Your name" error={errors.name?.message}>
            <IconInput
              icon={User}
              placeholder="Full name"
              autoComplete="name"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
          </Field>

          <Field label="Email" error={errors.email?.message}>
            <IconInput
              icon={Mail}
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </Field>

          <Field label="Phone" error={errors.phone?.message}>
            <IconInput
              icon={Phone}
              type="tel"
              placeholder="9876543210"
              autoComplete="tel"
              aria-invalid={!!errors.phone}
              {...register("phone")}
            />
          </Field>

          <Field label="Password" error={errors.password?.message}>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="h-11 px-10"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-ink"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <Field label="Confirm password" error={errors.confirmPassword?.message}>
            <IconInput
              icon={Lock}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
          </Field>

          <Button type="submit" className="h-11 w-full text-[15px]" loading={isSubmitting}>
            {isSubmitting ? "Creating account" : "Sign up"}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-ink underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
