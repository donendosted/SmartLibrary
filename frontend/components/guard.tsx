"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { tokenPayload } from "@/lib/api";
export function Guard({ children }: { children: React.ReactNode }) {
  const r = useRouter();
  useEffect(() => {
    if (!tokenPayload()) r.replace("/login");
  }, [r]);
  return <>{children}</>;
}
