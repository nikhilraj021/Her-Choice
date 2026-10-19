import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Overview' };

export default function AccountOverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">My account</h1>
      <EmptyState
        className="mt-6"
        title="Your account"
        description="Profile, addresses, orders and wishlist will appear here once you sign in."
      />
    </div>
  );
}
