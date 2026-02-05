/**
 * Dashboard Analytics page - /dashboard/analytics
 * Server Component by default - can fetch data directly
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { BarChart, TrendingUp, Activity, PieChart } from 'lucide-react';

export const metadata = {
  title: 'Dashboard Analytics',
  description: 'Analytics and insights for your admin portal',
};

// This is a Server Component - it can be async and fetch data directly
export default async function DashboardAnalyticsPage() {
  // TODO: Fetch real data from database
  const analytics = [
    {
      title: 'Total Visitors',
      value: '24,567',
      icon: Activity,
      change: '+18.2%',
    },
    {
      title: 'Conversion Rate',
      value: '3.24%',
      icon: TrendingUp,
      change: '+2.1%',
    },
    {
      title: 'Sales Growth',
      value: '12.5%',
      icon: BarChart,
      change: '+4.3%',
    },
    {
      title: 'Customer Retention',
      value: '89.2%',
      icon: PieChart,
      change: '+1.2%',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Detailed analytics and insights for your dashboard"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {analytics.map((stat) => (
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
                {stat.change} from last period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Analytics charts and graphs will appear here
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
