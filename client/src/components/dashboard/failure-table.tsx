import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { FailureRecord } from "@shared/schema";

type SortField = keyof FailureRecord;
type SortOrder = 'asc' | 'desc';

export function FailureTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: records = [], isLoading } = useQuery<FailureRecord[]>({
    queryKey: ["/api/failure-records"],
  });

  const filteredAndSortedRecords = useMemo(() => {
    let filtered = records.filter(record => {
      const matchesSearch = searchTerm === "" || 
        record.craneId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.cause?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.reportedBy?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === "" || record.failureType === typeFilter;
      
      return matchesSearch && matchesType;
    });

    // Sort records
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = "";
      if (bValue === null || bValue === undefined) bValue = "";
      
      // Convert to string for comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (sortOrder === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });

    return filtered;
  }, [records, searchTerm, typeFilter, sortField, sortOrder]);

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedRecords, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedRecords.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronsUpDown className="w-4 h-4" />;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      critical: "bg-red-100 text-red-800",
      high: "bg-orange-100 text-orange-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-blue-100 text-blue-800"
    };
    
    return (
      <Badge className={variants[severity as keyof typeof variants] || "bg-gray-100 text-gray-800"}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const variants = {
      hydraulic: "bg-blue-100 text-blue-800",
      electrical: "bg-yellow-100 text-yellow-800",
      mechanical: "bg-green-100 text-green-800",
      structural: "bg-purple-100 text-purple-800"
    };
    
    return (
      <Badge className={variants[type as keyof typeof variants] || "bg-gray-100 text-gray-800"}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const exportToCsv = () => {
    const headers = ["크레인 ID", "날짜", "고장 유형", "설명", "심각도", "다운타임", "원인", "보고자"];
    const csvContent = [
      headers.join(","),
      ...filteredAndSortedRecords.map(record => [
        record.craneId,
        record.date,
        record.failureType,
        `"${record.description}"`,
        record.severity,
        record.downtime || "",
        `"${record.cause || ""}"`,
        record.reportedBy || ""
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "failure-records.csv";
    a.click();
    window.URL.revokeObjectURL(url);
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

  return (
    <div className="space-y-6">
      {/* Table Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="고장 기록 검색..."
              className="pl-10 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="모든 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">모든 유형</SelectItem>
              <SelectItem value="hydraulic">유압</SelectItem>
              <SelectItem value="electrical">전기</SelectItem>
              <SelectItem value="mechanical">기계</SelectItem>
              <SelectItem value="structural">구조</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={exportToCsv} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          CSV 내보내기
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100 px-6 py-3"
                    onClick={() => handleSort('craneId')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>크레인 ID</span>
                      {getSortIcon('craneId')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100 px-6 py-3"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>날짜</span>
                      {getSortIcon('date')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100 px-6 py-3"
                    onClick={() => handleSort('failureType')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>고장 유형</span>
                      {getSortIcon('failureType')}
                    </div>
                  </TableHead>
                  <TableHead className="px-6 py-3">설명</TableHead>
                  <TableHead className="px-6 py-3">심각도</TableHead>
                  <TableHead className="px-6 py-3">다운타임</TableHead>
                  <TableHead className="px-6 py-3">원인</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      고장 기록을 찾을 수 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((record) => (
                    <TableRow key={record.id} className="hover:bg-gray-50">
                      <TableCell className="px-6 py-4 font-medium">
                        {record.craneId}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {new Date(record.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {getTypeBadge(record.failureType)}
                      </TableCell>
                      <TableCell className="px-6 py-4 max-w-xs">
                        <div className="truncate" title={record.description}>
                          {record.description}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {getSeverityBadge(record.severity)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {record.downtime ? `${record.downtime}시간` : '-'}
                      </TableCell>
                      <TableCell className="px-6 py-4 max-w-xs">
                        <div className="truncate" title={record.cause || ''}>
                          {record.cause || '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  이전
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  다음
                </Button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">
                      {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSortedRecords.length)}
                    </span>
                    부터{" "}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, filteredAndSortedRecords.length)}
                    </span>
                    까지, 총{" "}
                    <span className="font-medium">{filteredAndSortedRecords.length}</span>개 결과
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="rounded-r-none"
                    >
                      이전
                    </Button>
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="rounded-none"
                        >
                          {page}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-l-none"
                    >
                      다음
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}