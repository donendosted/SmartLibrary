"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/admin-api";
const links = [
  ["Dashboard", "/admin"],
  ["Inventory", "/admin/inventory"],
  ["Users", "/admin/users"],
  ["Transactions", "/admin/transactions"],
  ["Holds", "/admin/holds"],
  ["Reports", "/admin/reports"],
  ["Settings", "/admin/settings"],
];
export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname(),
    router = useRouter();
  return (
    <div className="admin-shell">
      <aside>
        <Link className="admin-brand" href="/admin">
          Smart Library<span>ADMIN</span>
        </Link>
        <nav>
          {links.map(([name, href]) => (
            <Link
              className={path === href ? "active" : ""}
              key={href}
              href={href}
            >
              {name}
            </Link>
          ))}
        </nav>
        <button
          className="signout"
          onClick={() => {
            signOut();
            document.cookie =
              "library_admin_session=; Path=/; Max-Age=0; SameSite=Lax";
            router.push("/librarian-login");
          }}
        >
          Sign out
        </button>
      </aside>
      <main>{children}</main>
    </div>
  );
}
