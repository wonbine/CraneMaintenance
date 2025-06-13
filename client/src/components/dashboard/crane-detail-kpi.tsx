import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { 
  Factory, Settings, AlertCircle, CheckCircle, Clock, MapPin, Calendar, 
  Activity, AlertTriangle, Wrench, TrendingUp, Gauge, Users, Zap, 
  FileText, BarChart3, PieChart as PieChartIcon, Timer, ClipboardList
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { AISummaryButton } from './ai-summary-button';
import { WorkStandardPopup } from './work-standard-popup';

interface CraneDetailKPIProps {
  selectedCraneId: string;
}

export function CraneDetailKPI({ selectedCraneId }: CraneDetailKPIProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [workStandardPopup, setWorkStandardPopup] = useState({
    isOpen: false,
    taskName: ''
  });

  // First, get all cranes to find the matching crane by name or ID
  const { data: allCranes = [] } = useQuery({
    queryKey: ['/api/cranes'],
    queryFn: async () => {
      const response = await fetch('/api/cranes');
      if (!response.ok) throw new Error('Failed to fetch cranes');
      return response.json();
    }
  });

  // Find the actual crane ID - selectedCraneId might be a crane name or factory name
  const actualCrane = allCranes.find((crane: any) => 
    crane.craneId === selectedCraneId || crane.craneName === selectedCraneId
  );
  const actualCraneId = actualCrane?.craneId;

  // Check if selectedCraneId is a factory name
  const isFactoryView = !actualCrane && allCranes.some((crane: any) => crane.plantSection === selectedCraneId);
  const factoryName = isFactoryView ? selectedCraneId : actualCrane?.plantSection;

  // Fetch crane details using the actual crane ID
  const { data: craneData, isLoading: craneLoading } = useQuery({
    queryKey: ['/api/cranes/by-crane-id', actualCraneId],
    queryFn: async () => {
      const response = await fetch(`/api/cranes/by-crane-id/${actualCraneId}`);
      if (!response.ok) throw new Error('Failed to fetch crane data');
      return response.json();
    },
    enabled: !!actualCraneId && actualCraneId !== 'all'
  });

  // Fetch failure records - if specific crane selected, get crane records, otherwise get factory records
  const { data: failureRecords = [] } = useQuery({
    queryKey: ['/api/failure-records', actualCraneId, factoryName, isFactoryView],
    queryFn: async () => {
      if (actualCraneId && actualCraneId !== 'all' && !isFactoryView) {
        // Get records for specific crane
        const response = await fetch(`/api/failure-records/${actualCraneId}`);
        if (!response.ok) throw new Error('Failed to fetch failure records');
        return response.json();
      } else if (factoryName) {
        // Get all records for the factory
        const response = await fetch(`/api/failure-records/factory/${encodeURIComponent(factoryName)}`);
        if (!response.ok) throw new Error('Failed to fetch factory failure records');
        return response.json();
      }
      return [];
    },
    enabled: (!!actualCraneId && !isFactoryView) || !!factoryName
  });

  // Fetch maintenance records
  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['/api/maintenance-records', actualCraneId],
    queryFn: async () => {
      const response = await fetch(`/api/maintenance-records/${actualCraneId}`);
      if (!response.ok) throw new Error('Failed to fetch maintenance records');
      return response.json();
    },
    enabled: !!actualCraneId && actualCraneId !== 'all'
  });

  if (craneLoading) {
    return (
      <div className="text-center py-12">
        <Factory className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">크레인 데이터를 불러오는 중...</h3>
      </div>
    );
  }

  if (!craneData) {
    return (
      <div className="text-center py-12">
        <Factory className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">선택한 크레인 데이터를 찾을 수 없습니다</h3>
        <p className="text-gray-500">다른 크레인을 선택해 보세요.</p>
      </div>
    );
  }

  // Calculate statistics
  const currentDate = new Date();
  const oneMonthAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate());
  const threeMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, currentDate.getDate());
  const sixMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, currentDate.getDate());

  const totalFailures = failureRecords.length;
  const totalMaintenance = maintenanceRecords.length;

  const recentFailures = failureRecords.filter((record: any) => {
    const recordDate = new Date(record.failureDate);
    return recordDate >= oneMonthAgo;
  }).length;

  const monthlyFailures = failureRecords.filter((record: any) => {
    const recordDate = new Date(record.failureDate);
    return recordDate >= oneMonthAgo;
  }).length;

  const quarterlyFailures = failureRecords.filter((record: any) => {
    const recordDate = new Date(record.failureDate);
    return recordDate >= threeMonthsAgo;
  }).length;

  // Calculate total repair time
  const totalRepairHours = maintenanceRecords.reduce((total: number, record: any) => {
    return total + (record.totalWorkTime || 0);
  }, 0);

  const averageRepairTime = 13; // Fixed value as requested

  // Calculate inspection schedule data
  const inspectionScheduleData = useMemo(() => {
    if (!craneData?.inspectionCycle || !craneData?.inspectionReferenceDate) {
      return [];
    }

    const referenceDate = new Date(craneData.inspectionReferenceDate);
    const inspectionCycleDays = craneData.inspectionCycle;
    const currentDate = new Date();
    
    // Generate next 6 inspection dates
    const scheduleData = [];
    for (let i = 0; i < 6; i++) {
      const inspectionDate = new Date(referenceDate);
      inspectionDate.setDate(referenceDate.getDate() + (inspectionCycleDays * (i + 1)));
      
      const isPast = inspectionDate < currentDate;
      const isUpcoming = inspectionDate >= currentDate && inspectionDate <= new Date(currentDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // Next 30 days
      
      scheduleData.push({
        cycle: `${i + 1}차`,
        date: inspectionDate.toLocaleDateString('ko-KR'),
        daysFromNow: Math.ceil((inspectionDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)),
        status: isPast ? '완료' : (isUpcoming ? '예정' : '대기'),
        color: isPast ? '#10B981' : (isUpcoming ? '#F59E0B' : '#6B7280')
      });
    }
    
    return scheduleData;
  }, [craneData?.inspectionCycle, craneData?.inspectionReferenceDate]);

  // Calculate operational status and health score
  const getOperationalStatus = () => {
    if (recentFailures > 3) return { status: '주의', color: 'text-red-600', bgColor: 'bg-red-100', icon: AlertCircle };
    if (recentFailures > 1) return { status: '점검필요', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Clock };
    return { status: '정상', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle };
  };

  const operationalStatus = getOperationalStatus();
  const StatusIcon = operationalStatus.icon;

  // Calculate health score (0-100)
  const healthScore = Math.max(3, Math.min(100, 100 - (recentFailures * 15) - (quarterlyFailures * 5)));

  // Prepare failure cause distribution
  const failureCauseMap = failureRecords.reduce((acc: any, record: any) => {
    const cause = record.byDevice || '기타';
    acc[cause] = (acc[cause] || 0) + 1;
    return acc;
  }, {});

  const failureCauseData = Object.entries(failureCauseMap).map(([cause, count]) => ({
    name: cause,
    value: count as number,
    percentage: Math.round(((count as number) / totalFailures) * 100)
  }));

  // Prepare monthly trend data with specified failure counts
  const monthlyTrendData = [
    { month: '1월', 돌발작업: 3, 일상수리: 5 },
    { month: '2월', 돌발작업: 3, 일상수리: 8 },
    { month: '3월', 돌발작업: 3, 일상수리: 4 },
    { month: '4월', 돌발작업: 3, 일상수리: 6 },
    { month: '5월', 돌발작업: 3, 일상수리: 7 },
    { month: '6월', 돌발작업: 3, 일상수리: 9 }
  ];

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#f97316'];

  const formatDate = (dateString: string) => {
    if (!dateString) return '정보 없음';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getGradeColor = (grade: string) => {
    const gradeColors = {
      'A': 'bg-green-500',
      'B': 'bg-blue-500', 
      'C': 'bg-yellow-500',
      'D': 'bg-red-500'
    };
    return gradeColors[grade as keyof typeof gradeColors] || 'bg-gray-500';
  };

  const openWorkStandardPopup = (taskName: string) => {
    setWorkStandardPopup({ isOpen: true, taskName: taskName });
  };

  return (
    <div className="space-y-6">
      {/* 크레인 기본 정보 헤더 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{craneData.craneName}</h1>
            <div className="flex items-center space-x-4 text-blue-100">
              <span className="flex items-center space-x-2">
                <Factory className="w-4 h-4" />
                <span>{craneData.plantSection}</span>
              </span>
              <span className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>{craneData.location}</span>
              </span>
              <span className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>{craneData.model}</span>
              </span>
            </div>
          </div>
          <div className="text-right flex flex-col items-end space-y-3">
            <div className="text-4xl font-bold mb-1">{craneData.craneId}</div>
            <Badge className={`${getGradeColor(craneData.grade)} text-white`}>
              등급 {craneData.grade}
            </Badge>
            <AISummaryButton 
              selectedCraneId={craneData.craneId} 
              mode="crane" 
              className="bg-white/20 hover:bg-white/30 border-white/30"
            />
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>종합 현황</span>
          </TabsTrigger>
          <TabsTrigger value="failure-history" className="flex items-center space-x-2">
            <ClipboardList className="w-4 h-4" />
            <span>돌발수리 이력</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="space-y-6">
            {/* KPI 카드들 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* 운영 상태 */}
              <Card className="shadow-lg border-0 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-600">
                    <span>운영 상태</span>
                    <StatusIcon className="w-5 h-5 text-green-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{operationalStatus.status}</div>
                <div className="text-xs text-gray-500">
                  {craneData.unmannedOperation || '정보 없음'}
                </div>
              </div>
              <div className="w-16 h-16">
                <CircularProgressbar
                  value={healthScore}
                  text={`${healthScore}%`}
                  styles={buildStyles({
                    textSize: '20px',
                    pathColor: healthScore > 80 ? '#059669' : healthScore > 60 ? '#d97706' : '#dc2626',
                    textColor: '#374151',
                    trailColor: '#e5e7eb'
                  })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 월간 고장 건수 */}
        <Card className="shadow-lg border-0 rounded-xl bg-gradient-to-br from-red-50 to-rose-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-600">
              <span>월간 고장</span>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{monthlyFailures}</div>
                <div className="text-xs text-gray-500">총 {totalFailures}건</div>
              </div>
              <div className="w-16 h-16">
                <CircularProgressbar
                  value={Math.min(100, (monthlyFailures / 10) * 100)}
                  text={`${monthlyFailures}`}
                  styles={buildStyles({
                    textSize: '20px',
                    pathColor: '#ef4444',
                    textColor: '#374151',
                    trailColor: '#e5e7eb'
                  })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 정비 작업 */}
        <Card className="shadow-lg border-0 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-600">
              <span>정비 작업</span>
              <Wrench className="w-5 h-5 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalMaintenance}</div>
                <div className="text-xs text-gray-500">총 작업수</div>
              </div>
              <div className="w-16 h-16">
                <CircularProgressbar
                  value={Math.min(100, (totalMaintenance / 50) * 100)}
                  text={`${totalMaintenance}`}
                  styles={buildStyles({
                    textSize: '16px',
                    pathColor: '#3b82f6',
                    textColor: '#374151',
                    trailColor: '#e5e7eb'
                  })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 평균 수리시간 */}
        <Card className="shadow-lg border-0 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-600">
              <span>평균 수리시간</span>
              <Timer className="w-5 h-5 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">{averageRepairTime}h</div>
                <div className="text-xs text-gray-500">총 시간</div>
              </div>
              <div className="w-16 h-16">
                <CircularProgressbar
                  value={Math.min(100, (averageRepairTime / 24) * 100)}
                  text={`${averageRepairTime}h`}
                  styles={buildStyles({
                    textSize: '14px',
                    pathColor: '#8b5cf6',
                    textColor: '#374151',
                    trailColor: '#e5e7eb'
                  })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 상세 정보 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 크레인 세부 정보 */}
        <Card className="shadow-lg border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-gray-600" />
              <span>크레인 세부 정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">크레인명</div>
                  <div className="font-medium">{craneData.craneName || '정보 없음'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">설비코드</div>
                  <div className="font-medium">{craneData.craneId}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">등급</div>
                  <div className="font-medium">{craneData.grade || '정보 없음'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">유인/무인</div>
                  <div className="font-medium">{craneData.unmannedOperation || '정보 없음'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">전기담당자</div>
                  <div className="font-medium">{craneData.electricalManager || '정보 없음'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">기계담당자</div>
                  <div className="font-medium">{craneData.mechanicalManager || '정보 없음'}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 월별 작업 추이 */}
        <Card className="shadow-lg border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span>월별 작업 추이</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="돌발작업" fill="#334155" name="돌발작업" />
                <Bar dataKey="일상수리" fill="#475569" name="일상수리" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 고장 원인 분포 */}
        <Card className="shadow-lg border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChartIcon className="w-5 h-5 text-purple-600" />
              <span>고장 원인 분포</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {failureCauseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={failureCauseData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                  >
                    {failureCauseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                고장 데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* 점검 주기 일정 */}
        <Card className="shadow-lg border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <span>점검 주기 일정</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inspectionScheduleData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={inspectionScheduleData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fill: '#000000', fontSize: 12 }} />
                  <YAxis 
                    type="category" 
                    dataKey="cycle" 
                    tick={{ fill: '#000000', fontSize: 12 }}
                    width={50}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      `${value}일`, 
                      '남은 일수'
                    ]}
                    labelFormatter={(label) => `${label} 점검`}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: '14px',
                      color: '#000000'
                    }}
                  />
                  <Bar 
                    dataKey="daysFromNow" 
                    fill="#4F46E5"
                    radius={[0, 4, 4, 0]}
                  >
                    {inspectionScheduleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p>점검 주기 정보가 없습니다</p>
                  <p className="text-sm text-gray-400">점검주기와 기준일자를 확인해주세요</p>
                </div>
              </div>
            )}
            
            {/* 점검 일정 상세 정보 */}
            {inspectionScheduleData.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-sm font-medium text-gray-700 mb-3">점검 일정 상세</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {inspectionScheduleData.slice(0, 4).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium">{item.cycle}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-600">{item.date}</div>
                        <div className="text-xs font-medium" style={{ color: item.color }}>
                          {item.daysFromNow > 0 ? `${item.daysFromNow}일 후` : 
                           item.daysFromNow === 0 ? '오늘' : 
                           `${Math.abs(item.daysFromNow)}일 전`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 최근 작업 내역 */}
        <Card className="shadow-lg border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-green-600" />
              <span>최근 작업 내역</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {maintenanceRecords.slice(0, 5).map((record: any, index: number) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{record.taskName || '작업명 없음'}</div>
                        <button 
                            className="ml-2 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border transition-colors"
                            onClick={() => openWorkStandardPopup(record.taskName || '작업표준')}
                          >
                            작업표준
                          </button>
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(record.actualStartDateTime)}</div>
                    </div>
                    <Badge variant="outline" className="text-xs ml-2">
                      {record.totalWorkTime ? `${record.totalWorkTime}시간` : '시간 미기록'}
                    </Badge>
                  </div>
                </div>
              ))}
              {maintenanceRecords.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  최근 작업 내역이 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="failure-history" className="mt-6">
          {/* 돌발수리 이력 테이블 */}
          <Card className="shadow-lg border-0 rounded-xl">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b">
              <CardTitle className="flex items-center space-x-2">
                <ClipboardList className="h-5 w-5 text-red-600" />
                <span>돌발수리 이력</span>
                <Badge variant="outline" className="ml-2">
                  총 {failureRecords.length}건
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {failureRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-center">발생일자</TableHead>
                        {isFactoryView && <TableHead className="text-center">크레인</TableHead>}
                        <TableHead className="text-center">고장부위</TableHead>
                        <TableHead className="text-center">고장유형</TableHead>
                        <TableHead className="text-center">고장설명</TableHead>
                        <TableHead className="text-center">작업자</TableHead>
                        <TableHead className="text-center">다운타임(시간)</TableHead>
                        <TableHead className="text-center">심각도</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {failureRecords.map((record: any, index: number) => {
                        // Find crane name for this record
                        const recordCrane = allCranes.find((crane: any) => crane.craneId === record.craneId);

                        return (
                          <TableRow key={index} className="hover:bg-gray-50">
                            <TableCell className="text-center">
                              {formatDate(record.date)}
                            </TableCell>
                            {isFactoryView && (
                              <TableCell className="text-center">
                                <div className="text-sm font-medium">
                                  {recordCrane?.craneName || record.craneId}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {record.craneId}
                                </div>
                              </TableCell>
                            )}
                            <TableCell className="text-center">
                              {record.byDevice || '정보없음'}
                            </TableCell>
                            <TableCell className="text-center">
                              {record.failureType || '정보없음'}
                            </TableCell>
                            <TableCell className="text-center">
                              {record.description || '정보없음'}
                            </TableCell>
                            <TableCell className="text-center">
                              {record.reportedBy || '정보없음'}
                            </TableCell>
                            <TableCell className="text-center">
                              {record.downtime ? `${record.downtime}시간` : '정보없음'}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant={record.severity === 'high' ? 'destructive' : record.severity === 'medium' ? 'secondary' : 'default'}
                                className="text-xs"
                              >
                                {record.severity === 'high' ? '높음' : record.severity === 'medium' ? '중간' : '낮음'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">돌발수리 이력이 없습니다</h3>
                  <p className="text-gray-500">현재 선택한 크레인의 돌발수리 기록이 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Work Standard Popup */}
      <WorkStandardPopup
        isOpen={workStandardPopup.isOpen}
        onClose={() => setWorkStandardPopup({ isOpen: false, taskName: '' })}
        taskName={workStandardPopup.taskName}
      />
    </div>
  );
}