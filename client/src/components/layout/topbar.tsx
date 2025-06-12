import { useState } from "react";
import { Search, Bell, User, MapPin, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Crane } from "@shared/schema";

export function Topbar() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);

  const { data: cranes = [] } = useQuery<Crane[]>({
    queryKey: ["/api/cranes"],
  });

  const filteredCranes = searchTerm.length > 0 ? cranes.filter(crane =>
    crane.craneId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crane.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crane.model.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5) : [];

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setShowResults(value.length > 0);
  };
  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Left side - could be used for breadcrumbs or additional navigation */}
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-500">관리자 대시보드</span>
      </div>

      {/* Center - Search */}
      <div className="flex-1 max-w-md mx-8 relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="크레인 ID, 위치, 모델 검색..."
            className="pl-10 w-full bg-gray-50 border-gray-200 focus:bg-white"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            onFocus={() => searchTerm.length > 0 && setShowResults(true)}
          />
        </div>
        
        {/* Search Results */}
        {showResults && filteredCranes.length > 0 && (
          <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg border">
            <div className="p-2 max-h-80 overflow-y-auto">
              {filteredCranes.map((crane) => (
                <div
                  key={crane.id}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  onClick={() => {
                    setSearchTerm("");
                    setShowResults(false);
                  }}
                >
                  <div className="flex-shrink-0">
                    {crane.status === 'operating' ? (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    ) : crane.status === 'maintenance' ? (
                      <Wrench className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {crane.craneId}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />
                      <span>{crane.location}</span>
                      <span>•</span>
                      <span>{crane.model}</span>
                    </div>
                  </div>
                  <Badge 
                    variant={crane.status === 'operating' ? 'default' : crane.status === 'maintenance' ? 'secondary' : 'destructive'}
                    className="text-xs"
                  >
                    {crane.status === 'operating' ? '가동중' : crane.status === 'maintenance' ? '정비중' : '긴급'}
                  </Badge>
                </div>
              ))}
              {filteredCranes.length === 5 && (
                <div className="text-center py-2 text-xs text-gray-500 border-t">
                  더 많은 결과가 있습니다. 검색어를 구체화해보세요.
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Right side - Notifications and Profile */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
              >
                3
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>알림</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">크레인 4P1001183 정비 필요</p>
                <p className="text-xs text-gray-500">다음 정비까지 2일 남음</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">긴급 고장 발생</p>
                <p className="text-xs text-gray-500">크레인 4P1029392에서 전기적 문제 발생</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">월간 정비 보고서 완료</p>
                <p className="text-xs text-gray-500">11월 정비 현황 업데이트됨</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center">
              <span className="text-sm text-teal-600">모든 알림 보기</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" alt="관리자" />
                <AvatarFallback className="bg-teal-100 text-teal-700">
                  관리
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">시스템 관리자</p>
                <p className="text-xs leading-none text-muted-foreground">
                  admin@company.com
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              프로필 설정
            </DropdownMenuItem>
            <DropdownMenuItem>
              설정
            </DropdownMenuItem>
            <DropdownMenuItem>
              도움말
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}