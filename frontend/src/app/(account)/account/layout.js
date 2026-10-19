import { SideNav } from '@/components/layout/SideNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { accountNav } from '@/lib/navigation';

export const metadata = {
  title: { default: 'My account', template: '%s | My account' },
  robots: { index: false, follow: false },
};

// Customer account area. The Auth module adds a session check that redirects guests to /login;
// the API independently rejects unauthenticated requests, so this guard is for UX only.
export default function AccountLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row lg:px-8">
        <aside className="md:w-56 md:shrink-0">
          <SideNav items={accountNav} label="Account" />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <SiteFooter />
    </div>
  );
}
