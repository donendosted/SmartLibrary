"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
const links = [
  ["/", "Home"],
  ["/my-books", "My Books"],
  ["/books", "Discover"],
  ["/holds", "Holds"],
  ["/notifications", "Alerts"],
  ["/account", "Account"],
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    router = useRouter();
  const logout = () => {
    localStorage.removeItem("library_token");
    router.push("/login");
  };
  return (
    <div className="shell">
      <header>
        <Link href="/" className="brand">
          ▣ Smart Library
        </Link>
        <button className="text-button" onClick={logout}>
          Log out
        </button>
      </header>
      <nav aria-label="Main navigation">
        {links.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={path === href ? "active" : ""}
          >
            {label}
          </Link>
        ))}
      </nav>
      <main className="page">{children}</main>
    </div>
  );
}
