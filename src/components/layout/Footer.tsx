export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#232A3F]">
      <div className="mx-auto flex max-w-4xl flex-col gap-2 px-4 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-medium text-slate-200">
          TapShare — Share Anything. Anywhere. Instantly.
        </p>
        <p>
          Anyone with a 5-digit link can access the shared item until it expires or is deleted.
        </p>
      </div>
    </footer>
  );
}
