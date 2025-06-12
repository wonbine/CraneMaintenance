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

import { FactoryCraneSelector } from "@/components/dashboard/factory-crane-selector";

export function Topbar() {
  const [selectedPeriod, setSelectedPeriod] = useState("1개월");
  const [selectedFactory, setSelectedFactory] = useState("");
  const [selectedCrane, setSelectedCrane] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateMode, setDateMode] = useState<"period" | "range">("period");

  const handleSearch = () => {
    // 조회 로직 실행
    if (dateMode === "period") {
      console.log("Searching with period:", { selectedFactory, selectedCrane, selectedPeriod });
    } else {
      console.log("Searching with date range:", { selectedFactory, selectedCrane, startDate, endDate });
    }
  };

  const handlePeriodSelect = (period: string) => {
    setSelectedPeriod(period);
    setDateMode("period");
  };

  const handleDateRangeMode = () => {
    setDateMode("range");
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
        {/* Date Range Selection */}
        <div className="flex items-center space-x-3">
          <CalendarDays className="w-5 h-5 text-gray-500" />
          <div className="flex items-center space-x-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDateMode("range");
              }}
              placeholder="시작일자"
              className="h-9 w-[140px] text-sm"
            />
            <span className="text-gray-400 text-sm">~</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDateMode("range");
              }}
              placeholder="종료일자"
              className="h-9 w-[140px] text-sm"
            />
          </div>
        </div>

        {/* Period Selection Buttons */}
        <div className="flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-gray-500" />
          <div className="flex space-x-2">
            <Button
              variant={dateMode === "period" && selectedPeriod === "1개월" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodSelect("1개월")}
              className="h-9 px-4 text-sm"
            >
              1개월
            </Button>
            <Button
              variant={dateMode === "period" && selectedPeriod === "3개월" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodSelect("3개월")}
              className="h-9 px-4 text-sm"
            >
              3개월
            </Button>
            <Button
              variant={dateMode === "period" && selectedPeriod === "6개월" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodSelect("6개월")}
              className="h-9 px-4 text-sm"
            >
              6개월
            </Button>
            <Button
              variant={dateMode === "period" && selectedPeriod === "1년" ? "default" : "outline"}
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
          <SearchIcon className="w-4 h-4" />
          <span className="text-sm">조회</span>
        </Button>
        
        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 flex items-center space-x-2 hover:bg-gray-50 px-3">
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