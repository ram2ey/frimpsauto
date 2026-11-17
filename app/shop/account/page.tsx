import { AccountPanel } from "@/components/account-panel";
import { requireUser } from "@/lib/auth";

export default async function ShopAccount({ searchParams }: { searchParams: Promise<{ error?: string; changed?: string; updated?: string }> }) {
  const user = await requireUser();
  return <AccountPanel user={user} notices={await searchParams} returnTo="/shop/account" />;
}
