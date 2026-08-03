import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function TextField({
  label,
  required,
  value,
  onChange,
  type = "text",
  placeholder,
  className,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Field label={label} required={required} className={className}>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  className?: string;
}) {
  return (
    <Field label={label} className={className}>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
      />
    </Field>
  );
}

export function CurrencyField({
  label,
  required,
  value,
  onChange,
  className,
}: {
  label: string;
  required?: boolean;
  value: number | null;
  onChange: (v: number | null) => void;
  className?: string;
}) {
  return (
    <Field label={`${label} (R$)`} required={required} className={className}>
      <Input
        type="number"
        step="0.01"
        min="0"
        value={value ?? ""}
        placeholder="0,00"
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
      />
    </Field>
  );
}

export function DateField({
  label,
  required,
  value,
  onChange,
  className,
}: {
  label: string;
  required?: boolean;
  value: string | null;
  onChange: (v: string | null) => void;
  className?: string;
}) {
  return (
    <Field label={label} required={required} className={className}>
      <Input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </Field>
  );
}

export function SelectField({
  label,
  required,
  value,
  onChange,
  options,
  placeholder = "Selecione",
  allowEmpty,
  className,
}: {
  label: string;
  required?: boolean;
  value: string | null;
  onChange: (v: string | null) => void;
  options: ReadonlyArray<string | { value: string; label: string }>;
  placeholder?: string;
  allowEmpty?: boolean;
  className?: string;
}) {
  const opts = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  return (
    <Field label={label} required={required} className={className}>
      <Select
        value={value ?? "__none"}
        onValueChange={(v) => onChange(v === "__none" ? null : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {(allowEmpty || !required) && (
            <SelectItem value="__none">— Nenhum —</SelectItem>
          )}
          {opts.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function TextareaField({
  label,
  required,
  value,
  onChange,
  className,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <Field label={label} required={required} className={className}>
      <Textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
