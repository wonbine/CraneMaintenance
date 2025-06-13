import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, SampleDataGuide } from "./empty-state";
import type { MaintenanceStats, MonthlyTrend, DashboardSummary } from "@shared/schema";

interface AnalyticsTabProps {
  summary: DashboardSummary;
}

export function AnalyticsTab({ summary }: AnalyticsTabProps) {
  const { data: maintenanceStats, isLoading: statsLoading } = useQuery<MaintenanceStats[]>({
    queryKey: ["/api/analytics/maintenance-stats"],
  });

  const { data: monthlyTrends, isLoading: trendsLoading } = useQuery<MonthlyTrend[]>({
    queryKey: ["/api/analytics/monthly-trends"],
  });

  const statusData = [
    { name: "Operating", value: summary.operatingCranes, color: "#64748b" },
    { name: "Under Maintenance", value: summary.maintenanceCranes, color: "#78716c" },
    { name: "Urgent", value: summary.urgentCranes, color: "#6b7280" }
  ];

  const maintenanceColors = {
    routine: "#64748b",
    emergency: "#6b7280",
    preventive: "#475569",
    repair: "#78716c",
    inspection: "#71717a"
  };

  if (statsLoading || trendsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-48"></div>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-100 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-48"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-100 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if data is empty
  const hasMaintenanceData = maintenanceStats && maintenanceStats.length > 0;
  const hasTrendData = monthlyTrends && monthlyTrends.length > 0;
  const hasAnyData = summary.totalCranes > 0;

  if (!hasAnyData) {
    return (
      <div className="space-y-6">
        <EmptyState type="general" />
        <SampleDataGuide />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Types Bar Chart */}
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-gray-900">
              Maintenance Types Frequency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maintenanceStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="type" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value, name) => [value, 'Frequency']}
                    labelFormatter={(label) => label.charAt(0).toUpperCase() + label.slice(1)}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-gray-900">
              Crane Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Trends Line Chart */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900">
            Monthly Maintenance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [value, 'Maintenance Count']}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#1565C0" 
                  strokeWidth={3}
                  dot={{ fill: "#1565C0", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
