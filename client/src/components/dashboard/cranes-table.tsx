import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "./empty-state";
import type { Crane } from "@shared/schema";

type SortField = keyof Crane;
type SortOrder = 'asc' | 'desc';

export function CranesTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('craneId');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const { data: cranes = [], isLoading } = useQuery<Crane[]>({
    queryKey: ["/api/cranes"],
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4" />;
    }
    return sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const filteredAndSortedCranes = useMemo(() => {
    let filtered = cranes.filter(crane => {
      const matchesSearch = 
        crane.craneId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crane.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crane.model.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || crane.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      const aValue = a[sortField] ?? '';
      const bValue = b[sortField] ?? '';
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [cranes, searchTerm, statusFilter, sortField, sortOrder]);

  const exportToCSV = () => {
    const headers = ['크레인ID', '상태', '위치', '모델', '마지막정비일', '다음정비일', '긴급여부'];
    const rows = filteredAndSortedCranes.map(crane => [
      crane.craneId,
      crane.status,
      crane.location,
      crane.model,
      crane.lastMaintenanceDate || '',
      crane.nextMaintenanceDate || '',
      crane.isUrgent ? '예' : '아니오'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cranes_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      operating: "default",
      maintenance: "secondary", 
      urgent: "destructive"
    } as const;

    const labels = {
      operating: "운영중",
      maintenance: "정비중",
      urgent: "긴급"
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex space-x-4">
                <div className="h-10 bg-gray-200 rounded w-64"></div>
                <div className="h-10 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="space-y-3">
              <div className="h-12 bg-gray-100 rounded"></div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-50 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cranes.length === 0) {
    return <EmptyState type="cranes" />;
  }

  return (
    <div className="space-y-6">
      {/* Table Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="크레인ID, 위치, 모델로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="operating">운영중</SelectItem>
                  <SelectItem value="maintenance">정비중</SelectItem>
                  <SelectItem value="urgent">긴급</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={exportToCSV} 
                variant="outline"
                className="whitespace-nowrap"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV 내보내기
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('craneId')}
                      className="h-auto p-0 font-semibold"
                    >
                      크레인 ID
                      {getSortIcon('craneId')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('status')}
                      className="h-auto p-0 font-semibold"
                    >
                      상태
                      {getSortIcon('status')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('location')}
                      className="h-auto p-0 font-semibold"
                    >
                      위치
                      {getSortIcon('location')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('model')}
                      className="h-auto p-0 font-semibold"
                    >
                      모델
                      {getSortIcon('model')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('lastMaintenanceDate')}
                      className="h-auto p-0 font-semibold"
                    >
                      마지막 정비일
                      {getSortIcon('lastMaintenanceDate')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('nextMaintenanceDate')}
                      className="h-auto p-0 font-semibold"
                    >
                      다음 정비일
                      {getSortIcon('nextMaintenanceDate')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('isUrgent')}
                      className="h-auto p-0 font-semibold"
                    >
                      긴급 여부
                      {getSortIcon('isUrgent')}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedCranes.map((crane) => (
                  <TableRow key={crane.id}>
                    <TableCell className="font-medium">{crane.craneId}</TableCell>
                    <TableCell>{getStatusBadge(crane.status)}</TableCell>
                    <TableCell>{crane.location}</TableCell>
                    <TableCell>{crane.model}</TableCell>
                    <TableCell>
                      {crane.lastMaintenanceDate 
                        ? new Date(crane.lastMaintenanceDate).toLocaleDateString('ko-KR')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {crane.nextMaintenanceDate 
                        ? new Date(crane.nextMaintenanceDate).toLocaleDateString('ko-KR')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {crane.isUrgent ? (
                        <Badge variant="destructive">긴급</Badge>
                      ) : (
                        <Badge variant="outline">일반</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600">
              총 {cranes.length}개 중 {filteredAndSortedCranes.length}개 표시
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}