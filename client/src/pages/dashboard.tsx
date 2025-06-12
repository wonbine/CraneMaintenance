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
  const [cranesSpreadsheetId, setCranesSpreadsheetId] = useState("");
  const [failureSpreadsheetId, setFailureSpreadsheetId] = useState("");
  const [maintenanceSpreadsheetId, setMaintenanceSpreadsheetId] = useState("");
  const [cranesSheetName, setCranesSheetName] = useState("");
  const [failureSheetName, setFailureSheetName] = useState("");
  const [maintenanceSheetName, setMaintenanceSheetName] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("Never");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: summary, isLoading: summaryLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary"],
  });

  const refreshMutation = useMutation({
    mutationFn: async (config?: any) => {
      const response = await apiRequest("POST", "/api/refresh-data", config || {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      setLastUpdated(new Date().toLocaleString());
      toast({
        title: "데이터 새로고침 완료",
        description: "대시보드 데이터가 성공적으로 업데이트되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "새로고침 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (config: { 
      cranesSpreadsheetId: string; 
      failureSpreadsheetId: string; 
      maintenanceSpreadsheetId: string;
      cranesSheetName?: string;
      failureSheetName?: string;
      maintenanceSheetName?: string;
    }) => {
      const response = await apiRequest("POST", "/api/sync-sheets", config);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setLastUpdated(new Date().toLocaleString());
      setIsConfigOpen(false);
      toast({
        title: "동기화 완료",
        description: "구글 스프레드시트에서 데이터가 성공적으로 동기화되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "동기화 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (config: { spreadsheetId: string; sheetName?: string }) => {
      const response = await apiRequest("POST", "/api/test-sheets", config);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "연결 테스트 성공",
        description: `${data.rowCount}개 행을 찾았습니다. 헤더: ${data.headers.join(', ')}`,
      });
    },
    onError: (error) => {
      toast({
        title: "연결 테스트 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRefresh = () => {
    if (cranesSpreadsheetId && failureSpreadsheetId && maintenanceSpreadsheetId) {
      refreshMutation.mutate({ 
        cranesSpreadsheetId, 
        failureSpreadsheetId, 
        maintenanceSpreadsheetId,
        cranesSheetName,
        failureSheetName,
        maintenanceSheetName
      });
    } else {
      refreshMutation.mutate();
    }
  };

  const handleSync = () => {
    if (!cranesSpreadsheetId || !failureSpreadsheetId || !maintenanceSpreadsheetId) {
      toast({
        title: "설정이 필요합니다",
        description: "세 개의 구글 스프레드시트 ID를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    syncMutation.mutate({ 
      cranesSpreadsheetId, 
      failureSpreadsheetId, 
      maintenanceSpreadsheetId,
      cranesSheetName,
      failureSheetName,
      maintenanceSheetName
    });
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
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                      <p><strong>Google Sheets API 사용:</strong> 스프레드시트 ID와 시트명을 입력하세요.</p>
                      <p>URL 예시: https://docs.google.com/spreadsheets/d/<span className="font-mono bg-blue-100 px-1">YOUR_SPREADSHEET_ID</span>/edit</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="cranes-spreadsheet">크레인 목록 스프레드시트 ID</Label>
                      <Input
                        id="cranes-spreadsheet"
                        placeholder="1A2B3C4D5E6F..."
                        value={cranesSpreadsheetId}
                        onChange={(e) => setCranesSpreadsheetId(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cranes-sheet">크레인 목록 시트명 (선택사항)</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="cranes-sheet"
                          placeholder="Sheet1"
                          value={cranesSheetName}
                          onChange={(e) => setCranesSheetName(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (cranesSpreadsheetId) {
                              testMutation.mutate({ 
                                spreadsheetId: cranesSpreadsheetId, 
                                sheetName: cranesSheetName 
                              });
                            }
                          }}
                          disabled={!cranesSpreadsheetId || testMutation.isPending}
                        >
                          테스트
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="failure-spreadsheet">고장 이력 스프레드시트 ID</Label>
                      <Input
                        id="failure-spreadsheet"
                        placeholder="1A2B3C4D5E6F..."
                        value={failureSpreadsheetId}
                        onChange={(e) => setFailureSpreadsheetId(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="failure-sheet">고장 이력 시트명 (선택사항)</Label>
                      <Input
                        id="failure-sheet"
                        placeholder="Sheet1"
                        value={failureSheetName}
                        onChange={(e) => setFailureSheetName(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="maintenance-spreadsheet">수리 이력 스프레드시트 ID</Label>
                      <Input
                        id="maintenance-spreadsheet"
                        placeholder="1A2B3C4D5E6F..."
                        value={maintenanceSpreadsheetId}
                        onChange={(e) => setMaintenanceSpreadsheetId(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maintenance-sheet">수리 이력 시트명 (선택사항)</Label>
                      <Input
                        id="maintenance-sheet"
                        placeholder="Sheet1"
                        value={maintenanceSheetName}
                        onChange={(e) => setMaintenanceSheetName(e.target.value)}
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
                <TabsList className="grid w-full grid-cols-5 bg-transparent">
                  <TabsTrigger 
                    value="analytics" 
                    className="flex items-center space-x-2 data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-600"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>분석</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="cranes"
                    className="flex items-center space-x-2 data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-600"
                  >
                    <Factory className="w-4 h-4" />
                    <span>크레인 목록</span>
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
              
              <TabsContent value="cranes" className="mt-0">
                <CranesTable />
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
