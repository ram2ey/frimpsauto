import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma/client";
import { currentUser } from "@/lib/auth";

export default async function Home() {
  const user = await currentUser();
  redirect(
    user
      ? user.mustChangePassword
        ? "/change-password"
        : user.role === Role.SHOP_STAFF
        ? "/shop"
        : "/dashboard"
      : "/login"
  );
}
