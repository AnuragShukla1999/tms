"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Field } from "@/components/shared/field";
import { PageHeader } from "@/components/shared/page-header";
import { RoleGuard } from "@/components/shared/role-guard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCreateCompany } from "@/features/companies/hooks";
import { createCompanySchema, toCreateCompanyPayload, type CreateCompanyForm } from "@/features/companies/schemas";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

export default function NewCompanyPage() {
  const router = useRouter();
  const create = useCreateCompany();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<CreateCompanyForm>({ resolver: zodResolver(createCompanySchema) });

  function onSubmit(values: CreateCompanyForm) {
    setFormError(null);
    create.mutate(toCreateCompanyPayload(values), {
      onSuccess: (res) => {
        toast.success(`${res.data.name} created. ${res.data.users[0]?.name ?? "The admin"} can now sign in.`);
        router.replace(`/companies/${res.data.id}`);
      },
      onError: (e) => setFormError(getErrorMessage(e)),
    });
  }

  const text = (name: keyof CreateCompanyForm, label: string, opts?: { type?: string; hint?: string; autoComplete?: string }) => (
    <Field label={label} error={errors[name]?.message} hint={opts?.hint}>
      <Input type={opts?.type} autoComplete={opts?.autoComplete ?? "off"} aria-invalid={!!errors[name]} {...register(name)} />
    </Field>
  );

  return (
    <RoleGuard roles={["SUPER_ADMIN"]}>
      <PageHeader title="New company" description="Creates the company and its first admin account in one step." />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {formError && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}

        <Card>
          <CardHeader title="Company details" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {text("name", "Company name *")}
            {text("legalName", "Legal name")}
            {text("gstin", "GSTIN", { hint: "Must be unique across companies." })}
            {text("phone", "Phone", { type: "tel" })}
            {text("email", "Email", { type: "email" })}
            {text("pincode", "Pincode")}
            <div className="sm:col-span-2">{text("address", "Address")}</div>
            {text("city", "City")}
            {text("state", "State")}
          </div>
        </Card>

        <Card>
          <CardHeader title="First admin" description="This person signs in with the email and password below." />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {text("adminName", "Full name *", { autoComplete: "off" })}
            {text("adminPhone", "Phone *", { type: "tel", hint: "Must not be used by another user." })}
            {text("adminEmail", "Email *", { type: "email", hint: "Must not be used by another user." })}
            {text("adminPassword", "Password *", { type: "password", hint: "At least 8 characters.", autoComplete: "new-password" })}
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/companies" className={cn(buttonVariants({ variant: "outline" }))}>Cancel</Link>
          <Button type="submit" loading={create.isPending}>Create company</Button>
        </div>
      </form>
    </RoleGuard>
  );
}
