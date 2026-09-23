export default function Navbar() {
  return (
    <header className="h-16 border-b bg-white">
      <div className="flex h-full items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-bold">
            Prava AI
          </h1>
        </div>

        <div>
          <button className="rounded-lg border px-4 py-2 text-sm">
            Profile
          </button>
        </div>
      </div>
    </header>
  );
}