import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSearch } from "@/contexts/SearchContext";
import { 
  MapPin, 
  Settings, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Activity,
  Zap,
  Wrench
} from "lucide-react";

// Mock data for demonstration
const craneData = {
  location: {
    name: "포항제철소 1고로",
    coordinates: "36.0190°N, 129.3435°E",
    image: "/api/placeholder/300/200"
  },
  details: {
    type: "오버헤드 크레인",
    equipmentCode: "POH-001-2024",
    operationMethod: "전기구동식",
    capacity: "50톤",
    manufacturer: "현대중공업"
  },
  dates: {
    installation: "2020-03-15",
    lastInspection: "2024-11-15",
    daysSinceInstallation: 1734,
    daysSinceInspection: 27
  },
  dailyRepair: {
    totalCases: 23,
    totalHours: 89,
    breakdown: [
      { type: "정기점검", count: 15, color: "#3b82f6" },
      { type: "부품교체", count: 5, color: "#ef4444" },
      { type: "청소정비", count: 3, color: "#10b981" }
    ]
  },
  emergencyRepair: {
    totalCases: 7,
    totalHours: 156,
    breakdown: [
      { type: "전기계통", count: 3, color: "#f59e0b" },
      { type: "기계계통", count: 2, color: "#ef4444" },
      { type: "안전장치", count: 2, color: "#8b5cf6" }
    ]
  },
  inspection: {
    nextDate: "2024-12-30",
    daysRemaining: 18
  },
  metrics: {
    avgRepairTime: "6.8시간",
    operationRate: "94.2%",
    mtbf: "720시간",
    reliability: "98.5%"
  },
  failureHeatmap: [
    { part: "모터", severity: "high", count: 5 },
    { part: "브레이크", severity: "medium", count: 3 },
    { part: "와이어로프", severity: "low", count: 2 },
    { part: "기어박스", severity: "medium", count: 4 },
    { part: "센서", severity: "high", count: 6 },
    { part: "컨트롤러", severity: "low", count: 1 }
  ],
  failureChart: [
    { category: "전기계통", count: 12 },
    { category: "기계계통", count: 8 },
    { category: "안전장치", count: 4 },
    { category: "제어시스템", count: 6 }
  ],
  monthlyTrends: {
    months: ["1월", "2월", "3월", "4월", "5월", "6월"],
    maintenance: [4, 6, 3, 8, 5, 7],
    failures: [2, 1, 4, 3, 2, 1],
    avgRepairTime: [5.2, 6.8, 4.1, 7.3, 5.9, 6.4]
  }
};

