import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, AlertTriangle, Wrench, Factory } from "lucide-react";
import type { FailureRecord, Crane } from "@shared/schema";

export default function FactoryFailureReport() {
  const [selectedFactory, setSelectedFactory] = useState<string>("");

  // Fetch all factories
  const { data: factories = [] } = useQuery<string[]>({
    queryKey: ["/api/factories"],
  });

  // Fetch all cranes
  const { data: cranes = [] } = useQuery<Crane[]>({
    queryKey: ["/api/cranes"],
  });

  // Fetch all failure records
  const { data: allFailureRecords = [] } = useQuery<FailureRecord[]>({
    queryKey: ["/api/failure-records"],
  });

  // Filter cranes by selected factory
  const factoryCranes = cranes.filter(crane => 
    selectedFactory ? crane.plantSection === selectedFactory : true
  );

  // Get crane IDs for the selected factory
  const factoryCraneIds = new Set(factoryCranes.map(crane => crane.craneId));

  // Filter failure records for cranes in selected factory
  const factoryFailureRecords = allFailureRecords.filter(record =>
    selectedFactory ? factoryCraneIds.has(record.craneId) : true
  );

  // Create a map of crane ID to crane details for quick lookup
  const craneMap = new Map(cranes.map(crane => [crane.craneId, crane]));

  // Enrich failure records with crane information
  const enrichedFailureRecords = factoryFailureRecords.map(record => ({
    ...record,
    crane: craneMap.get(record.craneId)
  }));

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR');
    } catch {
      return dateStr;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "고장": return "bg-red-100 text-red-800 border-red-200";
      case "점검": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "정비": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Factory className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">공장별 크레인 고장 보고서</h1>
            <p className="text-gray-600">설비코드 기준으로 연결된 고장 데이터</p>
          </div>
        </div>
      </div>

      {/* Factory Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Factory className="h-5 w-5 mr-2" />
            공장 선택
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Select value={selectedFactory} onValueChange={setSelectedFactory}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="공장을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체 공장</SelectItem>
                {factories.map((factory) => (
                  <SelectItem key={factory} value={factory}>
                    {factory}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>크레인: {factoryCranes.length}대</span>
              <span>고장 기록: {factoryFailureRecords.length}건</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      {selectedFactory && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Factory className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{factoryCranes.length}</p>
                  <p className="text-sm text-gray-600">총 크레인</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{factoryFailureRecords.length}</p>
                  <p className="text-sm text-gray-600">고장 기록</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Wrench className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {factoryFailureRecords.filter(r => r.severity === "점검").length}
                  </p>
                  <p className="text-sm text-gray-600">점검 완료</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CalendarDays className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {Math.round(factoryFailureRecords.length / Math.max(factoryCranes.length, 1) * 100) / 100}
                  </p>
                  <p className="text-sm text-gray-600">크레인당 평균 고장</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Failure Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            고장 보고서 데이터
            {selectedFactory && (
              <Badge variant="outline" className="ml-2">
                {selectedFactory}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>설비코드</TableHead>
                  <TableHead>크레인명</TableHead>
                  <TableHead>공장</TableHead>
                  <TableHead>발생일시</TableHead>
                  <TableHead>고장유형</TableHead>
                  <TableHead>고장내용</TableHead>
                  <TableHead>심각도</TableHead>
                  <TableHead>중단시간</TableHead>
                  <TableHead>보고자</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedFailureRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                      {selectedFactory ? 
                        `${selectedFactory}에 고장 기록이 없습니다.` : 
                        "고장 기록이 없습니다."
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  enrichedFailureRecords.map((record) => (
                    <TableRow key={record.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{record.craneId}</TableCell>
                      <TableCell>{record.crane?.craneName || "-"}</TableCell>
                      <TableCell>{record.crane?.plantSection || "-"}</TableCell>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>{record.failureType || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate" title={record.description || ""}>
                        {record.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={getSeverityColor(record.severity || "")}
                        >
                          {record.severity || "미상"}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.downtime ? `${record.downtime}시간` : "-"}</TableCell>
                      <TableCell>{record.reportedBy || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}