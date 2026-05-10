"use client";

import { useEffect } from "react";
import { useForm, type UseFormReturn, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  ndaDefaults,
  ndaSchema,
  type NdaFormValues,
} from "@/lib/nda-schema";

type Props = {
  onChange: (values: NdaFormValues) => void;
};

export function NdaForm({ onChange }: Props) {
  const form = useForm<NdaFormValues>({
    resolver: zodResolver(ndaSchema),
    defaultValues: ndaDefaults,
    mode: "onBlur",
  });

  // Push initial defaults and every subsequent change up to the parent.
  const { watch } = form;
  useEffect(() => {
    onChange(form.getValues());
    const sub = watch((values) => onChange(values as NdaFormValues));
    return () => sub.unsubscribe();
  }, [watch, form, onChange]);

  const mndaTermType = form.watch("mndaTerm.type");
  const confType = form.watch("confidentialityTerm.type");

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <Card>
        <CardHeader>
          <CardTitle>Agreement details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            form={form}
            name="purpose"
            label="Purpose"
            description="How Confidential Information may be used."
          >
            <Textarea rows={3} {...form.register("purpose")} />
          </Field>
          <Field form={form} name="effectiveDate" label="Effective date">
            <Input type="date" {...form.register("effectiveDate")} />
          </Field>

          <fieldset className="space-y-2">
            <Label>MNDA term</Label>
            <RadioGroup
              value={mndaTermType}
              onValueChange={(v) => {
                if (v === "expires") {
                  form.setValue("mndaTerm", { type: "expires", years: 1 });
                } else {
                  form.setValue("mndaTerm", { type: "untilTerminated" });
                }
              }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="expires" id="mnda-expires" />
                <Label htmlFor="mnda-expires" className="font-normal">
                  Expires
                </Label>
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  disabled={mndaTermType !== "expires"}
                  {...form.register("mndaTerm.years")}
                />
                <span className="text-sm text-muted-foreground">
                  year(s) from effective date
                </span>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="untilTerminated" id="mnda-terminated" />
                <Label htmlFor="mnda-terminated" className="font-normal">
                  Continues until terminated
                </Label>
              </div>
            </RadioGroup>
          </fieldset>

          <fieldset className="space-y-2">
            <Label>Term of confidentiality</Label>
            <RadioGroup
              value={confType}
              onValueChange={(v) => {
                if (v === "years") {
                  form.setValue("confidentialityTerm", {
                    type: "years",
                    years: 1,
                  });
                } else {
                  form.setValue("confidentialityTerm", { type: "perpetuity" });
                }
              }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="years" id="conf-years" />
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  disabled={confType !== "years"}
                  {...form.register("confidentialityTerm.years")}
                />
                <Label htmlFor="conf-years" className="font-normal">
                  year(s) (trade secrets continue per applicable law)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="perpetuity" id="conf-perpetuity" />
                <Label htmlFor="conf-perpetuity" className="font-normal">
                  In perpetuity
                </Label>
              </div>
            </RadioGroup>
          </fieldset>

          <Field form={form} name="governingLaw" label="Governing law (state)">
            <Input
              placeholder="Delaware"
              {...form.register("governingLaw")}
            />
          </Field>
          <Field form={form} name="jurisdiction" label="Jurisdiction">
            <Input
              placeholder="courts located in New Castle, DE"
              {...form.register("jurisdiction")}
            />
          </Field>
          <Field
            form={form}
            name="modifications"
            label="MNDA modifications"
            description="Optional. Any changes to the standard terms."
          >
            <Textarea rows={2} {...form.register("modifications")} />
          </Field>
        </CardContent>
      </Card>

      <PartyCard form={form} party="party1" title="Party 1" />
      <PartyCard form={form} party="party2" title="Party 2" />
    </form>
  );
}

function PartyCard({
  form,
  party,
  title,
}: {
  form: UseFormReturn<NdaFormValues>;
  party: "party1" | "party2";
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field form={form} name={`${party}.company` as const} label="Company">
          <Input {...form.register(`${party}.company` as const)} />
        </Field>
        <Field
          form={form}
          name={`${party}.signatory` as const}
          label="Signatory name"
        >
          <Input {...form.register(`${party}.signatory` as const)} />
        </Field>
        <Field form={form} name={`${party}.title` as const} label="Title">
          <Input {...form.register(`${party}.title` as const)} />
        </Field>
        <Field
          form={form}
          name={`${party}.noticeAddress` as const}
          label="Notice address"
          description="Email or postal address."
        >
          <Textarea
            rows={2}
            {...form.register(`${party}.noticeAddress` as const)}
          />
        </Field>
      </CardContent>
    </Card>
  );
}

function Field({
  form,
  name,
  label,
  description,
  children,
}: {
  form: UseFormReturn<NdaFormValues>;
  name: Path<NdaFormValues>;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  const error = getNestedError(form.formState.errors, name);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function getNestedError(
  errors: Record<string, unknown>,
  path: string,
): string | undefined {
  const node = path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined,
      errors,
    );
  if (node && typeof node === "object" && "message" in node) {
    const msg = (node as { message?: unknown }).message;
    return typeof msg === "string" ? msg : undefined;
  }
  return undefined;
}