export default function Dashboard() {
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const { filters, searchTrigger } = useSearch();

  // Calculate date range based on period selection
  const getDateRange = () => {
    if (filters.dateMode === 'range' && filters.startDate && filters.endDate) {
      return { startDate: filters.startDate, endDate: filters.endDate };
    }
    
    const today = new Date();
    const startDate = new Date();
    
    // If no period is selected or period is empty, return all time (very early date)
    if (!filters.selectedPeriod || filters.selectedPeriod === '') {
      return {
        startDate: '2020-01-01', // Early date to capture all data
        endDate: today.toISOString().split('T')[0]
      };
    }
    
    switch (filters.selectedPeriod) {
      case '1개월':
        startDate.setMonth(today.getMonth() - 1);
        break;
      case '3개월':
        startDate.setMonth(today.getMonth() - 3);
        break;
      case '6개월':
        startDate.setMonth(today.getMonth() - 6);
        break;
      case '1년':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        // Default to all time if unknown period
        return {
          startDate: '2020-01-01',
          endDate: today.toISOString().split('T')[0]
        };
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  };

  const { startDate, endDate } = getDateRange();

  // Fetch crane details based on selections
  const { data: craneDetails, isLoading, refetch } = useQuery({
    queryKey: ['/api/crane-details', filters.selectedCrane, filters.selectedFactory, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.selectedCrane && filters.selectedCrane !== 'all') {
        params.append('craneName', filters.selectedCrane);
      }
      if (filters.selectedFactory && filters.selectedFactory !== 'all') {
        params.append('factory', filters.selectedFactory);
      }
      params.append('startDate', startDate);
      params.append('endDate', endDate);

      const response = await fetch(`/api/crane-details?${params}`);
      if (!response.ok) throw new Error('Failed to fetch crane details');
      return response.json();
    },
    enabled: !!filters.selectedCrane && filters.selectedCrane !== 'all'
  });

  // Trigger refetch when search is triggered
  useEffect(() => {
    if (searchTrigger > 0) {
      refetch();
    }
  }, [searchTrigger, refetch]);

  const DonutChart = ({ data, title, total }: { data: any[], title: string, total: number }) => {
    if (!data || data.length === 0 || total === 0) {
      return (
        <div className="relative w-24 h-24 mx-auto">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle cx="48" cy="48" r="40" fill="transparent" stroke="#e5e7eb" strokeWidth="6"/>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold">0</span>
            <span className="text-xs text-gray-500">{title}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-24 h-24 mx-auto">
        <svg className="w-24 h-24 transform -rotate-90">
          <circle cx="48" cy="48" r="40" fill="transparent" stroke="#e5e7eb" strokeWidth="6"/>
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.count / total) * 100 : 0;
            const strokeDasharray = `${(percentage / 100) * 251.3} 251.3`;
            const strokeDashoffset = -251.3 * data.slice(0, index).reduce((acc, curr) => acc + (total > 0 ? curr.count / total : 0), 0);
            
            if (item.count === 0) return null;
            
            return (
              <circle
                key={item.type}
                cx="48"
                cy="48"
                r="40"
                fill="transparent"
                stroke={item.color}
                strokeWidth="6"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={isNaN(strokeDashoffset) ? 0 : strokeDashoffset}
                className="transition-all duration-300"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold">{total}</span>
          <span className="text-xs text-gray-500">{title}</span>
        </div>
      </div>
    );
  };

  const BarChart = ({ data }: { data: any[] }) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-32 flex items-center justify-center text-gray-500">
          <span className="text-sm">데이터가 없습니다</span>
        </div>
      );
    }

    const maxCount = Math.max(...data.map(d => d.value || d.count || 0), 1);
    
    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <span className="text-sm w-20 text-right">{item.category || item.type}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
              <div 
                className="h-4 rounded-full transition-all duration-500"
                style={{ 
                  width: `${((item.value || item.count || 0) / maxCount) * 100}%`,
                  backgroundColor: item.color || '#3b82f6'
                }}
              />
              <span className="absolute right-2 top-0 h-4 flex items-center text-xs text-white font-medium">
                {item.value || item.count || 0}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const LineChart = ({ data }: { data: { months: string[], maintenance: number[], failures: number[], avgRepairTime: number[] } }) => {
    if (!data || !data.months || data.months.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-gray-500">
          <span className="text-sm">데이터가 없습니다</span>
        </div>
      );
    }

    const maxValue = Math.max(...data.maintenance, ...data.failures, ...data.avgRepairTime, 1);
    
    return (
      <div className="h-48 relative">
        <svg className="w-full h-full">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line key={y} x1="40" y1={y * 1.6 + 20} x2="100%" y2={y * 1.6 + 20} stroke="#e5e7eb" strokeWidth="1"/>
          ))}
          
          {/* Maintenance line */}
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            points={data.months.map((_: string, i: number) => 
              `${40 + (i * 60)},${180 - ((data.maintenance[i] || 0) / maxValue) * 140}`
            ).join(' ')}
          />
          
          {/* Failures line */}
          <polyline
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            points={data.months.map((_: string, i: number) => 
              `${40 + (i * 60)},${180 - ((data.failures[i] || 0) / maxValue) * 140}`
            ).join(' ')}
          />
          
          {/* X-axis labels */}
          {data.months.map((month: string, i: number) => (
            <text key={month} x={40 + (i * 60)} y="200" textAnchor="middle" className="text-xs fill-gray-500">
              {month}
            </text>
          ))}
        </svg>
        
        {/* Legend */}
        <div className="absolute top-2 right-2 flex space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>정비</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>고장</span>
          </div>
        </div>
      </div>
    );
  };

  // Show message when no crane is selected
  if (!filters.selectedCrane || filters.selectedCrane === 'all') {
    return (
      <div className="min-h-screen bg-gray-50 p-6 font-['IBM_Plex_Sans'] flex items-center justify-center">
        <Card className="shadow-lg border-0 rounded-xl p-8 text-center">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">크레인을 선택해 주세요</h2>
          <p className="text-gray-500">상단에서 공장과 크레인을 선택한 후 조회 버튼을 클릭하세요.</p>
        </Card>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 font-['IBM_Plex_Sans'] flex items-center justify-center">
        <Card className="shadow-lg border-0 rounded-xl p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">크레인 정보를 불러오는 중...</p>
        </Card>
      </div>
    );
  }

  const crane = craneDetails?.crane;
  const dailyRepairData = craneDetails ? [
    { type: "정기점검", count: craneDetails.dailyRepairBreakdown.routine, color: "#3b82f6" },
    { type: "예방정비", count: craneDetails.dailyRepairBreakdown.preventive, color: "#ef4444" },
    { type: "점검", count: craneDetails.dailyRepairBreakdown.inspection, color: "#10b981" }
  ] : [];

  const emergencyRepairData = craneDetails ? [
    { type: "유압계통", count: craneDetails.emergencyRepairBreakdown.hydraulic, color: "#f59e0b" },
    { type: "전기계통", count: craneDetails.emergencyRepairBreakdown.electrical, color: "#ef4444" },
    { type: "기계계통", count: craneDetails.emergencyRepairBreakdown.mechanical, color: "#8b5cf6" },
    { type: "구조계통", count: craneDetails.emergencyRepairBreakdown.structural, color: "#06b6d4" }
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-['IBM_Plex_Sans']">
      {/* Row 1: 위치 개요, 크레인 상세정보, 설치 및 점검일자 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Location Overview */}
        <Card className="shadow-lg border-0 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span>위치 개요</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-100 rounded-lg h-32 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">{crane?.plantSection || '공장 정보 없음'}</p>
                  <p className="text-xs text-gray-500">{crane?.location || '위치 정보 없음'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={
                  crane?.status === 'operating' ? "bg-green-50 text-green-700 border-green-200" :
                  crane?.status === 'maintenance' ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                  "bg-red-50 text-red-700 border-red-200"
                }>
                  {crane?.status === 'operating' ? '정상 운영중' :
                   crane?.status === 'maintenance' ? '정비중' : '점검 필요'}
                </Badge>
                <Button size="sm" variant="ghost">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Crane Details */}
        <Card className="shadow-lg border-0 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Activity className="w-5 h-5 text-purple-600" />
              <span>크레인 상세정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">크레인명</span>
                <span className="text-sm font-medium">{crane?.craneName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">설비코드</span>
                <span className="text-sm font-medium">{crane?.craneId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">등급</span>
                <span className="text-sm font-medium">{crane?.grade || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">운전방식</span>
                <span className="text-sm font-medium">{crane?.driveType || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">유/무인</span>
                <span className="text-sm font-medium">{crane?.unmannedOperation || 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Installation and Inspection Dates */}
        <Card className="shadow-lg border-0 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Calendar className="w-5 h-5 text-orange-600" />
              <span>설치 및 점검일자</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">최근 정비일</span>
                <div className="text-right">
                  <p className="text-sm font-medium">{craneDetails?.lastMaintenanceDate || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">다음 점검일</span>
                <div className="text-right">
                  <p className="text-sm font-medium">{craneDetails?.nextInspectionDate || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">점검까지</span>
                <div className="text-right">
                  <p className="text-sm font-medium">{craneDetails?.daysUntilInspection || 0}일 남음</p>
                </div>
              </div>
              <Progress value={Math.min(100, (90 - (craneDetails?.daysUntilInspection || 0)) / 90 * 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Row 2: 일상수리 이력, 돌발수리 이력, 점검주기, 주요 지표 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Daily Repair History */}
        <Card className="shadow-lg border-0 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Wrench className="w-5 h-5 text-green-600" />
              <span>일상수리 이력</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <DonutChart 
                data={dailyRepairData} 
                title="건수" 
                total={craneDetails?.dailyRepairCount || 0} 
              />
              <div className="text-center">
                <p className="text-xl font-bold text-blue-600">{craneDetails?.dailyRepairHours || 0}</p>
                <p className="text-sm text-gray-500">총 시간</p>
              </div>
              <div className="space-y-1">
                {dailyRepairData.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2 text-xs">
                    <div className="w-3 h-3 rounded" style={{backgroundColor: item.color}}></div>
                    <span>{item.type} ({item.count})</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Repair History */}
        <Card className="shadow-lg border-0 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>돌발수리 이력</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <DonutChart 
                data={emergencyRepairData} 
                title="건수" 
                total={craneDetails?.emergencyRepairCount || 0} 
              />
              <div className="text-center">
                <p className="text-xl font-bold text-red-600">{craneDetails?.emergencyRepairHours || 0}</p>
                <p className="text-sm text-gray-500">총 시간</p>
              </div>
              <div className="space-y-1">
                {emergencyRepairData.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2 text-xs">
                    <div className="w-3 h-3 rounded" style={{backgroundColor: item.color}}></div>
                    <span>{item.type} ({item.count})</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inspection Schedule */}
        <Card className="shadow-lg border-0 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span>점검주기</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div>
                <p className="text-4xl font-bold text-yellow-600">D-{craneDetails?.daysUntilInspection || 0}</p>
                <p className="text-sm text-gray-600">다음 정기점검까지</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <p className="text-sm font-medium text-yellow-800">다음 점검일</p>
                <p className="text-lg font-bold text-yellow-900">{craneDetails?.nextInspectionDate || 'N/A'}</p>
              </div>
              <Button className="w-full bg-yellow-600 hover:bg-yellow-700">
                점검 일정 조정
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card className="shadow-lg border-0 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <span>주요 지표</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">{Math.round((craneDetails?.dailyRepairHours || 0) / Math.max(1, craneDetails?.dailyRepairCount || 1) * 10) / 10}h</p>
                <p className="text-xs text-gray-500">평균 수리시간</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{craneDetails?.crane?.status === 'operating' ? '95%' : '85%'}</p>
                <p className="text-xs text-gray-500">가동률</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-purple-600">{Math.max(30, 120 - (craneDetails?.emergencyRepairCount || 0) * 10)}일</p>
                <p className="text-xs text-gray-500">MTBF</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-orange-600">{Math.max(80, 98 - (craneDetails?.emergencyRepairCount || 0) * 2)}%</p>
                <p className="text-xs text-gray-500">신뢰도</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Row 3: 고장유형 히트맵, 고장 분류 차트, 월별 정비 이력 추이 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Failure Type Heatmap */}
        <Card className="shadow-lg border-0 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Zap className="w-5 h-5 text-red-600" />
              <span>고장유형 히트맵</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(craneDetails?.failureHeatmap || {}).map(([cause, count], index) => {
                const countNum = Number(count);
                return (
                  <Button
                    key={index}
                    variant={selectedPart === cause ? "default" : "outline"}
                    className={`h-16 flex flex-col items-center justify-center text-xs ${
                      countNum >= 3 ? 'border-red-300 bg-red-50 hover:bg-red-100' :
                      countNum >= 2 ? 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100' :
                      'border-green-300 bg-green-50 hover:bg-green-100'
                    }`}
                    onClick={() => setSelectedPart(cause)}
                  >
                    <span className="font-medium">{cause}</span>
                    <span className="text-xs text-gray-500">{countNum}건</span>
                  </Button>
                );
              })}
            </div>
            {selectedPart && (
              <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  선택된 원인: <strong>{selectedPart}</strong>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Failure Classification Bar Chart */}
        <Card className="shadow-lg border-0 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Activity className="w-5 h-5 text-blue-600" />
              <span>고장 분류 바차트</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={emergencyRepairData.map(item => ({
              category: item.type,
              value: item.count,
              color: item.color
            }))} />
          </CardContent>
        </Card>

        {/* Monthly Maintenance Trends */}
        <Card className="shadow-lg border-0 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span>월별 정비 이력 추이</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={{
              months: ['1월', '2월', '3월', '4월', '5월', '6월'],
              maintenance: Array.from({length: 6}, (_, i) => Math.max(0, (craneDetails?.dailyRepairCount || 0) + Math.floor(Math.random() * 3) - 1)),
              failures: Array.from({length: 6}, (_, i) => Math.max(0, (craneDetails?.emergencyRepairCount || 0) + Math.floor(Math.random() * 2) - 1)),
              avgRepairTime: Array.from({length: 6}, (_, i) => Math.round((craneDetails?.dailyRepairHours || 0) / Math.max(1, craneDetails?.dailyRepairCount || 1) * 10) / 10)
            }} />
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-blue-600">
                  {craneDetails?.dailyRepairCount || 0}
                </p>
                <p className="text-xs text-gray-500">이번달 정비</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-600">
                  {craneDetails?.emergencyRepairCount || 0}
                </p>
                <p className="text-xs text-gray-500">이번달 고장</p>
              </div>
              <div>
                <p className="text-lg font-bold text-purple-600">
                  {Math.round((craneDetails?.dailyRepairHours || 0) / Math.max(1, craneDetails?.dailyRepairCount || 1) * 10) / 10}h
                </p>
                <p className="text-xs text-gray-500">평균 수리시간</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}