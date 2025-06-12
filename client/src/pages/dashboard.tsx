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

  // Fetch failure records for the selected crane
  const { data: failureRecords = [] } = useQuery({
    queryKey: ['/api/failure-records', filters.selectedCrane, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.selectedCrane && filters.selectedCrane !== 'all') {
        params.append('craneName', filters.selectedCrane);
      }
      params.append('startDate', startDate);
      params.append('endDate', endDate);

      const response = await fetch(`/api/failure-records?${params}`);
      if (!response.ok) throw new Error('Failed to fetch failure records');
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

  // Calculate failure statistics from actual data
  const calculateFailureStats = () => {
    if (!failureRecords || failureRecords.length === 0) {
      return {
        totalFailures: 0,
        averageInterval: 0,
        averageWorkTime: 0,
        chartData: []
      };
    }

    // Calculate total failures
    const totalFailures = failureRecords.length;

    // Calculate average failure interval (from 'data' column in days)
    const intervals = failureRecords
      .map((record: any) => record.data)
      .filter((data: any) => data !== null && data !== undefined && !isNaN(data));
    const averageInterval = intervals.length > 0 
      ? intervals.reduce((sum: number, val: number) => sum + val, 0) / intervals.length 
      : 0;

    // Calculate average work time (from 'worktime' column in hours)
    const workTimes = failureRecords
      .map((record: any) => record.worktime)
      .filter((time: any) => time !== null && time !== undefined && !isNaN(time));
    const averageWorkTime = workTimes.length > 0 
      ? workTimes.reduce((sum: number, val: number) => sum + val, 0) / workTimes.length 
      : 0;

    // Group failures by type for chart (using failureType field)
    const typeGroups = failureRecords.reduce((acc: any, record: any) => {
      const type = record.failureType || '기타';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
    const chartData = Object.entries(typeGroups).map(([type, count], index) => ({
      type,
      count,
      color: colors[index % colors.length]
    }));

    return {
      totalFailures,
      averageInterval: Math.round(averageInterval * 10) / 10, // Round to 1 decimal
      averageWorkTime: Math.round(averageWorkTime * 10) / 10, // Round to 1 decimal
      chartData
    };
  };

  const failureStats = calculateFailureStats();

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

  // Helper function to format dates to yyyy-mm-dd
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      
      return date.toISOString().split('T')[0]; // Returns yyyy-mm-dd format
    } catch {
      return dateString.split('T')[0]; // Fallback for already formatted strings
    }
  };

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
            <div className="space-y-3">
              {crane?.installationDate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">설치일자</span>
                  <span className="text-sm font-medium">{formatDate(crane.installationDate)}</span>
                </div>
              )}
              
              {crane?.inspectionReferenceDate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">점검기준일</span>
                  <span className="text-sm font-medium">{formatDate(crane.inspectionReferenceDate)}</span>
                </div>
              )}
              
              {crane?.inspectionCycle && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">정비주기</span>
                  <span className="text-sm font-medium">{crane.inspectionCycle}일</span>
                </div>
              )}
              
              {crane?.leadTime && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">리드타임</span>
                  <span className="text-sm font-medium">{crane.leadTime}일</span>
                </div>
              )}

              {/* Next Inspection Calculation */}
              {(() => {
                if (!crane?.inspectionReferenceDate || !crane?.inspectionCycle) {
                  return (
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <p className="text-sm text-gray-500">점검 정보가 없습니다</p>
                    </div>
                  );
                }

                const referenceDate = new Date(crane.inspectionReferenceDate);
                const nextInspectionDate = new Date(referenceDate);
                nextInspectionDate.setDate(referenceDate.getDate() + crane.inspectionCycle);
                
                const today = new Date();
                const timeDiff = nextInspectionDate.getTime() - today.getTime();
                const daysUntilInspection = Math.ceil(timeDiff / (1000 * 3600 * 24));
                
                const isOverdue = daysUntilInspection < 0;
                const isUrgent = daysUntilInspection <= 7 && !isOverdue;

                return (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">다음 점검일</span>
                      <span className="text-sm font-medium">{formatDate(nextInspectionDate.toISOString())}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">점검까지</span>
                      <span className={`text-sm font-bold ${
                        isOverdue ? 'text-red-600' : 
                        isUrgent ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {isOverdue ? `D+${Math.abs(daysUntilInspection)}` : `D-${daysUntilInspection}`}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isOverdue ? 'bg-red-100 text-red-700' : 
                        isUrgent ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {isOverdue ? '점검 지연' : 
                         isUrgent ? '점검 임박' : '점검 일정 양호'}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Charts and Analysis */}
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
            <DonutChart 
              data={dailyRepairData} 
              title="총 건수" 
              total={craneDetails?.dailyRepairTotal || 0} 
            />
            <div className="mt-4 space-y-2">
              {dailyRepairData.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs">{item.type}</span>
                  </div>
                  <span className="text-xs font-medium">{item.count}</span>
                </div>
              ))}
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
            <DonutChart 
              data={failureStats.chartData} 
              title="총 건수" 
              total={failureStats.totalFailures} 
            />
            <div className="mt-4 space-y-2">
              {failureStats.chartData.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs">{item.type}</span>
                  </div>
                  <span className="text-xs font-medium">{item.count}</span>
                </div>
              ))}
            </div>
            
            {/* Average Statistics */}
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">평균 돌발주기</span>
                <span className="text-sm font-bold text-red-600">
                  {failureStats.averageInterval > 0 ? `${failureStats.averageInterval}일` : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">평균 작업시간</span>
                <span className="text-sm font-bold text-orange-600">
                  {failureStats.averageWorkTime > 0 ? `${failureStats.averageWorkTime}시간` : '-'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inspection Cycle */}
        <Card className="shadow-lg border-0 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>점검주기</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{crane?.inspectionCycle || '-'}일</div>
              <p className="text-sm text-gray-500 mt-2">정기점검 주기</p>
              {crane?.leadTime && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-xl font-semibold">{crane.leadTime}일</div>
                  <p className="text-xs text-gray-500">리드타임</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card className="shadow-lg border-0 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span>주요 지표</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {craneDetails?.mtbfHours || 0}h
                </div>
                <p className="text-xs text-gray-500">MTBF (평균고장간격)</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {craneDetails?.mttrHours || 0}h
                </div>
                <p className="text-xs text-gray-500">MTTR (평균수리시간)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}