import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Settings, User, HelpCircle, History } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "./empty-state";
import type { Crane } from "@shared/schema";

type SortField = keyof Crane;
type SortOrder = 'asc' | 'desc';

interface CranesTableProps {
  selectedFactory?: string;
  selectedCrane?: string;
}

export function CranesTable({ selectedFactory, selectedCrane }: CranesTableProps = {}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('craneId');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [, setLocation] = useLocation();

  const { data: cranes = [], isLoading } = useQuery<Crane[]>({
    queryKey: ["/api/cranes", selectedFactory, selectedCrane],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedFactory) params.append('factory', selectedFactory);
      if (selectedCrane) params.append('craneName', selectedCrane);
      
      const url = params.toString() 
        ? `/api/cranes/filtered?${params.toString()}`
        : '/api/cranes';
        
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch cranes');
      return response.json();
    },
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

    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [cranes, searchTerm, statusFilter, sortField, sortOrder]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (cranes.length === 0) {
    return <EmptyState type="cranes" />;
  }

  return (
    <div className="w-full">
      {/* Table Header */}
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">크레인</h2>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64 h-9 text-sm border-gray-200 rounded-lg"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] h-9 text-sm border-gray-200 rounded-lg">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="operating">가동중</SelectItem>
                <SelectItem value="maintenance">정비중</SelectItem>
                <SelectItem value="urgent">긴급</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-100 hover:bg-transparent">
              <TableHead className="h-12 px-6 text-xs font-medium text-gray-500 uppercase tracking-wide">
                크레인명 ↕
              </TableHead>
              <TableHead className="h-12 px-6 text-xs font-medium text-gray-500 uppercase tracking-wide">
                설비코드 ↕
              </TableHead>
              <TableHead className="h-12 px-6 text-xs font-medium text-gray-500 uppercase tracking-wide">
                등급 ↕
              </TableHead>
              <TableHead className="h-12 px-6 text-xs font-medium text-gray-500 uppercase tracking-wide">
                유/무인 ↕
              </TableHead>
              <TableHead className="h-12 px-6 text-xs font-medium text-gray-500 uppercase tracking-wide">
                공장 ↕
              </TableHead>
              <TableHead className="h-12 px-6 text-xs font-medium text-gray-500 uppercase tracking-wide">
                상태 ↕
              </TableHead>
              <TableHead className="h-12 px-6 text-xs font-medium text-gray-500 uppercase tracking-wide">
                작업 ↕
              </TableHead>
              <TableHead className="h-12 px-6 text-xs font-medium text-gray-500 uppercase tracking-wide">
                수리 이력
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedCranes.slice(0, 10).map((crane, index) => {
              // Generate avatar color based on crane ID
              const colors = [
                'bg-red-100 text-red-600',
                'bg-blue-100 text-blue-600', 
                'bg-green-100 text-green-600',
                'bg-yellow-100 text-yellow-600',
                'bg-purple-100 text-purple-600',
                'bg-pink-100 text-pink-600',
                'bg-indigo-100 text-indigo-600',
                'bg-orange-100 text-orange-600'
              ];
              const colorClass = colors[index % colors.length];
              
              return (
                <TableRow key={crane.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                        <span className="font-medium text-sm">
                          {crane.craneId.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="font-medium text-gray-900">{crane.craneName || crane.craneId}</div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-500">
                    {crane.craneId}
                  </TableCell>
                  {/* Grade - Enhanced Visual Display */}
                  <TableCell className="px-6 py-4">
                    <Badge 
                      className={`px-3 py-1 text-xs font-bold ${
                        crane.grade === "A급" || crane.grade === "A" 
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : crane.grade === "B급" || crane.grade === "B"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : crane.grade === "C급" || crane.grade === "C"
                          ? "bg-orange-100 text-orange-800 border-orange-200"
                          : "bg-gray-100 text-gray-800 border-gray-200"
                      }`}
                    >
                      {crane.grade || "미분류"}
                    </Badge>
                  </TableCell>
                  {/* Unmanned Operation - Enhanced Visual Display */}
                  <TableCell className="px-6 py-4">
                    <Badge 
                      className={`px-3 py-1 text-xs font-bold ${
                        crane.unmannedOperation === "무인"
                          ? "bg-purple-100 text-purple-800 border-purple-200"
                          : crane.unmannedOperation === "유인"
                          ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                          : "bg-gray-100 text-gray-800 border-gray-200"
                      }`}
                    >
                      <span className="flex items-center space-x-1">
                        {crane.unmannedOperation === "무인" ? (
                          <Settings className="h-3 w-3" />
                        ) : crane.unmannedOperation === "유인" ? (
                          <User className="h-3 w-3" />
                        ) : (
                          <HelpCircle className="h-3 w-3" />
                        )}
                        <span>{crane.unmannedOperation || "정보 없음"}</span>
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-500">
                    {crane.factory || "정보 없음"}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge 
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        crane.status === 'operating' ? 'bg-green-100 text-green-700' :
                        crane.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}
                    >
                      {crane.status === 'operating' ? '가동중' :
                       crane.status === 'maintenance' ? '정비중' : '긴급'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-3 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      onClick={() => setLocation(`/maintenance-history/${crane.craneId}`)}
                    >
                      <History className="h-4 w-4 mr-1" />
                      이력
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="border-t border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
              ← Previous
            </Button>
          </div>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" className="w-8 h-8 text-gray-500 hover:text-gray-700">01</Button>
            <Button variant="ghost" size="sm" className="w-8 h-8 text-gray-500 hover:text-gray-700">02</Button>
            <Button size="sm" className="w-8 h-8 bg-blue-500 text-white hover:bg-blue-600">03</Button>
            <Button variant="ghost" size="sm" className="w-8 h-8 text-gray-500 hover:text-gray-700">04</Button>
            <span className="text-gray-400 mx-1">...</span>
            <Button variant="ghost" size="sm" className="w-8 h-8 text-gray-500 hover:text-gray-700">10</Button>
            <Button variant="ghost" size="sm" className="w-8 h-8 text-gray-500 hover:text-gray-700">11</Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
              Next →
            </Button>
          </div>
        </div>
      </div>

      {filteredAndSortedCranes.length === 0 && searchTerm && (
        <div className="text-center py-12">
          <p className="text-gray-500">검색 결과가 없습니다.</p>
        </div>
      )}
    </div>
  );
}