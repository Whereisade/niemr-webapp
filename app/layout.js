import "./globals.css";

export const metadata = { title: "NIEMR", description: "NIEMR Frontend" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white">
          <div className="container h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-600" />
              <span className="font-bold text-xl">NIEMR</span>
            </div>
            <nav className="flex items-center gap-3 text-sm">
              <a className="text-slate-700 hover:text-blue-700" href="/">Home</a>
              <a className="text-slate-700 hover:text-blue-700" href="/login">Login</a>
              <a className="text-slate-700 hover:text-blue-700" href="/register">Register</a>
            </nav>
          </div>
        </header>
        <main className="container py-10">{children}</main>
      </body>
    </html>
  );
}

