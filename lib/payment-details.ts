type PaymentProfile = {
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankBranch?: string | null;
  momoNumber?: string | null;
  momoName?: string | null;
} | null | undefined;

export type PaymentMethod = { title: string; lines: { label: string; value: string }[] };

/** Payment methods to print on an invoice. A method is left out when its number is not set. */
export function paymentMethods(profile: PaymentProfile): PaymentMethod[] {
  if (!profile) return [];
  const methods: PaymentMethod[] = [];
  if (profile.bankAccountNumber) {
    methods.push({
      title: `Bank transfer${profile.bankName ? ` · ${profile.bankName}` : ""}`,
      lines: [
        ...(profile.bankAccountName ? [{ label: "Account name", value: profile.bankAccountName }] : []),
        { label: "Account number", value: profile.bankAccountNumber },
        ...(profile.bankBranch ? [{ label: "Branch", value: profile.bankBranch }] : []),
      ],
    });
  }
  if (profile.momoNumber) {
    methods.push({
      title: "MTN Mobile Money",
      lines: [
        { label: "Number", value: profile.momoNumber },
        ...(profile.momoName ? [{ label: "Name", value: profile.momoName }] : []),
      ],
    });
  }
  return methods;
}
