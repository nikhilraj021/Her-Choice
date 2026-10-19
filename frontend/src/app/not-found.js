import Link from 'next/link';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">Page not found</h1>
      <p className="mt-4 text-neutral-600">The page you are looking for does not exist or has moved.</p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
      >
        Back to home
      </Link>
    </main>
  );
}
