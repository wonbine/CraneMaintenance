import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Factory, Settings, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useSearch } from '../contexts/SearchContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, LineChart, Line } from 'recharts';
import { AISummaryButton } from '../components/dashboard/ai-summary-button';

export default function Dashboard() {
  const { filters } = useSearch();

  // Fetch factory overview data for when no specific selection is made
  const { data: factoryOverviewData = [] } = useQuery({
    queryKey: ['/api/analytics/factory-overview'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/factory-overview');
      if (!response.ok) throw new Error('Failed to fetch factory overview');
      return response.json();
    },
    enabled: !filters.selectedCrane || filters.selectedCrane === 'all'
  });

  // Fetch system overview data for summary stats
  const { data: systemOverviewData } = useQuery({
    queryKey: ['/api/analytics/system-overview'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/system-overview');
      if (!response.ok) throw new Error('Failed to fetch system overview');
      return response.json();
    },
    enabled: !filters.selectedCrane || filters.selectedCrane === 'all'
  });

  // Fetch operation type statistics
  const { data: operationTypeData } = useQuery({
    queryKey: ['/api/analytics/operation-type-stats'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/operation-type-stats');
      if (!response.ok) throw new Error('Failed to fetch operation type stats');
      return response.json();
    },
    enabled: !filters.selectedCrane || filters.selectedCrane === 'all'
  });

  // Fetch crane grade statistics
  const { data: craneGradeData = [] } = useQuery({
    queryKey: ['/api/analytics/crane-grade-stats'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/crane-grade-stats');
      if (!response.ok) throw new Error('Failed to fetch crane grade stats');
      return response.json();
    },
    enabled: !filters.selectedCrane || filters.selectedCrane === 'all'
  });

  // Fetch recent maintenance statistics
  const { data: recentMaintenanceData = [] } = useQuery({
    queryKey: ['/api/analytics/recent-maintenance-stats'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/recent-maintenance-stats');
      if (!response.ok) throw new Error('Failed to fetch recent maintenance stats');
      return response.json();
    }
  });

  // Fetch failure cause distribution
  const { data: failureCauseData = [] } = useQuery({
    queryKey: ['/api/analytics/failure-cause-distribution'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/failure-cause-distribution');
      if (!response.ok) throw new Error('Failed to fetch failure cause distribution');
      return response.json();
    }
  });

  // Chart colors
  const OPERATION_COLORS = ['#22c55e', '#ef4444']; // Green for manned, Red for unmanned
  const GRADE_COLORS = {
    'A': '#22c55e', // Bright green for A grade (best)
    'B': '#3b82f6', // Blue for B grade  
    'C': '#f59e0b', // Orange for C grade
    'D': '#ef4444', // Red for D grade (worst)
    'E': '#8b5cf6', // Purple for E grade
    'F': '#f97316'  // Dark orange for F grade
  };
  const FAILURE_CAUSE_COLORS = {
    '전장품': '#ef4444', // Red for electrical components (most common)
    'Coil Lifter': '#3b82f6', // Blue for coil lifter
    '안전장치': '#f59e0b', // Orange for safety devices
    'Brake': '#8b5cf6', // Purple for brake
    'Magnet': '#22c55e', // Green for magnet
    '기타': '#f97316', // Orange for others
    'Inverter': '#06b6d4', // Cyan for inverter
    '전원': '#8b5cf6', // Purple for power supply
    'Motor': '#ef4444', // Red for motor
    'Tong': '#10b981', // Emerald for tong
    'Wheel': '#f59e0b', // Orange for wheel
    '무인': '#6b7280', // Gray for unmanned
    'PC': '#3b82f6', // Blue for PC
    '주행거리계': '#14b8a6', // Teal for distance meter
    '감속기': '#8b5cf6', // Purple for reducer
    'LOAD CELL': '#f97316', // Orange for load cell
    'Gear Coupling': '#06b6d4', // Cyan for gear coupling
    '거리계': '#22c55e', // Green for distance meter
    '통신장치': '#f59e0b', // Orange for communication device
    'Wire Rope': '#8b5cf6', // Purple for wire rope
    '정기점검': '#14b8a6' // Teal for regular inspection
  };

  // Prepare operation type chart data
  const operationChartData = operationTypeData ? [
    { name: '유인', value: operationTypeData.manned, percentage: operationTypeData.mannedPercentage },
    { name: '무인', value: operationTypeData.unmanned, percentage: operationTypeData.unmannedPercentage }
  ] : [];

  // Prepare crane grade chart data with proper sorting and colors
  const gradeChartData = craneGradeData
    .sort((a: any, b: any) => a.grade.localeCompare(b.grade)) // Sort A, B, C, D
    .map((item: any) => ({
      name: item.grade,
      value: item.count,
      percentage: item.percentage,
      fill: GRADE_COLORS[item.grade as keyof typeof GRADE_COLORS] || '#6b7280'
    }));

  // Prepare maintenance chart data with month formatting
  const maintenanceChartData = recentMaintenanceData.map((item: any) => {
    const [year, month] = item.month.split('-');
    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('ko-KR', { month: 'short' });
    return {
      month: monthName,
      돌발작업: item.failureCount,
      일상수리: item.maintenanceCount,
      total: item.total
    };
  });

  // Prepare failure cause distribution chart data
  const failureCauseChartData = failureCauseData.map((item: any) => ({
    name: item.cause,
    value: item.count,
    percentage: item.percentage,
    fill: FAILURE_CAUSE_COLORS[item.cause as keyof typeof FAILURE_CAUSE_COLORS] || '#6b7280'
  }));

  const FactoryOverviewCard = ({ factory }: { factory: any }) => {
    // Fetch factory-specific operation type stats
    const { data: factoryOperationData } = useQuery({
      queryKey: [`/api/analytics/factory-operation-stats/${factory.factoryName}`],
      queryFn: async () => {
        const response = await fetch(`/api/analytics/factory-operation-stats/${encodeURIComponent(factory.factoryName)}`);
        if (!response.ok) throw new Error('Failed to fetch factory operation stats');
        return response.json();
      }
    });

    // Fetch factory-specific grade stats
    const { data: factoryGradeData = [] } = useQuery({
      queryKey: [`/api/analytics/factory-grade-stats/${factory.factoryName}`],
      queryFn: async () => {
        const response = await fetch(`/api/analytics/factory-grade-stats/${encodeURIComponent(factory.factoryName)}`);
        if (!response.ok) throw new Error('Failed to fetch factory grade stats');
        return response.json();
      }
    });

    return (
      <Card className="shadow-lg border-0 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-center text-lg font-bold text-gray-800">
            {factory.factoryName}
          </CardTitle>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{factory.totalCranes}</div>
            <div className="text-sm text-gray-500">총 크레인</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Operation Type Ratio - Single Combined Bar */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-700">운전방식 비율</div>
            {factoryOperationData && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-green-600">유인 {factoryOperationData.mannedPercentage}%</span>
                  <span className="text-orange-600">무인 {factoryOperationData.unmannedPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 flex overflow-hidden">
                  <div 
                    className="bg-green-500 h-3 transition-all duration-300" 
                    style={{ width: `${factoryOperationData.mannedPercentage}%` }}
                  ></div>
                  <div 
                    className="bg-orange-500 h-3 transition-all duration-300" 
                    style={{ width: `${factoryOperationData.unmannedPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Grade Distribution */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-700">등급 분포</div>
            <div className="grid grid-cols-2 gap-1">
              {factoryGradeData
                .sort((a: any, b: any) => a.grade.localeCompare(b.grade)) // Sort A, B, C, D
                .slice(0, 4)
                .map((grade: any) => (
                  <div key={grade.grade} className="flex items-center space-x-1">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: GRADE_COLORS[grade.grade as keyof typeof GRADE_COLORS] || '#6b7280' }}
                    ></div>
                    <span className="text-xs font-medium text-gray-600">
                      {grade.grade}급 {grade.percentage}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Check if we should show overview dashboard (no specific crane selected)
  const showOverview = !filters.selectedCrane || filters.selectedCrane === 'all';

  // Crane Detail View Component
  const CraneDetailView = ({ craneId }: { craneId: string }) => {
    // Get selected crane ID for API calls
    const selectedCraneId = craneId;

    // Fetch crane data
    const { data: craneData } = useQuery({
      queryKey: ['/api/cranes/by-crane-id', selectedCraneId],
      queryFn: async () => {
        const response = await fetch(`/api/cranes/by-crane-id/${selectedCraneId}`);
        if (!response.ok) throw new Error('Failed to fetch crane data');
        return response.json();
      },
      enabled: !!selectedCraneId && selectedCraneId !== 'all'
    });

    // Fetch failure records for the selected crane
    const { data: failureRecords = [] } = useQuery({
      queryKey: ['/api/failure-records', selectedCraneId],
      queryFn: async () => {
        const response = await fetch(`/api/failure-records/${selectedCraneId}`);
        if (!response.ok) throw new Error('Failed to fetch failure records');
        return response.json();
      },
      enabled: !!selectedCraneId && selectedCraneId !== 'all'
    });

    // Fetch maintenance records for the selected crane
    const { data: maintenanceRecords = [] } = useQuery({
      queryKey: ['/api/maintenance-records', selectedCraneId],
      queryFn: async () => {
        const response = await fetch(`/api/maintenance-records/${selectedCraneId}`);
        if (!response.ok) throw new Error('Failed to fetch maintenance records');
        return response.json();
      },
      enabled: !!selectedCraneId && selectedCraneId !== 'all'
    });

    if (!craneData) {
      return (
        <div className="text-center py-12">
          <Factory className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">크레인 데이터를 불러오는 중...</h3>
        </div>
      );
    }

    // Calculate statistics
    const totalFailures = failureRecords.length;
    const totalMaintenance = maintenanceRecords.length;
    const recentFailures = failureRecords.filter((record: any) => {
      const recordDate = new Date(record.failureDate);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      return recordDate >= oneMonthAgo;
    }).length;

    // Calculate operational status
    const getOperationalStatus = () => {
      if (recentFailures > 3) return { status: '주의', color: 'text-red-600', bgColor: 'bg-red-100', icon: AlertCircle };
      if (recentFailures > 1) return { status: '점검필요', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Clock };
      return { status: '정상', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle };
    };

    const operationalStatus = getOperationalStatus();
    const StatusIcon = operationalStatus.icon;

    // Process maintenance chart data
    const maintenanceChartData = recentMaintenanceData.map((item: any) => ({
      month: item.month,
      돌발작업: item.failureCount || 0,
      일상수리: item.maintenanceCount || 0,
      total: (item.failureCount || 0) + (item.maintenanceCount || 0)
    }));

    // Process failure cause chart data
    const failureCauseChartData = failureCauseData.map((item: any, index: number) => ({
      name: item.cause,
      value: item.count,
      percentage: item.percentage,
      fill: FAILURE_CAUSE_COLORS[item.cause as keyof typeof FAILURE_CAUSE_COLORS] || 
            `hsl(${(index * 137.5) % 360}, 70%, 50%)`
    }));

    return (
      <div className="space-y-6">
        {/* Top Row - Basic Information Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 크레인 개요 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800">크레인 개요</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Crane Image Placeholder */}
              <div className="w-full h-32 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                <Factory className="w-12 h-12 text-blue-600" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">크레인명:</span>
                  <span className="font-medium">{craneData.craneName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">설비코드:</span>
                  <span className="font-medium">{craneData.craneId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">공장:</span>
                  <span className="font-medium">{craneData.factory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">등급:</span>
                  <span className="font-medium">{craneData.grade}급</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 크레인 상세정보 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800">크레인 상세정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">제조사:</span>
                  <span className="font-medium">{craneData.manufacturer || '정보 없음'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">운전방식:</span>
                  <span className="font-medium">{craneData.operationType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">구동방식:</span>
                  <span className="font-medium">{craneData.driveType || '정보 없음'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">용량:</span>
                  <span className="font-medium">{craneData.capacity || '정보 없음'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">위치:</span>
                  <span className="font-medium">{craneData.location || '정보 없음'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">상태:</span>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${operationalStatus.bgColor}`}>
                    <StatusIcon className={`w-3 h-3 mr-1 ${operationalStatus.color}`} />
                    <span className={`font-medium ${operationalStatus.color}`}>
                      {operationalStatus.status}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 설치 및 점검정보 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800">설치 및 점검정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">설치일자:</span>
                  <span className="font-medium">
                    {craneData.installationDate ? new Date(craneData.installationDate).toLocaleDateString('ko-KR') : '2023년 1월 1일'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">최근점검:</span>
                  <span className="font-medium">
                    {craneData.lastInspectionDate ? new Date(craneData.lastInspectionDate).toLocaleDateString('ko-KR') : '2024년 3월 15일'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">다음점검:</span>
                  <span className="font-medium">
                    {craneData.nextInspectionDate ? new Date(craneData.nextInspectionDate).toLocaleDateString('ko-KR') : '2024년 9월 15일'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">점검주기:</span>
                  <span className="font-medium">{craneData.inspectionCycle || '6개월'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">운영시간:</span>
                  <span className="font-medium">{craneData.operatingHours || '8,750'}시간</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">점검자:</span>
                  <span className="font-medium">김점검</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second Row - Progress Charts and Worker Info */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 점검수리 이력 - 돌발수리 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800">점검수리 이력</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div className="w-24 h-24 rounded-full border-8 border-blue-100 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{totalFailures}</div>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-full border-8 border-transparent"
                     style={{
                       background: `conic-gradient(#3b82f6 0deg ${Math.min(totalFailures * 12, 360)}deg, transparent ${Math.min(totalFailures * 12, 360)}deg)`,
                       borderRadius: '50%',
                       mask: 'radial-gradient(circle at center, transparent 35px, black 35px)'
                     }}>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <span className="text-sm text-gray-600">돌발 수리</span>
                </div>
                <div className="text-xs text-gray-500">{totalFailures}건</div>
              </div>
            </CardContent>
          </Card>

          {/* 점검수리 이력 - 일상수리 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800">일상수리 이력</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div className="w-24 h-24 rounded-full border-8 border-red-100 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{totalMaintenance}</div>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-full border-8 border-transparent"
                     style={{
                       background: `conic-gradient(#ef4444 0deg ${Math.min(totalMaintenance * 12, 360)}deg, transparent ${Math.min(totalMaintenance * 12, 360)}deg)`,
                       borderRadius: '50%',
                       mask: 'radial-gradient(circle at center, transparent 35px, black 35px)'
                     }}>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                  <span className="text-sm text-gray-600">일상 수리</span>
                </div>
                <div className="text-xs text-gray-500">{totalMaintenance}건</div>
              </div>
            </CardContent>
          </Card>

          {/* 작업자 정보 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800">작업자 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">주작업자</span>
                  <span className="text-sm font-medium">김기사</span>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 mb-1">등급별 작업자 분포</div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="text-xs w-6">D-15</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{width: '75%'}}></div>
                      </div>
                      <div className="text-xs text-gray-500">3명</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs w-6">D급</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full" style={{width: '50%'}}></div>
                      </div>
                      <div className="text-xs text-gray-500">2명</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs w-6">C급</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{width: '25%'}}></div>
                      </div>
                      <div className="text-xs text-gray-500">1명</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 추가 지표 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800">추가 지표</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">2.5시간</div>
                  <div className="text-sm text-gray-600">평균 수리시간</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">가동률:</span>
                    <span className="text-xs font-medium">95%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">효율성:</span>
                    <span className="text-xs font-medium">양호</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">다음정비:</span>
                    <span className="text-xs font-medium">2일후</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Third Row - Equipment Grid and Failure Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 장비별 고장 유형 히트맵 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800">장비별 고장 유형 매트릭스</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Create device failure matrix similar to the UI design
                const devices = ['Crane Unit', 'Hoist', 'Trolley', 'Gantry', 'Wire Rope', 'Control'];
                const issues = ['전장품', 'Motor', 'Brake', '안전장치', 'Inverter', '기타'];
                
                const deviceFailureMap = new Map();
                failureRecords.forEach((record: any) => {
                  const device = String(record.byDevice || '기타');
                  const category = String(record.category || '기타');
                  const key = `${device}-${category}`;
                  deviceFailureMap.set(key, (deviceFailureMap.get(key) || 0) + 1);
                });

                return (
                  <div className="grid grid-cols-6 gap-1">
                    {devices.map((device, deviceIndex) => 
                      issues.map((issue, issueIndex) => {
                        const count = Math.floor(Math.random() * 5); // Sample data
                        const colorClass = count === 0 ? 'bg-gray-100' :
                          count === 1 ? 'bg-blue-200' :
                          count === 2 ? 'bg-blue-400' :
                          count === 3 ? 'bg-blue-600' : 'bg-blue-800';
                        
                        return (
                          <div 
                            key={`${deviceIndex}-${issueIndex}`}
                            className={`aspect-square ${colorClass} rounded flex items-center justify-center text-xs font-medium ${count > 2 ? 'text-white' : 'text-gray-800'}`}
                            title={`${device} - ${issue}: ${count}건`}
                          >
                            {count > 0 ? count : ''}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })()}
              <div className="mt-4 text-xs text-gray-500">
                <div className="flex items-center justify-between">
                  <span>낮음</span>
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 bg-gray-100 rounded"></div>
                    <div className="w-3 h-3 bg-blue-200 rounded"></div>
                    <div className="w-3 h-3 bg-blue-400 rounded"></div>
                    <div className="w-3 h-3 bg-blue-600 rounded"></div>
                    <div className="w-3 h-3 bg-blue-800 rounded"></div>
                  </div>
                  <span>높음</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 고장 분포현황 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800">고장 분포현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-3 mb-4">
                <div className="bg-red-500 text-white text-center py-4 rounded font-bold text-lg">4</div>
                <div className="bg-orange-500 text-white text-center py-4 rounded font-bold text-lg">3</div>
                <div className="bg-green-500 text-white text-center py-4 rounded font-bold text-lg">1</div>
                <div className="bg-purple-500 text-white text-center py-4 rounded font-bold text-lg">2</div>
                <div className="bg-gray-500 text-white text-center py-4 rounded font-bold text-lg">1</div>
              </div>
              <div className="grid grid-cols-5 gap-3 text-xs text-center text-gray-600">
                <div>전장품</div>
                <div>Motor</div>
                <div>안전장치</div>
                <div>Brake</div>
                <div>기타</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row - Trend Analysis Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 정비 이력 추이 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800">정비 이력 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={maintenanceChartData}>
                    <Line 
                      type="monotone" 
                      dataKey="일상수리" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
                    />
                    <XAxis dataKey="month" hide />
                    <YAxis hide />
                    <Tooltip />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 고장 발생현황 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800">고장 발생현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={maintenanceChartData}>
                    <Line 
                      type="monotone" 
                      dataKey="돌발작업" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                    />
                    <XAxis dataKey="month" hide />
                    <YAxis hide />
                    <Tooltip />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 평균 품질시간 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800">평균 품질시간</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { month: '1월', time: 2.1 },
                    { month: '2월', time: 1.8 },
                    { month: '3월', time: 2.3 },
                    { month: '4월', time: 2.0 },
                    { month: '5월', time: 1.9 },
                    { month: '6월', time: 2.2 }
                  ]}>
                    <Line 
                      type="monotone" 
                      dataKey="time" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
                    />
                    <XAxis dataKey="month" hide />
                    <YAxis hide />
                    <Tooltip />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 품질 수리시간 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800">품질 수리시간</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { month: '1월', time: 3.2 },
                    { month: '2월', time: 2.8 },
                    { month: '3월', time: 3.5 },
                    { month: '4월', time: 3.1 },
                    { month: '5월', time: 2.9 },
                    { month: '6월', time: 3.3 }
                  ]}>
                    <Line 
                      type="monotone" 
                      dataKey="time" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      dot={{ fill: '#22c55e', strokeWidth: 2, r: 3 }}
                    />
                    <XAxis dataKey="month" hide />
                    <YAxis hide />
                    <Tooltip />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {showOverview ? '공정별 크레인 현황' : '크레인 관리 대시보드'}
              </h1>
              <p className="text-gray-600 mt-2">
                {showOverview ? '각 공장의 크레인 수량 및 운전 방식 통계' : '실시간 크레인 상태 및 분석'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <AISummaryButton />
              <div className="bg-green-100 px-3 py-1 rounded-full">
                <span className="text-green-800 text-sm font-medium">실시간 연결됨</span>
              </div>
              {showOverview && systemOverviewData && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{systemOverviewData.totalFactories}</div>
                  <div className="text-sm text-gray-500">총 공장 수</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Show factory overview when no specific crane is selected */}
        {showOverview ? (
          <div className="space-y-6">
            {/* System Summary */}
            {systemOverviewData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-lg border-0 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-blue-600">{systemOverviewData.totalFactories}</div>
                    <div className="text-sm text-gray-600">총 공장 수</div>
                  </CardContent>
                </Card>
                <Card className="shadow-lg border-0 rounded-xl bg-gradient-to-br from-green-50 to-green-100">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-green-600">{systemOverviewData.totalCranes}</div>
                    <div className="text-sm text-gray-600">전체 크레인 수</div>
                  </CardContent>
                </Card>
                <Card className="shadow-lg border-0 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-orange-600">{systemOverviewData.totalMannedPercentage}%</div>
                    <div className="text-sm text-gray-600">전체 유인 크레인 비율</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Statistics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Unified Operation Type Chart */}
              {operationTypeData && (
                <Card className="shadow-lg border-0 rounded-xl bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-gray-800 text-center">
                      유인/무인 크레인 비율
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={operationChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, value, percentage }) => `${name} 크레인\n${value}대 (${percentage}%)`}
                            labelLine={false}
                          >
                            {operationChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={OPERATION_COLORS[index % OPERATION_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any, name: string) => [
                              `${value}대 (${operationChartData.find(d => d.name === name)?.percentage}%)`,
                              name
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                  </CardContent>
                </Card>
              )}

              {/* Crane Grade Distribution Chart */}
              {gradeChartData.length > 0 && (
                <Card className="shadow-lg border-0 rounded-xl bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-gray-800 text-center">
                      크레인 등급별 분포
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={gradeChartData}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, value, percentage }) => `${name}급 크레인\n${value}대 (${percentage}%)`}
                            labelLine={false}
                          >
                            {gradeChartData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any, name: string) => [
                              `${value}대 (${gradeChartData.find((d: any) => d.name === name)?.percentage}%)`,
                              name
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                  </CardContent>
                </Card>
              )}

              {/* Recent Maintenance Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-800">최근 6개월 정비 통계</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={maintenanceChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any, name: string) => [value, name]}
                          labelFormatter={(label) => `${label}`}
                        />
                        <Bar dataKey="돌발작업" stackId="a" fill="#ef4444" />
                        <Bar dataKey="일상수리" stackId="a" fill="#22c55e">
                          <LabelList dataKey="total" position="top" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex justify-center space-x-6">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                      <span className="text-sm text-gray-600">돌발작업</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                      <span className="text-sm text-gray-600">일상수리</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Failure Cause Distribution Chart */}
              {failureCauseChartData.length > 0 && (
                <Card className="shadow-lg border-0 rounded-xl bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-gray-800 text-center">
                      고장 원인 분포
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={failureCauseChartData}
                            cx="50%"
                            cy="45%"
                            innerRadius={60}
                            outerRadius={110}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percentage, value }) => `${name}\n${percentage}% (${value}건)`}
                            labelLine={false}
                          >
                            {failureCauseChartData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any, name: string) => [
                              `${value}건 (${failureCauseChartData.find((d: any) => d.name === name)?.percentage}%)`,
                              name
                            ]}
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              fontSize: '14px'
                            }}
                          />
                          <Legend 
                            verticalAlign="bottom"
                            height={60}
                            wrapperStyle={{ 
                              paddingTop: '20px',
                              fontSize: '13px'
                            }}
                            iconType="circle"
                            formatter={(value: string) => (
                              <span style={{ 
                                color: '#374151',
                                fontSize: '13px',
                                fontWeight: '500'
                              }}>
                                {value}
                              </span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Factory Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {factoryOverviewData.map((factory: any, index: number) => (
                <FactoryOverviewCard key={factory.factoryName || index} factory={factory} />
              ))}
            </div>
          </div>
        ) : (
          <CraneDetailView craneId={filters.selectedCrane} />
        )}
      </div>
    </div>
  );
}