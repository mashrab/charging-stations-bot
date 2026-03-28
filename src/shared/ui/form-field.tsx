import { Label } from "@/shared/ui/label";

interface FormFieldProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

export function FormField({ label, description, children, htmlFor }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

interface FormGroupProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function FormGroup({ title, description, children }: FormGroupProps) {
  return (
    <fieldset className="space-y-4">
      <div>
        <legend className="text-sm font-medium">{title}</legend>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </fieldset>
  );
}
