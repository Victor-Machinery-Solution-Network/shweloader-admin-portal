/**
 * Analytics page - /analytics
 * Server Component by default - can fetch data directly
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { BarChart, LineChart, PieChart, TrendingUp } from 'lucide-react';

export const metadata = {
  title: 'Analytics',
  description: 'Comprehensive analytics and reporting',
};

// This is a Server Component - it can be async and fetch data directly
export default async function AnalyticsPage() {
  // TODO: Fetch real data from database
  const reports = [
    {
      title: 'Monthly Revenue',
      value: '$45,231',
      icon: BarChart,
      change: '+12.5%',
    },
    {
      title: 'Active Users',
      value: '2,350',
      icon: LineChart,
      change: '+7.2%',
    },
    {
      title: 'Market Share',
      value: '23.5%',
      icon: PieChart,
      change: '+3.1%',
    },
    {
      title: 'Growth Rate',
      value: '18.9%',
      icon: TrendingUp,
      change: '+5.4%',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Comprehensive analytics and reporting for your business"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {reports.map((stat) => (
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

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Revenue analytics will appear here
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              User engagement metrics will appear here
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Detailed Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Comprehensive reports and data visualizations will appear here
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
