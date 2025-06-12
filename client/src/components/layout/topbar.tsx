import { useState } from "react";
import { Bell, User, Calendar, Filter, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { FactoryCraneSelector } from "@/components/dashboard/factory-crane-selector";

export function Topbar() {
  const [selectedPeriod, setSelectedPeriod] = useState("1개월");
  const [selectedFactory, setSelectedFactory] = useState("");
  const [selectedCrane, setSelectedCrane] = useState("");

  const handleSearch = () => {
    // 조회 로직 실행
    console.log("Searching with:", { selectedFactory, selectedCrane, selectedPeriod });
  };

  const handleSelectionChange = (factory?: string, crane?: string) => {
    setSelectedFactory(factory || "");
    setSelectedCrane(crane || "");
  };

  return (
    <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      {/* Left side - Factory and Crane Selection */}
      <div className="flex items-center space-x-4">
        <FactoryCraneSelector onSelectionChange={handleSelectionChange} />
      </div>

      {/* Right side - Date Selection, Search Button and Profile */}
      <div className="flex items-center space-x-4">
        {/* Date Period Selection */}
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[120px] h-9 text-sm">
              <SelectValue placeholder="기간 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1개월">최근 1개월</SelectItem>
              <SelectItem value="3개월">최근 3개월</SelectItem>
              <SelectItem value="6개월">최근 6개월</SelectItem>
              <SelectItem value="1년">최근 1년</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Button */}
        <Button 
          onClick={handleSearch}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <SearchIcon className="w-4 h-4" />
          <span>조회</span>
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