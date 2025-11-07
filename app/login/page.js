export default function LoginChooser() {
  const cards = [
    { href: "/login/facility", title: "Hospital / Facility" },
    { href: "/login/provider", title: "Independent Provider" },
    { href: "/login/patient",  title: "Patient" },
  ];
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {cards.map((c) => (
        <a key={c.href} href={c.href} className="card hover:shadow-lg transition">
          <div className="card-body">
            <div className="text-xs uppercase tracking-wide text-blue-700 font-semibold">NIEMR</div>
            <h3 className="h2 mt-1">{c.title}</h3>
            <p className="muted">Sign in to continue.</p>
          </div>
        </a>
      ))}
    </div>
  );
}
