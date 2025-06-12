import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, Clock, Users, Wrench } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Crane } from "@shared/schema";

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

export function MaintenanceTable() {
  const [selectedFactory, setSelectedFactory] = useState("");
  const [selectedCrane, setSelectedCrane] = useState("");

  // Fetch crane data for the dropdowns
  const { data: cranes = [] } = useQuery<Crane[]>({
    queryKey: ["/api/cranes"],
  });

  // Fetch maintenance records for selected crane
  const { data: records = [], isLoading } = useQuery<MaintenanceRecord[]>({
    queryKey: [`/api/maintenance-records/${selectedCrane}`],
    enabled: !!selectedCrane,
  });

  // Get unique factories from cranes
  const factories = useMemo(() => {
    const uniqueFactories = Array.from(new Set(cranes.map(crane => crane.plantSection).filter((f): f is string => Boolean(f))));
    return uniqueFactories.sort();
  }, [cranes]);

  // Get cranes for selected factory
  const filteredCranes = useMemo(() => {
    if (!selectedFactory) return cranes;
    return cranes.filter(crane => crane.plantSection === selectedFactory);
  }, [cranes, selectedFactory]);

  // Reset crane selection when factory changes
  useEffect(() => {
    if (selectedFactory && selectedCrane) {
      const craneExists = filteredCranes.some(crane => crane.craneId === selectedCrane);
      if (!craneExists) {
        setSelectedCrane("");
      }
    }
  }, [selectedFactory, selectedCrane, filteredCranes]);

  return (
    <div className="space-y-6">
      {/* Crane Selection Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            크레인 선택
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                • 공장 선택
              </label>
              <Select value={selectedFactory} onValueChange={setSelectedFactory}>
                <SelectTrigger>
                  <SelectValue placeholder="공장선택" />
                </SelectTrigger>
                <SelectContent>
                  {factories.map((factory) => (
                    <SelectItem key={factory} value={factory}>
                      {factory}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                • 크레인 선택
              </label>
              <Select value={selectedCrane} onValueChange={setSelectedCrane}>
                <SelectTrigger>
                  <SelectValue placeholder="A12_수정용 #12" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCranes.map((crane: any) => (
                    <SelectItem key={crane.craneId} value={crane.craneId}>
                      {crane.craneName || crane.craneId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Records Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-green-600" />
            일상수리 기록
          </CardTitle>
          <p className="text-sm text-gray-500">최근 일상수리 기록</p>
        </CardHeader>
        <CardContent>
          {!selectedCrane ? (
            <div className="text-center py-8 text-gray-500">
              크레인을 선택해 주세요
            </div>
          ) : isLoading ? (
            <div className="text-center py-8 text-gray-500">
              데이터를 불러오는 중...
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              해당 크레인의 수리 기록이 없습니다
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-center">순번</TableHead>
                    <TableHead>작업번호</TableHead>
                    <TableHead>작업명</TableHead>
                    <TableHead>시작일</TableHead>
                    <TableHead>종료일</TableHead>
                    <TableHead className="text-center">총 인원</TableHead>
                    <TableHead className="text-center">총 작업시간</TableHead>
                    <TableHead>구역명</TableHead>
                    <TableHead>장비코드</TableHead>
                    <TableHead>장비명</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record: MaintenanceRecord, index) => (
                    <TableRow key={record.id} className="hover:bg-gray-50">
                      <TableCell className="text-center font-medium">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded text-blue-600">
                          {record.workOrder || '-'}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">
                        {record.taskName || '일상수리'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {record.actualStartDateTime 
                            ? new Date(record.actualStartDateTime).toLocaleDateString('ko-KR')
                            : new Date(record.date).toLocaleDateString('ko-KR')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {record.actualEndDateTime 
                            ? new Date(record.actualEndDateTime).toLocaleDateString('ko-KR')
                            : new Date(record.date).toLocaleDateString('ko-KR')}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {record.totalWorkers || 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {record.totalWorkTime || 0}:00
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-purple-50 text-purple-700">
                          {record.areaName || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-orange-50 px-2 py-1 rounded text-orange-700">
                          {record.craneId}
                        </code>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={record.equipmentName || ''}>
                          {record.equipmentName || '-'}
                        </div>
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