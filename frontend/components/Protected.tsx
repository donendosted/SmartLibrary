"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken } from "@/lib/admin-api";
export default function Protected({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const user = getUser();
    if (!getToken() || !user || user.role === "student")
      router.replace("/librarian-login");
  }, [router]);
  return <>{children}</>;
}
