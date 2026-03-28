import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupInput,
} from "@/shared/ui/input-group";

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + " " + digits.slice(2);
}

export function stripPhone(formatted: string): string {
  return "+998" + formatted.replace(/\D/g, "");
}

interface PhoneInputProps {
  value: string;
  onChange: (formatted: string) => void;
  id?: string;
  required?: boolean;
  placeholder?: string;
}

export function PhoneInput({
  value,
  onChange,
  id,
  required,
  placeholder,
}: PhoneInputProps) {
  return (
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <InputGroupText>+998</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(formatPhone(e.target.value))}
        required={required}
      />
    </InputGroup>
  );
}
