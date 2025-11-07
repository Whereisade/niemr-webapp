export default function HomePage() {
  return (
    <div className="grid gap-8 md:grid-cols-2 items-center">
      <div>
        <h1 className="h1">Electronic Medical Records, simplified.</h1>
        <p className="muted mt-3">
          Appointments, encounters, labs, imaging, pharmacy and billing — secure and fast.
        </p>
        <div className="mt-6 flex gap-3">
          <a href="/login" className="btn btn-primary">Sign in</a>
          <a href="/register" className="btn btn-outline">Create account</a>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <ul className="list-disc ml-6 space-y-2 text-slate-700">
            <li>Audit-ready notes with amend/close/cross-out</li>
            <li>Orders & e-Rx with status tracking</li>
            <li>Secure file uploads & PDF reports</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
