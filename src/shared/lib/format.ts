export function formatMoney(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const months = [
  "январ", "феврал", "март", "апрел", "май", "июн",
  "июл", "август", "сентябр", "октябр", "ноябр", "декабр",
];

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // 998901234567 -> +998 90 123 45 67
  if (digits.length === 12 && digits.startsWith("998")) {
    return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  return phone;
}

export function formatDateUz(dateStr: string): string {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  if (dateStr === today) return "Бугун";
  if (dateStr === tomorrow) return "Эртага";

  const d = new Date(dateStr);
  return `${d.getDate()}-${months[d.getMonth()]}, ${d.getFullYear()}`;
}
