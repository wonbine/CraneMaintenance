import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wrench, Search, Filter, Download, Clock, DollarSign } from "lucide-react";
import { useState } from "react";
import type { MaintenanceRecord } from "@shared/schema";
import { format } from "date-fns";

export default function MaintenanceHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  const { data: maintenanceRecords = [], isLoading } = useQuery<MaintenanceRecord[]>({
    queryKey: ["/api/maintenance-records"],
  });

  const filteredRecords = maintenanceRecords
    .filter((record) => {
      const matchesSearch = 
        record.craneId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.technician.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.notes && record.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesType = typeFilter === "all" || record.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "cost":
          return (b.cost || 0) - (a.cost || 0);
        case "duration":
          return (b.duration || 0) - (a.duration || 0);
        default:
          return 0;
      }
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "scheduled":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "완료";
      case "in_progress": return "진행중";
      case "scheduled": return "예정";
      case "cancelled": return "취소";
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "routine": return "정기";
      case "preventive": return "예방";
      case "corrective": return "교정";
      case "emergency": return "응급";
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "routine":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "preventive":
        return "bg-green-50 text-green-700 border-green-200";
      case "corrective":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "emergency":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const totalCost = filteredRecords.reduce((sum, record) => sum + (record.cost || 0), 0);
  const averageDuration = filteredRecords.length > 0 
    ? filteredRecords.reduce((sum, record) => sum + (record.duration || 0), 0) / filteredRecords.length 
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-2 text-lg">정비수리 이력 로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">정비수리 이력</h1>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="bg-blue-50">
            총 {maintenanceRecords.length}건
          </Badge>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">총 비용</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₩{totalCost.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">평균 작업시간</p>
                <p className="text-2xl font-bold text-gray-900">
                  {averageDuration.toFixed(1)}시간
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Wrench className="h-8 w-8 text-teal-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">완료된 작업</p>
                <p className="text-2xl font-bold text-gray-900">
                  {maintenanceRecords.filter(r => r.status === 'completed').length}건
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="크레인 ID, 기술자, 메모로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
                <SelectItem value="in_progress">진행중</SelectItem>
                <SelectItem value="scheduled">예정</SelectItem>
                <SelectItem value="cancelled">취소</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 유형</SelectItem>
                <SelectItem value="routine">정기</SelectItem>
                <SelectItem value="preventive">예방</SelectItem>
                <SelectItem value="corrective">교정</SelectItem>
                <SelectItem value="emergency">응급</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="정렬" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">날짜순</SelectItem>
                <SelectItem value="cost">비용순</SelectItem>
                <SelectItem value="duration">작업시간순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Records */}
      <div className="grid gap-4">
        {filteredRecords.map((record) => (
          <Card key={record.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Wrench className="h-5 w-5 text-teal-600" />
                  <div>
                    <h3 className="font-semibold text-lg">{record.craneId}</h3>
                    <p className="text-sm text-gray-500">
                      {format(new Date(record.date), "yyyy년 MM월 dd일")} · {record.technician}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={`${getStatusColor(record.status)} text-xs`}>
                    {getStatusLabel(record.status)}
                  </Badge>
                  <Badge className={`${getTypeColor(record.type)} text-xs`}>
                    {getTypeLabel(record.type)}
                  </Badge>
                </div>
              </div>

              {record.notes && (
                <div className="mb-4">
                  <h4 className="font-medium text-sm text-gray-700 mb-1">작업 내용</h4>
                  <p className="text-sm text-gray-900">{record.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  {record.duration && (
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {record.duration}시간
                    </span>
                  )}
                  {record.cost && (
                    <span className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      ₩{record.cost.toLocaleString()}
                    </span>
                  )}
                  {record.relatedFailureId && (
                    <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded">
                      관련 고장: #{record.relatedFailureId}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRecords.length === 0 && (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wrench className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                ? "검색 조건에 맞는 정비수리 이력이 없습니다"
                : "정비수리 이력이 없습니다"
              }
            </p>
            <p className="text-sm text-gray-500 text-center">
              구글 스프레드시트에서 정비수리 데이터를 동기화해주세요.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}