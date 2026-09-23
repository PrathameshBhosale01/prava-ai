import Link from "next/link";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
  },
  {
    name: "My Trips",
    href: "/trips",
  },
  {
    name: "Explore",
    href: "/explore",
  },
  {
    name: "AI Assistant",
    href: "/assistant",
  },
  {
    name: "Expenses",
    href: "/expenses",
  },
  {
    name: "Weather",
    href: "/weather",
  },
  {
    name: "Currency",
    href: "/currency",
  },
];

export default function Sidebar() {
  return (
    <aside className="min-h-[calc(100vh-4rem)] w-64 border-r bg-white p-4">
      <nav className="space-y-2">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-4 py-3 text-sm hover:bg-gray-100"
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}