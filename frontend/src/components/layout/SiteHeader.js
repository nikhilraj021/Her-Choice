import Link from 'next/link';
import { siteConfig } from '@/config/site';

export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-semibold tracking-tight text-brand-700">
          {siteConfig.name}
        </Link>
      </div>
    </header>
  );
}
