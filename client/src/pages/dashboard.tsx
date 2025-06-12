import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Factory, BarChart3, Table, Bell, Settings, AlertTriangle } from "lucide-react";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { AnalyticsTab } from "@/components/dashboard/analytics-tab";
import { MaintenanceTable } from "@/components/dashboard/maintenance-table";
import { FailureTable } from "@/components/dashboard/failure-table";
import { CranesTable } from "@/components/dashboard/cranes-table";
import { AlertsTab } from "@/components/dashboard/alerts-tab";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { DashboardSummary } from "@shared/schema";

export default function Dashboard() {
  const [cranesUrl, setCranesUrl] = useState("");
  const [failureUrl, setFailureUrl] = useState("");
  const [maintenanceUrl, setMaintenanceUrl] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("Never");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: summary, isLoading: summaryLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary"],
  });

  const refreshMutation = useMutation({
    mutationFn: async (urls?: { cranesUrl?: string; failureUrl?: string; maintenanceUrl?: string }) => {
      const response = await apiRequest("POST", "/api/refresh-data", urls || {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      setLastUpdated(new Date().toLocaleString());
      toast({
        title: "Data Refreshed",
        description: "Dashboard data has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Refresh Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (urls: { cranesUrl: string; failureUrl: string; maintenanceUrl: string }) => {
      const response = await apiRequest("POST", "/api/sync-sheets", urls);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setLastUpdated(new Date().toLocaleString());
      setIsConfigOpen(false);
      toast({
        title: "Sync Complete",
        description: "Data has been synced from Google Sheets successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRefresh = () => {
    if (cranesUrl && failureUrl && maintenanceUrl) {
      refreshMutation.mutate({ cranesUrl, failureUrl, maintenanceUrl });
    } else {
      refreshMutation.mutate();
    }
  };

  const handleSync = () => {
    if (!cranesUrl || !failureUrl || !maintenanceUrl) {
      toast({
        title: "Configuration Required",
        description: "Please provide all three Google Sheets URLs.",
        variant: "destructive",
      });
      return;
    }
    syncMutation.mutate({ cranesUrl, failureUrl, maintenanceUrl });
  };

  const defaultSummary: DashboardSummary = {
    totalCranes: 0,
    operatingCranes: 0,
    maintenanceCranes: 0,
    urgentCranes: 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Factory className="text-primary-500 w-8 h-8" />
                <h1 className="text-xl font-semibold text-gray-900">
                  Crane Maintenance Dashboard
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Google Sheets Configuration</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cranes-url">크레인 목록 시트 CSV URL</Label>
                      <Input
                        id="cranes-url"
                        placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                        value={cranesUrl}
                        onChange={(e) => setCranesUrl(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="failure-url">고장 이력 시트 CSV URL</Label>
                      <Input
                        id="failure-url"
                        placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                        value={failureUrl}
                        onChange={(e) => setFailureUrl(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maintenance-url">수리 이력 시트 CSV URL</Label>
                      <Input
                        id="maintenance-url"
                        placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                        value={maintenanceUrl}
                        onChange={(e) => setMaintenanceUrl(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsConfigOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSync}
                        disabled={syncMutation.isPending}
                      >
                        {syncMutation.isPending ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        Sync Data
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button
                onClick={handleRefresh}
                disabled={refreshMutation.isPending}
                className="bg-primary-500 hover:bg-primary-600 text-white"
              >
                {refreshMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh Data
              </Button>
              
              <div className="text-sm text-gray-500">
                Last updated: <span className="font-medium">{lastUpdated}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <SummaryCards 
          summary={summary || defaultSummary} 
          isLoading={summaryLoading} 
        />

        {/* Main Dashboard */}
        <Card className="border border-gray-200 shadow-sm">
          <Tabs defaultValue="analytics" className="w-full">
            <div className="border-b border-gray-200">
              <div className="px-6">
                <TabsList className="grid w-full grid-cols-4 bg-transparent">
                  <TabsTrigger 
                    value="analytics" 
                    className="flex items-center space-x-2 data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-600"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>분석</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="failures"
                    className="flex items-center space-x-2 data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-600"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>고장 이력</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="maintenance"
                    className="flex items-center space-x-2 data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-600"
                  >
                    <Table className="w-4 h-4" />
                    <span>수리 이력</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="alerts"
                    className="flex items-center space-x-2 data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-600"
                  >
                    <Bell className="w-4 h-4" />
                    <span>알림</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <CardContent className="p-6">
              <TabsContent value="analytics" className="mt-0">
                <AnalyticsTab summary={summary || defaultSummary} />
              </TabsContent>
              
              <TabsContent value="failures" className="mt-0">
                <FailureTable />
              </TabsContent>
              
              <TabsContent value="maintenance" className="mt-0">
                <MaintenanceTable />
              </TabsContent>
              
              <TabsContent value="alerts" className="mt-0">
                <AlertsTab />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
