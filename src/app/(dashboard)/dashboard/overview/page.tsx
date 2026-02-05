/**
 * Dashboard Overview page - /dashboard/overview
 * Server Component by default - can fetch data directly
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { Users, Package, ShoppingCart, DollarSign } from 'lucide-react';

export const metadata = {
  title: 'Dashboard Overview',
  description: 'Overview of your admin portal',
};

// This is a Server Component - it can be async and fetch data directly
export default async function DashboardOverviewPage() {
  // TODO: Fetch real data from database
  const stats = [
    {
      title: 'Total Users',
      value: '1,234',
      icon: Users,
      change: '+12.5%',
    },
    {
      title: 'Total Products',
      value: '456',
      icon: Package,
      change: '+5.2%',
    },
    {
      title: 'Total Orders',
      value: '789',
      icon: ShoppingCart,
      change: '+8.1%',
    },
    {
      title: 'Revenue',
      value: '$12,345',
      icon: DollarSign,
      change: '+15.3%',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Overview of your admin portal metrics and statistics"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Orders will appear here
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Users will appear here
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
