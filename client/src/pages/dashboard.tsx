import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Factory, Settings, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useSearch } from '../contexts/SearchContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, LineChart, Line } from 'recharts';

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

  // Crane details component for when a specific crane is selected
  const CraneDetails = ({ selectedCraneId }: { selectedCraneId: string }) => {
    // Fetch specific crane data
    const { data: craneData } = useQuery({
      queryKey: ['/api/cranes', selectedCraneId],
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

    // Fetch maintenance statistics for charts
    const { data: recentMaintenanceData = [] } = useQuery({
      queryKey: ['/api/analytics/recent-maintenance-stats'],
      queryFn: async () => {
        const response = await fetch('/api/analytics/recent-maintenance-stats');
        if (!response.ok) throw new Error('Failed to fetch recent maintenance stats');
        return response.json();
      }
    });

    // Fetch failure cause distribution for charts
    const { data: failureCauseData = [] } = useQuery({
      queryKey: ['/api/analytics/failure-cause-distribution'],
      queryFn: async () => {
        const response = await fetch('/api/analytics/failure-cause-distribution');
        if (!response.ok) throw new Error('Failed to fetch failure cause distribution');
        return response.json();
      }
    });

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

    return (
      <div className="space-y-6">
        {/* Crane Information Header */}
        <Card className="shadow-lg border-0 rounded-xl bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{craneData.craneName}</h2>
                <p className="text-gray-600">크레인 ID: {craneData.craneId}</p>
                <p className="text-sm text-gray-500">{craneData.factory} | {craneData.operationType} | {craneData.grade}급</p>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center px-3 py-1 rounded-full ${operationalStatus.bgColor}`}>
                  <StatusIcon className={`w-4 h-4 mr-2 ${operationalStatus.color}`} />
                  <span className={`text-sm font-medium ${operationalStatus.color}`}>
                    {operationalStatus.status}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-lg border-0 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600">{totalFailures}</div>
              <div className="text-sm text-gray-600">총 고장 건수</div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 rounded-xl bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600">{totalMaintenance}</div>
              <div className="text-sm text-gray-600">총 정비 건수</div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-orange-600">{recentFailures}</div>
              <div className="text-sm text-gray-600">최근 1개월 고장</div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-purple-600">{craneData.grade}</div>
              <div className="text-sm text-gray-600">크레인 등급</div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* Recent Records */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Failure Records */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                최근 고장 기록
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {failureRecords.slice(0, 10).map((record: any) => (
                  <div key={record.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800">{record.byDevice || '알 수 없음'}</p>
                        <p className="text-sm text-gray-600">{record.category || '기타'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{new Date(record.failureDate).toLocaleDateString()}</p>
                        {record.repairTime && (
                          <p className="text-xs text-blue-600">{record.repairTime}시간</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {failureRecords.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    고장 기록이 없습니다
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Maintenance Records */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-green-500" />
                최근 정비 기록
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {maintenanceRecords.slice(0, 10).map((record: any) => (
                  <div key={record.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800">{record.workType || '정비'}</p>
                        <p className="text-sm text-gray-600">{record.description || '정비 작업'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{new Date(record.maintenanceDate).toLocaleDateString()}</p>
                        {record.workers && (
                          <p className="text-xs text-green-600">{record.workers}명</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {maintenanceRecords.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    정비 기록이 없습니다
                  </div>
                )}
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
          <CraneDetails selectedCraneId={filters.selectedCrane} />
        )}
      </div>
    </div>
  );
}