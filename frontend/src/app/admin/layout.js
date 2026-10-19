import Link from 'next/link';
import { SideNav } from '@/components/layout/SideNav';
import { adminNav } from '@/lib/navigation';
import { siteConfig } from '@/lib/site';

export const metadata = {
  title: { default: 'Admin', template: `%s | ${siteConfig.name} Admin` },
  robots: { index: false, follow: false },
};

// Admin dashboard shell. The Auth module adds a role check that redirects non-admins;
// every admin API route is independently protected by server-side role authorization.
export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 md:flex-row">
      <aside className="border-b border-neutral-200 bg-white p-4 md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <Link href="/admin" className="mb-6 block px-3 text-lg font-semibold text-brand-700">
          {siteConfig.name} Admin
        </Link>
        <SideNav items={adminNav} label="Admin" />
      </aside>
      <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
