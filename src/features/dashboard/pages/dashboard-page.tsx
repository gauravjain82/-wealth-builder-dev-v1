import { useAuth } from '@/features/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/components';
import { Heading, Text } from '@shared/components/ui';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h1">Dashboard</Heading>
        <Text variant="muted">
          Welcome back, {user?.displayName || user?.email}!
        </Text>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Team Size</CardTitle>
            <CardDescription>Total members in your network</CardDescription>
          </CardHeader>
          <CardContent>
            <Text as="div" variant="body" weight="bold" className="text-4xl">0</Text>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Events Attended</CardTitle>
            <CardDescription>Events you've participated in</CardDescription>
          </CardHeader>
          <CardContent>
            <Text as="div" variant="body" weight="bold" className="text-4xl">0</Text>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Training Progress</CardTitle>
            <CardDescription>Completed training modules</CardDescription>
          </CardHeader>
          <CardContent>
            <Text as="div" variant="body" weight="bold" className="text-4xl">0%</Text>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
