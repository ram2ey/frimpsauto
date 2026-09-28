export function money(cents: number) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(cents / 100);
}

export function date(value: Date | string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "—";
}

export function amountFromForm(value: FormDataEntryValue | null) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || !/^\d+(\.\d{1,2})?$/.test(String(value))) {
    throw new Error("Enter a valid amount with up to two decimal places.");
  }
  const cents = Math.round(number * 100);
  if (!Number.isSafeInteger(cents)) throw new Error("Amount is too large.");
  return cents;
}

export function positiveInt(value: FormDataEntryValue | null, label: string) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error(`${label} must be a positive whole number.`);
  return number;
}

export function text(value: FormDataEntryValue | null, label: string, max = 500) {
  const result = String(value ?? "").trim();
  if (!result || result.length > max) throw new Error(`${label} is required (maximum ${max} characters).`);
  return result;
}
