import Link from 'next/link';

// Rendered inside the admin shell when an admin page calls notFound() (e.g. unknown order ID).
// Unmatched /admin/* URLs fall through to the root not-found page with a proper 404 status.
export default function AdminNotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900">Not found</h1>
      <p className="mt-2 text-neutral-600">This admin page or record does not exist.</p>
      <Link href="/admin" className="mt-6 inline-block text-sm font-medium text-brand-700 hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
