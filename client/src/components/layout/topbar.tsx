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
    <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      {/* Left side - Page title and filters */}
      <div className="flex items-center space-x-6">
        <h1 className="text-xl font-semibold text-gray-900">대시보드</h1>
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" className="text-gray-600 border-gray-200">
            <span className="mr-2">표시 중</span>
            <span className="font-medium">10</span>
          </Button>
          <Button variant="outline" size="sm" className="text-gray-600 border-gray-200">
            필터
          </Button>
          <Button variant="outline" size="sm" className="text-gray-600 border-gray-200">
            내보내기
          </Button>
        </div>
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

      {/* Right side - Add New Product and Profile */}
      <div className="flex items-center space-x-4">
        <Button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
          + 새 크레인 추가
        </Button>
        
        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative text-gray-400 hover:text-gray-600">
          <Bell className="h-5 w-5" />
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-xs p-0"
          >
            3
          </Badge>
        </Button>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-50">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" alt="Jane Cooper" />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                  JC
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">Jane Cooper</p>
                <p className="text-xs text-gray-500">jane@example.com</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Jane Cooper</p>
                <p className="text-xs leading-none text-muted-foreground">
                  jane@example.com
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