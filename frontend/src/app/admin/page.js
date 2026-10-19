import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Dashboard' };

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Dashboard</h1>
      <EmptyState
        className="mt-6 bg-white"
        title="No metrics yet"
        description="Sales, orders, inventory and customer metrics will appear here once the analytics module is connected."
      />
    </div>
  );
}
