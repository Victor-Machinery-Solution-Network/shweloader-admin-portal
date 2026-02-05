/**
 * Users list page - /users
 * Example of data fetching pattern in Server Component
 */

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Users',
  description: 'Manage users',
};

// This is a Server Component - it can be async
export default async function UsersPage() {
  // TODO: Fetch users from database
  // const users = await db.user.findMany();

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage all users in the system"
      >
        <Button asChild>
          <Link href="/users/new">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Link>
        </Button>
      </PageHeader>

      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        <p>User table will be implemented here</p>
        <p className="text-sm mt-2">
          Connect your database and fetch users to display them
        </p>
      </div>
    </div>
  );
}
