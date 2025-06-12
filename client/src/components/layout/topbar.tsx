import { useState } from "react";
import { Bell, User, Calendar, Filter, Search as SearchIcon, CalendarDays } from "lucide-react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSearch } from "@/contexts/SearchContext";
import { FactoryCraneSelector } from "@/components/dashboard/factory-crane-selector";

export function Topbar() {
  const { filters, updateFilters, triggerSearch } = useSearch();

  const handleSearch = () => {
    triggerSearch();
  };

  const handlePeriodSelect = (period: string) => {
    updateFilters({ selectedPeriod: period, dateMode: "period" });
  };

  const handleDateRangeMode = () => {
    updateFilters({ dateMode: "range" });
  };

  const handleSelectionChange = (factory?: string, crane?: string) => {
    updateFilters({ 
      selectedFactory: factory || "", 
      selectedCrane: crane || "" 
    });
  };

  return (
    <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      {/* Left side - Factory and Crane Selection */}
      <div className="flex items-center space-x-4">
        <FactoryCraneSelector onSelectionChange={handleSelectionChange} />
      </div>

      {/* Right side - Date Selection, Search Button and Profile */}
      <div className="flex items-center space-x-6">
        {/* Date Range Selection */}
        <div className="flex items-center space-x-3">
          <CalendarDays className="w-5 h-5 text-gray-500" />
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => {
                  updateFilters({ startDate: e.target.value, dateMode: "range" });
                }}
                className={`h-9 w-[140px] text-sm rounded-lg ${!filters.startDate ? 'text-transparent' : ''}`}
                style={!filters.startDate ? { color: 'transparent' } : {}}
              />
              {!filters.startDate && (
                <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                  <span className="text-sm text-gray-400">전체 기간</span>
                </div>
              )}
            </div>
            <span className="text-gray-400 text-sm">~</span>
            <div className="relative">
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => {
                  updateFilters({ endDate: e.target.value, dateMode: "range" });
                }}
                className={`h-9 w-[140px] text-sm rounded-lg ${!filters.endDate ? 'text-transparent' : ''}`}
                style={!filters.endDate ? { color: 'transparent' } : {}}
              />
              {!filters.endDate && (
                <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                  <span className="text-sm text-gray-400">전체 기간</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Period Selection Buttons */}
        <div className="flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-gray-500" />
          <div className="flex space-x-2">
            
            <Button
              variant={filters.dateMode === "period" && filters.selectedPeriod === "1개월" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodSelect("1개월")}
              className="h-9 px-4 text-sm"
            >
              1개월
            </Button>
            <Button
              variant={filters.dateMode === "period" && filters.selectedPeriod === "3개월" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodSelect("3개월")}
              className="h-9 px-4 text-sm"
            >
              3개월
            </Button>
            <Button
              variant={filters.dateMode === "period" && filters.selectedPeriod === "6개월" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodSelect("6개월")}
              className="h-9 px-4 text-sm"
            >
              6개월
            </Button>
            <Button
              variant={filters.dateMode === "period" && filters.selectedPeriod === "1년" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodSelect("1년")}
              className="h-9 px-4 text-sm"
            >
              1년
            </Button>
          </div>
        </div>

        {/* Search Button */}
        <Button 
          onClick={handleSearch}
          className="bg-blue-500 hover:bg-blue-600 text-white h-9 px-5 rounded-lg flex items-center space-x-2"
        >
          <SearchIcon className="w-5 h-5" />
          <span className="text-sm">조회</span>
        </Button>
        
        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 flex items-center space-x-2 hover:bg-gray-50 px-3 rounded-lg">
              <Avatar className="h-7 w-7">
                <AvatarImage src="" alt="Jane Cooper" />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
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