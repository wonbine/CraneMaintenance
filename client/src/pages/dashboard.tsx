import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings, RefreshCw, BarChart3, Factory, AlertTriangle, Wrench, Calendar } from "lucide-react";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { AnalyticsTab } from "@/components/dashboard/analytics-tab";
import { CranesTable } from "@/components/dashboard/cranes-table";
import { FailureTable } from "@/components/dashboard/failure-table";
import { MaintenanceTable } from "@/components/dashboard/maintenance-table";
import { AlertsTab } from "@/components/dashboard/alerts-tab";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FactoryCraneSelector } from "@/components/dashboard/factory-crane-selector";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DashboardSummary } from "@shared/schema";

export default function Dashboard() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>();
  const [selectedFactory, setSelectedFactory] = useState<string>();
  const [selectedCrane, setSelectedCrane] = useState<string>();
  
  // Google Sheets configuration
  const [cranesSpreadsheetId, setCranesSpreadsheetId] = useState("");
  const [failureSpreadsheetId, setFailureSpreadsheetId] = useState("");
  const [maintenanceSpreadsheetId, setMaintenanceSpreadsheetId] = useState("");
  const [cranesSheetName, setCranesSheetName] = useState("CraneList");
  const [failureSheetName, setFailureSheetName] = useState("FailureHistory");
  const [maintenanceSheetName, setMaintenanceSheetName] = useState("MaintenanceHistory");

  const { toast } = useToast();

  const { data: summary, isLoading: summaryLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary"],
  });

  const handleFactoryCraneSelection = (factory?: string, craneName?: string) => {
    setSelectedFactory(factory);
    setSelectedCrane(craneName);
    // Invalidate cranes cache to refetch with new filters
    queryClient.invalidateQueries({ queryKey: ["/api/cranes"] });
  };

  const refreshMutation = useMutation({
    mutationFn: async (config: { 
      cranesSpreadsheetId: string; 
      failureSpreadsheetId: string; 
      maintenanceSpreadsheetId: string;
      cranesSheetName?: string;
      failureSheetName?: string;
      maintenanceSheetName?: string;
    }) => {
      const response = await apiRequest("POST", "/api/refresh-data", config);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setLastUpdated(new Date().toLocaleString());
      toast({
        title: "데이터 새로고침 완료",
        description: "최신 데이터로 업데이트되었습니다.",
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
      toast({
        title: "설정 필요",
        description: "먼저 구글 스프레드시트를 설정해주세요.",
        variant: "destructive",
      });
    }
  };

  const handleSync = () => {
    if (!cranesSpreadsheetId || !failureSpreadsheetId || !maintenanceSpreadsheetId) {
      toast({
        title: "설정 필요",
        description: "모든 스프레드시트 ID를 입력해주세요.",
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

  const showEmptyState = !summary || summary.totalCranes === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">크레인 관리 대시보드</h1>
          <p className="text-muted-foreground">
            전체 크레인 현황과 유지보수 정보를 확인하세요
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleRefresh} disabled={refreshMutation.isPending} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Google Sheets 설정</DialogTitle>
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
                  <div className="flex space-x-2">
                    <Input
                      id="failure-sheet"
                      placeholder="Sheet1"
                      value={failureSheetName}
                      onChange={(e) => setFailureSheetName(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (failureSpreadsheetId) {
                          testMutation.mutate({ 
                            spreadsheetId: failureSpreadsheetId, 
                            sheetName: failureSheetName 
                          });
                        }
                      }}
                      disabled={!failureSpreadsheetId || testMutation.isPending}
                    >
                      테스트
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="maintenance-spreadsheet">정비 이력 스프레드시트 ID</Label>
                  <Input
                    id="maintenance-spreadsheet"
                    placeholder="1A2B3C4D5E6F..."
                    value={maintenanceSpreadsheetId}
                    onChange={(e) => setMaintenanceSpreadsheetId(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="maintenance-sheet">정비 이력 시트명 (선택사항)</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="maintenance-sheet"
                      placeholder="Sheet1"
                      value={maintenanceSheetName}
                      onChange={(e) => setMaintenanceSheetName(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (maintenanceSpreadsheetId) {
                          testMutation.mutate({ 
                            spreadsheetId: maintenanceSpreadsheetId, 
                            sheetName: maintenanceSheetName 
                          });
                        }
                      }}
                      disabled={!maintenanceSpreadsheetId || testMutation.isPending}
                    >
                      테스트
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleSync} 
                  disabled={syncMutation.isPending}
                  className="w-full"
                >
                  {syncMutation.isPending ? "동기화 중..." : "데이터 동기화"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground">
              마지막 업데이트: {lastUpdated}
            </p>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards 
        summary={summary || defaultSummary} 
        isLoading={summaryLoading} 
      />

      {/* Factory and Crane Selection */}
      <FactoryCraneSelector onSelectionChange={handleFactoryCraneSelection} />

      {/* Main Content */}
      {showEmptyState ? (
        <EmptyState type="general" />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <Tabs defaultValue="cranes" className="w-full">
            <div className="border-b border-gray-100 px-6 py-4">
              <TabsList className="bg-gray-50 p-1 rounded-lg">
                <TabsTrigger value="cranes" className="flex items-center space-x-2 px-4 py-2">
                  <Factory className="w-4 h-4" />
                  <span>크레인</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center space-x-2 px-4 py-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>분석</span>
                </TabsTrigger>
                <TabsTrigger value="failures" className="flex items-center space-x-2 px-4 py-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>고장 이력</span>
                </TabsTrigger>
                <TabsTrigger value="maintenance" className="flex items-center space-x-2 px-4 py-2">
                  <Wrench className="w-4 h-4" />
                  <span>정비 이력</span>
                </TabsTrigger>
                <TabsTrigger value="alerts" className="flex items-center space-x-2 px-4 py-2">
                  <Calendar className="w-4 h-4" />
                  <span>알림</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="p-0">
              <TabsContent value="cranes" className="mt-0">
                <CranesTable selectedFactory={selectedFactory} selectedCrane={selectedCrane} />
              </TabsContent>
              
              <TabsContent value="analytics" className="mt-0 p-6">
                <AnalyticsTab summary={summary || defaultSummary} />
              </TabsContent>
              
              <TabsContent value="failures" className="mt-0">
                <FailureTable />
              </TabsContent>
              
              <TabsContent value="maintenance" className="mt-0">
                <MaintenanceTable />
              </TabsContent>
              
              <TabsContent value="alerts" className="mt-0 p-6">
                <AlertsTab />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}