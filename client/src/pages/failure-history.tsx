import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, Search, Filter, Download } from "lucide-react";
import { useState } from "react";
import type { FailureRecord } from "@shared/schema";
import { format } from "date-fns";

export default function FailureHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  const { data: failures = [], isLoading } = useQuery<FailureRecord[]>({
    queryKey: ["/api/failure-records"],
  });

  const filteredFailures = failures
    .filter((failure) => {
      const matchesSearch = 
        failure.craneId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        failure.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (failure.cause && failure.cause.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesSeverity = severityFilter === "all" || failure.severity === severityFilter;
      
      return matchesSearch && matchesSeverity;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "severity":
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return (severityOrder[b.severity as keyof typeof severityOrder] || 0) - 
                 (severityOrder[a.severity as keyof typeof severityOrder] || 0);
        case "downtime":
          return (b.downtime || 0) - (a.downtime || 0);
        default:
          return 0;
      }
    });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "critical": return "심각";
      case "high": return "높음";
      case "medium": return "보통";
      case "low": return "낮음";
      default: return severity;
    }
  };

  const getFailureTypeLabel = (type: string) => {
    switch (type) {
      case "mechanical": return "기계적";
      case "electrical": return "전기적";
      case "structural": return "구조적";
      case "operational": return "운영상";
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-2 text-lg">돌발수리 이력 로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">돌발수리 이력</h1>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="bg-red-50">
            총 {failures.length}건
          </Badge>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="크레인 ID, 설명, 원인으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="심각도 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 심각도</SelectItem>
                <SelectItem value="critical">심각</SelectItem>
                <SelectItem value="high">높음</SelectItem>
                <SelectItem value="medium">보통</SelectItem>
                <SelectItem value="low">낮음</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="정렬 기준" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">날짜순</SelectItem>
                <SelectItem value="severity">심각도순</SelectItem>
                <SelectItem value="downtime">다운타임순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Failure Records */}
      <div className="grid gap-4">
        {filteredFailures.map((failure) => (
          <Card key={failure.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div>
                    <h3 className="font-semibold text-lg">{failure.craneId}</h3>
                    <p className="text-sm text-gray-500">
                      {format(new Date(failure.date), "yyyy년 MM월 dd일")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={`${getSeverityColor(failure.severity)} text-xs`}>
                    {getSeverityLabel(failure.severity)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getFailureTypeLabel(failure.failureType)}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-1">설명</h4>
                  <p className="text-sm text-gray-900">{failure.description}</p>
                </div>

                {failure.cause && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-1">원인</h4>
                    <p className="text-sm text-gray-900">{failure.cause}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {failure.downtime && (
                      <span>다운타임: {failure.downtime}분</span>
                    )}
                    {failure.reportedBy && (
                      <span>보고자: {failure.reportedBy}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFailures.length === 0 && (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || severityFilter !== "all" 
                ? "검색 조건에 맞는 돌발수리 이력이 없습니다"
                : "돌발수리 이력이 없습니다"
              }
            </p>
            <p className="text-sm text-gray-500 text-center">
              구글 스프레드시트에서 돌발수리 데이터를 동기화해주세요.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}