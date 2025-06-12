import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Settings, AlertTriangle, Clock, User, Wrench } from "lucide-react";
import type { Crane, FailureRecord } from "@shared/schema";

export function FailureTable() {
  const [selectedFactory, setSelectedFactory] = useState<string>("");
  const [selectedCrane, setSelectedCrane] = useState<string>("");

  // Fetch crane data for the dropdowns
  const { data: cranes = [] } = useQuery<Crane[]>({
    queryKey: ["/api/cranes"],
  });

  // Fetch failure records for selected crane
  const { data: records = [], isLoading } = useQuery<FailureRecord[]>({
    queryKey: [`/api/failure-records/${selectedCrane}`],
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
          <p className="text-sm text-gray-500">돌발수리 기록을 조회할 공장과 크레인을 선택하세요</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">공장명</label>
              <Select value={selectedFactory} onValueChange={setSelectedFactory}>
                <SelectTrigger>
                  <SelectValue placeholder="공장을 선택하세요" />
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">크레인</label>
              <Select value={selectedCrane} onValueChange={setSelectedCrane} disabled={!selectedFactory}>
                <SelectTrigger>
                  <SelectValue placeholder="크레인을 선택하세요" />
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

      {/* Failure Records Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            돌발수리 기록
          </CardTitle>
          <p className="text-sm text-gray-500">최근 돌발수리 기록</p>
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
              해당 크레인의 돌발수리 기록이 없습니다
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-center">순번</TableHead>
                    <TableHead>발생일</TableHead>
                    <TableHead>고장내용</TableHead>
                    <TableHead>시작시간</TableHead>
                    <TableHead>종료시간</TableHead>
                    <TableHead className="text-center">작업시간</TableHead>
                    <TableHead>정지시간</TableHead>
                    <TableHead>고장유형</TableHead>
                    <TableHead>부위</TableHead>
                    <TableHead>심각도</TableHead>
                    <TableHead>상세내용</TableHead>
                    <TableHead>원인</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record: FailureRecord, index) => (
                    <TableRow key={record.id} className="hover:bg-gray-50">
                      <TableCell className="text-center font-medium">
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {new Date(record.date).toLocaleDateString('ko-KR')}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {record.description || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {record.date ? new Date(record.date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {record.date && record.worktime ? 
                            new Date(new Date(record.date).getTime() + (parseFloat(record.worktime.toString()) * 60 * 60 * 1000)).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {record.worktime || 0}시간
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                          {record.downtime ? `${record.downtime}H` : '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          record.failureType === 'Mechanical' 
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : record.failureType === 'Electrical'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }>
                          {record.failureType || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-purple-50 text-purple-700">
                          {record.byDevice || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          record.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                          record.severity === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          record.severity === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-green-50 text-green-700 border-green-200'
                        }>
                          {record.severity || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={record.description || ''}>
                          {record.description || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={record.cause || ''}>
                          {record.cause || '-'}
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