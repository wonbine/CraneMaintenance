import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Clock, Info, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Alert as AlertType } from "@shared/schema";

export function AlertsTab() {
  const { data: alerts = [], isLoading } = useQuery<AlertType[]>({
    queryKey: ["/api/alerts"],
  });

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return <AlertCircle className="w-5 h-5" />;
      case 'due_soon':
        return <Clock className="w-5 h-5" />;
      case 'high_frequency':
        return <Info className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-400 bg-red-50 text-red-800';
      case 'high':
        return 'border-red-400 bg-red-50 text-red-700';
      case 'medium':
        return 'border-yellow-400 bg-yellow-50 text-yellow-700';
      case 'low':
        return 'border-blue-400 bg-blue-50 text-blue-700';
      default:
        return 'border-gray-400 bg-gray-50 text-gray-700';
    }
  };

  const getButtonColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'bg-red-50 text-red-800 hover:bg-red-100 focus:ring-red-600';
      case 'medium':
        return 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 focus:ring-yellow-600';
      default:
        return 'bg-blue-50 text-blue-800 hover:bg-blue-100 focus:ring-blue-600';
    }
  };

  // Mock average maintenance intervals data
  const maintenanceIntervals = [
    { type: "Routine", days: 28, icon: Calendar },
    { type: "Preventive", days: 15, icon: Calendar },
    { type: "Emergency/Month", days: 3.2, icon: AlertCircle }
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-100 border-l-4 border-gray-300 p-4 rounded">
              <div className="flex">
                <div className="w-5 h-5 bg-gray-300 rounded"></div>
                <div className="ml-3 space-y-2 flex-1">
                  <div className="h-4 bg-gray-300 rounded w-32"></div>
                  <div className="h-4 bg-gray-300 rounded w-96"></div>
                  <div className="h-8 bg-gray-300 rounded w-40"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Alerts */}
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-gray-500">
                <Info className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No Active Alerts</h3>
                <p>All cranes are operating within normal parameters.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border-l-4 p-4 rounded ${getAlertColor(alert.severity)}`}
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  {getAlertIcon(alert.type)}
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium">
                    {alert.type === 'overdue' && 'Overdue Maintenance'}
                    {alert.type === 'due_soon' && 'Maintenance Due Soon'}
                    {alert.type === 'high_frequency' && 'High Maintenance Frequency'}
                  </h3>
                  <div className="mt-2 text-sm">
                    <p>{alert.message}</p>
                  </div>
                  {(alert.severity === 'critical' || alert.severity === 'high') && (
                    <div className="mt-4">
                      <Button
                        size="sm"
                        className={`${getButtonColor(alert.severity)} focus:outline-none focus:ring-2 focus:ring-offset-2`}
                      >
                        {alert.type === 'overdue' ? 'Schedule Maintenance' : 'View Details'}
                      </Button>
                    </div>
                  )}
                  <div className="mt-2 text-xs opacity-75">
                    Created: {new Date(alert.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Maintenance Interval Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900">
            Average Maintenance Intervals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {maintenanceIntervals.map((interval, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-center mb-2">
                  <interval.icon className="w-6 h-6 text-gray-600" />
                </div>
                <div className="text-2xl font-semibold text-gray-900 mb-1">
                  {interval.days}
                </div>
                <div className="text-sm text-gray-500">
                  Days - {interval.type}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900">
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-800">Data Sync Status</span>
              </div>
              <span className="text-sm text-green-700">Connected</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-800">Monitoring Active</span>
              </div>
              <span className="text-sm text-blue-700">24/7</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium text-yellow-800">Pending Reviews</span>
              </div>
              <span className="text-sm text-yellow-700">{alerts.filter(a => a.severity === 'medium').length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
