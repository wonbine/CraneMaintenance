import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Users, Wrench } from "lucide-react";

interface MaintenanceRecord {
  id: number;
  순번: number;
  craneId: string;
  date: string;
  workOrder: string | null;
  taskName: string | null;
  actualStartDateTime: string | null;
  actualEndDateTime: string | null;
  totalWorkers: number | null;
  totalWorkTime: number | null;
  areaName: string | null;
  equipmentName: string | null;
  status: string;
  type: string;
}

export default function MaintenanceHistory() {
  const [, params] = useRoute("/maintenance-history/:craneId");
  const [, setLocation] = useLocation();
  const craneId = params?.craneId;

  const { data: records, isLoading, error } = useQuery({
    queryKey: [`/api/maintenance-records/${craneId}`],
    enabled: !!craneId,
  });

  const { data: cranes } = useQuery({
    queryKey: ["/api/cranes"],
  });

  const crane = cranes?.find((c: any) => c.craneId === craneId);

  const handleBackToDashboard = () => {
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={handleBackToDashboard}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">데이터를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={handleBackToDashboard}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">데이터를 불러오는데 실패했습니다</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBackToDashboard}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
          <div>
            <h1 className="text-2xl font-bold">일상수리 이력</h1>
            <p className="text-muted-foreground">
              {crane?.craneName || craneId} ({crane?.plantSection})
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 수리 기록</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{records?.length || 0}건</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 작업시간</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {records?.reduce((sum: number, record: MaintenanceRecord) => 
                sum + (record.totalWorkTime || 0), 0).toFixed(1)}시간
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 투입인원</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {records?.length > 0 
                ? (records.reduce((sum: number, record: MaintenanceRecord) => 
                    sum + (record.totalWorkers || 0), 0) / records.length).toFixed(1)
                : 0}명
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">최근 수리일</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {records?.length > 0 
                ? new Date(records[0].date).toLocaleDateString('ko-KR')
                : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>수리 기록 상세</CardTitle>
        </CardHeader>
        <CardContent>
          {records?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              해당 크레인의 수리 기록이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">순번</TableHead>
                    <TableHead>작업번호</TableHead>
                    <TableHead>작업명</TableHead>
                    <TableHead>시작일</TableHead>
                    <TableHead>종료일</TableHead>
                    <TableHead className="text-right">총 인원</TableHead>
                    <TableHead className="text-right">총 작업시간</TableHead>
                    <TableHead>구역명</TableHead>
                    <TableHead>장비코드</TableHead>
                    <TableHead>장비명</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records?.map((record: MaintenanceRecord) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.순번}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-1 rounded">
                          {record.workOrder || '-'}
                        </code>
                      </TableCell>
                      <TableCell>{record.taskName || '-'}</TableCell>
                      <TableCell>
                        {record.actualStartDateTime 
                          ? new Date(record.actualStartDateTime).toLocaleDateString('ko-KR')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {record.actualEndDateTime 
                          ? new Date(record.actualEndDateTime).toLocaleDateString('ko-KR')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {record.totalWorkers ? `${record.totalWorkers}명` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {record.totalWorkTime ? `${record.totalWorkTime}시간` : '-'}
                      </TableCell>
                      <TableCell>{record.areaName || '-'}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-1 rounded">
                          {record.craneId}
                        </code>
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={record.equipmentName || ''}>
                        {record.equipmentName || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.status === 'completed' ? 'default' : 'secondary'}>
                          {record.status === 'completed' ? '완료' : record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}