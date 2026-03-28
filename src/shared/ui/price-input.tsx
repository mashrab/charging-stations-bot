import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupInput,
} from "@/shared/ui/input-group";

function formatPrice(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function stripPrice(formatted: string): number {
  return parseFloat(formatted.replace(/\s/g, "")) || 0;
}

interface PriceInputProps {
  value: string;
  onChange: (formatted: string) => void;
  id?: string;
  required?: boolean;
}

export function PriceInput({ value, onChange, id, required }: PriceInputProps) {
  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(formatPrice(e.target.value))}
        required={required}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText>сўм</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );
}
