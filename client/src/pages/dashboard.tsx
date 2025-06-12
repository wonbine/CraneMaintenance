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

  // Get repair statistics from RepairReport
  const { data: repairStats = { totalRepairs: 0, averageWorkers: 0, averageWorkTime: 0 } } = useQuery({
    queryKey: ['/api/analytics/repair-stats'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/repair-stats');
      if (!response.ok) throw new Error('Failed to fetch repair stats');
      return response.json();
    },
  });

  // Get list of cranes with failure data for user guidance
  const { data: cranesWithData = [] } = useQuery({
    queryKey: ['/api/cranes-with-failure-data'],
    queryFn: async () => {
      const response = await fetch('/api/cranes-with-failure-data');
      if (!response.ok) throw new Error('Failed to fetch cranes with data');
      return response.json();
    },
  });

  // Fetch device failure heatmap data
  const { data: deviceHeatmapData = [] } = useQuery({
    queryKey: ['/api/device-failure-heatmap', filters.selectedCrane, filters.selectedFactory, startDate, endDate],
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

      const response = await fetch(`/api/device-failure-heatmap?${params}`);
      if (!response.ok) throw new Error('Failed to fetch device heatmap data');
      return response.json();
    },
    enabled: !!filters.selectedCrane && filters.selectedCrane !== 'all'
  });

  // Fetch failure type classification data
  const { data: failureTypeData = [] } = useQuery({
    queryKey: ['/api/failure-type-classification', filters.selectedCrane, filters.selectedFactory, startDate, endDate],
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

      const response = await fetch(`/api/failure-type-classification?${params}`);
      if (!response.ok) throw new Error('Failed to fetch failure type data');
      return response.json();
    },
    enabled: !!filters.selectedCrane && filters.selectedCrane !== 'all'
  });

  // Fetch monthly failure statistics data
  const { data: monthlyFailureData = [] } = useQuery({
    queryKey: ['/api/analytics/monthly-failure-stats', filters.selectedCrane, filters.selectedFactory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.selectedCrane && filters.selectedCrane !== 'all') {
        params.append('craneId', craneDetails?.craneId || '');
      }
      if (filters.selectedFactory && filters.selectedFactory !== 'all') {
        params.append('factory', filters.selectedFactory);
      }

      const response = await fetch(`/api/analytics/monthly-failure-stats?${params}`);
      if (!response.ok) throw new Error('Failed to fetch monthly failure data');
      return response.json();
    },
    enabled: !!filters.selectedCrane && filters.selectedCrane !== 'all'
  });

  // Fetch monthly repair time statistics data
  const { data: monthlyRepairTimeData = [] } = useQuery({
    queryKey: ['/api/analytics/monthly-repair-time-stats', filters.selectedCrane, filters.selectedFactory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.selectedCrane && filters.selectedCrane !== 'all') {
        params.append('craneId', craneDetails?.craneId || '');
      }
      if (filters.selectedFactory && filters.selectedFactory !== 'all') {
        params.append('factory', filters.selectedFactory);
      }

      const response = await fetch(`/api/analytics/monthly-repair-time-stats?${params}`);
      if (!response.ok) throw new Error('Failed to fetch monthly repair time data');
      return response.json();
    },
    enabled: !!filters.selectedCrane && filters.selectedCrane !== 'all'
  });

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

  const FailureLineChart = ({ data }: { data: { month: string, count: number }[] }) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>데이터가 없습니다</p>
          </div>
        </div>
      );
    }

    const maxValue = Math.max(...data.map(d => d.count), 1);
    const chartHeight = 200;
    const chartWidth = 400;
    const padding = 50;

    // Create SVG path for the line
    const points = data.map((item, index) => {
      const x = padding + (index * (chartWidth - 2 * padding)) / Math.max(data.length - 1, 1);
      const y = chartHeight - padding - ((item.count / maxValue) * (chartHeight - 2 * padding));
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="space-y-4">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-48">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => (
            <line
              key={i}
              x1={padding}
              y1={chartHeight - padding - percent * (chartHeight - 2 * padding)}
              x2={chartWidth - padding}
              y2={chartHeight - padding - percent * (chartHeight - 2 * padding)}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          
          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="#ef4444"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Data points */}
          {data.map((item, index) => {
            const x = padding + (index * (chartWidth - 2 * padding)) / Math.max(data.length - 1, 1);
            const y = chartHeight - padding - ((item.count / maxValue) * (chartHeight - 2 * padding));
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill="#ef4444"
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
          
          {/* Y-axis labels */}
          {[0, 0.5, 1].map((percent, i) => (
            <text
              key={i}
              x={padding - 10}
              y={chartHeight - padding - percent * (chartHeight - 2 * padding) + 5}
              textAnchor="end"
              className="fill-gray-500 text-xs"
            >
              {Math.round(maxValue * percent)}
            </text>
          ))}
        </svg>
        
        {/* X-axis labels */}
        <div className="flex justify-between text-xs text-gray-500 px-12">
          {data.map((item, index) => (
            <span key={index}>{item.month}</span>
          ))}
        </div>
      </div>
    );
  };

  const RepairTimeLineChart = ({ data }: { data: { month: string, avgRepairTime: number }[] }) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>데이터가 없습니다</p>
          </div>
        </div>
      );
    }

    const maxValue = Math.max(...data.map(d => d.avgRepairTime), 1);
    const chartHeight = 200;
    const chartWidth = 400;
    const padding = 50;

    // Create SVG path for the line
    const points = data.map((item, index) => {
      const x = padding + (index * (chartWidth - 2 * padding)) / Math.max(data.length - 1, 1);
      const y = chartHeight - padding - ((item.avgRepairTime / maxValue) * (chartHeight - 2 * padding));
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="space-y-4">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-48">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => (
            <line
              key={i}
              x1={padding}
              y1={chartHeight - padding - percent * (chartHeight - 2 * padding)}
              x2={chartWidth - padding}
              y2={chartHeight - padding - percent * (chartHeight - 2 * padding)}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          
          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="#22c55e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Data points */}
          {data.map((item, index) => {
            const x = padding + (index * (chartWidth - 2 * padding)) / Math.max(data.length - 1, 1);
            const y = chartHeight - padding - ((item.avgRepairTime / maxValue) * (chartHeight - 2 * padding));
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill="#22c55e"
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
          
          {/* Y-axis labels */}
          {[0, 0.5, 1].map((percent, i) => (
            <text
              key={i}
              x={padding - 10}
              y={chartHeight - padding - percent * (chartHeight - 2 * padding) + 5}
              textAnchor="end"
              className="fill-gray-500 text-xs"
            >
              {Math.round(maxValue * percent * 10) / 10}h
            </text>
          ))}
        </svg>
        
        {/* X-axis labels */}
        <div className="flex justify-between text-xs text-gray-500 px-12">
          {data.map((item, index) => (
            <span key={index}>{item.month}</span>
          ))}
        </div>
      </div>
    );
  };

  const DeviceHeatmap = ({ data }: { data: any[] }) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <div className="mb-2">
            <Activity className="w-8 h-8 mx-auto opacity-50" />
          </div>
          <p>장치별 고장 데이터가 없습니다</p>
        </div>
      );
    }

    // Create a device-failure matrix
    const devices = Array.from(new Set(data.map(d => d.device))).filter(Boolean);
    const categories = Array.from(new Set(data.map(d => d.category))).filter(Boolean);
    
    if (devices.length === 0 || categories.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>히트맵을 생성할 수 있는 데이터가 부족합니다</p>
        </div>
      );
    }

    // Create matrix data
    const matrix = devices.map(device => 
      categories.map(category => {
        const count = data.filter(d => d.device === device && d.category === category).length;
        return { device, category, count };
      })
    ).flat();

    const maxCount = Math.max(...matrix.map(m => m.count), 1);

    return (
      <div className="space-y-4">
        <div className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${categories.length}, 1fr)` }}>
          {/* Header row */}
          <div></div>
          {categories.map(category => (
            <div key={category} className="text-xs font-medium text-center p-2 bg-gray-100 rounded">
              {category}
            </div>
          ))}
          
          {/* Data rows */}
          {devices.map(device => (
            <div key={device} className="contents">
              <div className="text-xs font-medium p-2 bg-gray-100 rounded flex items-center">
                {device}
              </div>
              {categories.map(category => {
                const item = matrix.find(m => m.device === device && m.category === category);
                const count = item?.count || 0;
                const intensity = count / maxCount;
                
                let bgColor = 'bg-gray-50';
                if (count > 0) {
                  if (intensity > 0.7) bgColor = 'bg-red-500';
                  else if (intensity > 0.4) bgColor = 'bg-red-300';
                  else if (intensity > 0.2) bgColor = 'bg-orange-300';
                  else bgColor = 'bg-yellow-200';
                }
                
                return (
                  <div
                    key={`${device}-${category}`}
                    className={`${bgColor} p-2 rounded text-center text-xs font-medium flex items-center justify-center min-h-[40px] ${
                      intensity > 0.5 ? 'text-white' : 'text-gray-800'
                    }`}
                    title={`${device} - ${category}: ${count}건`}
                  >
                    {count > 0 ? count : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
          <span>낮음</span>
          <div className="flex space-x-1">
            <div className="w-4 h-4 bg-gray-50 rounded border"></div>
            <div className="w-4 h-4 bg-yellow-200 rounded"></div>
            <div className="w-4 h-4 bg-orange-300 rounded"></div>
            <div className="w-4 h-4 bg-red-300 rounded"></div>
            <div className="w-4 h-4 bg-red-500 rounded"></div>
          </div>
          <span>높음</span>
        </div>
      </div>
    );
  };

  const HeatmapGrid = ({ data, selectedPart, onPartClick }: { 
    data: any[], 
    selectedPart: string | null, 
    onPartClick: (part: string) => void 
  }) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          장치별 고장 데이터가 없습니다
        </div>
      );
    }

    // Group data by device/part
    const partCounts = data.reduce((acc: any, item: any) => {
      const part = item.device || item.byDevice || '기타';
      acc[part] = (acc[part] || 0) + 1;
      return acc;
    }, {});

    const parts = Object.keys(partCounts);
    const maxCount = Math.max(...Object.values(partCounts) as number[], 1);

    // Create grid layout - aim for roughly square grid
    const gridSize = Math.ceil(Math.sqrt(parts.length));
    const gridCols = Math.min(gridSize, 6); // Max 6 columns for better display

    return (
      <div className="space-y-4">
        <div 
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
        >
          {parts.map(part => {
            const count = partCounts[part];
            const intensity = count / maxCount;
            const isSelected = selectedPart === part;
            
            let bgColor = 'bg-gray-100';
            let textColor = 'text-gray-800';
            
            if (count > 0) {
              if (intensity > 0.7) {
                bgColor = isSelected ? 'bg-red-700' : 'bg-red-500';
                textColor = 'text-white';
              } else if (intensity > 0.4) {
                bgColor = isSelected ? 'bg-red-500' : 'bg-red-300';
                textColor = count > maxCount * 0.5 ? 'text-white' : 'text-gray-800';
              } else if (intensity > 0.2) {
                bgColor = isSelected ? 'bg-orange-500' : 'bg-orange-300';
                textColor = 'text-gray-800';
              } else {
                bgColor = isSelected ? 'bg-yellow-400' : 'bg-yellow-200';
                textColor = 'text-gray-800';
              }
            }
            
            if (isSelected && bgColor === 'bg-gray-100') {
              bgColor = 'bg-blue-200';
            }

            return (
              <button
                key={part}
                onClick={() => onPartClick(part)}
                className={`${bgColor} ${textColor} p-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md border-2 ${
                  isSelected ? 'border-blue-500' : 'border-transparent'
                }`}
                title={`${part}: ${count}건의 고장`}
              >
                <div className="text-center">
                  <div className="font-bold text-lg">{count}</div>
                  <div className="text-xs opacity-90 truncate">{part}</div>
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
          <span>고장 빈도:</span>
          <div className="flex items-center space-x-2">
            <span>낮음</span>
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-gray-100 rounded border"></div>
              <div className="w-3 h-3 bg-yellow-200 rounded"></div>
              <div className="w-3 h-3 bg-orange-300 rounded"></div>
              <div className="w-3 h-3 bg-red-300 rounded"></div>
              <div className="w-3 h-3 bg-red-500 rounded"></div>
            </div>
            <span>높음</span>
          </div>
        </div>
      </div>
    );
  };

  // Show guidance when no crane is selected
  if (!filters.selectedCrane || filters.selectedCrane === 'all') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-xl border-0 rounded-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center py-12">
              <div className="mb-6">
                <Settings className="w-24 h-24 mx-auto text-blue-500 opacity-50" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-800 mb-4">
                크레인을 선택해주세요
              </CardTitle>
              <p className="text-gray-600 text-lg mb-8">
                상세한 크레인 분석 정보를 확인하려면 사이드바에서 특정 크레인을 선택하세요.
              </p>
              
              {cranesWithData.length > 0 && (
                <div className="text-left max-w-2xl mx-auto">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    고장 데이터가 있는 크레인들:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cranesWithData.slice(0, 8).map((crane: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-800">{crane.craneName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {crane.failureCount}건의 고장
                        </Badge>
                      </div>
                    ))}
                  </div>
                  {cranesWithData.length > 8 && (
                    <p className="text-gray-500 text-sm mt-4">
                      총 {cranesWithData.length}개의 크레인에 고장 데이터가 있습니다.
                    </p>
                  )}
                </div>
              )}
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">크레인 데이터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard content
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {filters.selectedCrane} 크레인 분석 대시보드
              </h1>
              <p className="text-gray-600 mt-2">
                {craneDetails?.factory || '공장 정보 없음'} | 기간: {startDate} ~ {endDate}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 px-3 py-1 rounded-full">
                <span className="text-green-800 text-sm font-medium">실시간 연결됨</span>
              </div>
              {craneDetails && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{craneDetails.grade || 'N/A'}</div>
                  <div className="text-sm text-gray-500">크레인 등급</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 크레인 개요 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-blue-500" />
                크레인 개요
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Crane status indicator */}
              <div className="w-full h-32 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center relative">
                <Settings className="w-12 h-12 text-blue-600" />
                <div className="absolute top-2 right-2">
                  {failureStats.totalFailures > 10 ? (
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">크레인명:</span>
                  <span className="font-medium">{filters.selectedCrane}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">공장:</span>
                  <span className="font-medium">{craneDetails?.factory || '정보 없음'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">등급:</span>
                  <span className="font-medium">{craneDetails?.grade || 'N/A'}급</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">운전방식:</span>
                  <span className="font-medium">{craneDetails?.operationType || '정보 없음'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 크레인 상세정보 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-green-500" />
                크레인 상세정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">제조사:</span>
                  <span className="font-medium">{craneDetails?.manufacturer || '정보 없음'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">용량:</span>
                  <span className="font-medium">{craneDetails?.capacity || '정보 없음'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">위치:</span>
                  <span className="font-medium">{craneDetails?.location || '정보 없음'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">상태:</span>
                  <Badge variant={failureStats.totalFailures > 10 ? "destructive" : "default"}>
                    {failureStats.totalFailures > 10 ? '주의' : '정상'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">총 고장 건수:</span>
                  <span className="font-bold text-red-600">{failureStats.totalFailures}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 설치 및 점검정보 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-purple-500" />
                설치 및 점검정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">설치일자:</span>
                  <span className="font-medium">
                    {craneDetails?.installationDate ? 
                      new Date(craneDetails.installationDate).toLocaleDateString('ko-KR') : 
                      '2023년 1월 1일'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">최근점검:</span>
                  <span className="font-medium">
                    {craneDetails?.lastInspectionDate ? 
                      new Date(craneDetails.lastInspectionDate).toLocaleDateString('ko-KR') : 
                      '2024년 3월 15일'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">다음점검:</span>
                  <span className="font-medium">
                    {craneDetails?.nextInspectionDate ? 
                      new Date(craneDetails.nextInspectionDate).toLocaleDateString('ko-KR') : 
                      '2024년 9월 15일'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">점검주기:</span>
                  <span className="font-medium">{craneDetails?.inspectionCycle || '6개월'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 고장 통계 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800 text-center">점검수리 이력</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <DonutChart 
                data={failureStats.chartData} 
                title="돌발수리" 
                total={failureStats.totalFailures} 
              />
              <div className="mt-4 space-y-1">
                <div className="text-sm text-gray-600">
                  평균 간격: {failureStats.averageInterval}일
                </div>
                <div className="text-sm text-gray-600">
                  평균 수리시간: {failureStats.averageWorkTime}시간
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 정비 통계 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800 text-center">일상수리 이력</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle cx="48" cy="48" r="40" fill="transparent" stroke="#e5e7eb" strokeWidth="6"/>
                  <circle 
                    cx="48" 
                    cy="48" 
                    r="40" 
                    fill="transparent" 
                    stroke="#22c55e" 
                    strokeWidth="6"
                    strokeDasharray={`${Math.min(repairStats.totalRepairs * 8, 251.3)} 251.3`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold">{repairStats.totalRepairs}</span>
                  <span className="text-xs text-gray-500">일상수리</span>
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <div className="text-sm text-gray-600">
                  평균 작업자: {repairStats.averageWorkers}명
                </div>
                <div className="text-sm text-gray-600">
                  평균 작업시간: {repairStats.averageWorkTime}시간
                </div>
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
                      <div className="text-xs w-6">A급</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{width: '60%'}}></div>
                      </div>
                      <div className="text-xs text-gray-500">3명</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs w-6">B급</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{width: '40%'}}></div>
                      </div>
                      <div className="text-xs text-gray-500">2명</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs w-6">C급</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{width: '20%'}}></div>
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
                  <div className="text-2xl font-bold text-indigo-600">
                    {failureStats.averageWorkTime || '2.5'}시간
                  </div>
                  <div className="text-sm text-gray-600">평균 수리시간</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">가동률:</span>
                    <span className="text-xs font-medium">
                      {failureStats.totalFailures < 5 ? '95%' : '85%'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">효율성:</span>
                    <span className="text-xs font-medium">
                      {failureStats.totalFailures < 10 ? '양호' : '주의'}
                    </span>
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

        {/* Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 장비별 고장 매트릭스 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-orange-500" />
                장비별 고장 유형 매트릭스
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DeviceHeatmap data={deviceHeatmapData} />
            </CardContent>
          </Card>

          {/* 고장 분포현황 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-red-500" />
                고장 분포현황
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HeatmapGrid 
                data={failureRecords} 
                selectedPart={selectedPart}
                onPartClick={setSelectedPart}
              />
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 월별 고장 추이 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-red-500" />
                월별 고장 발생 추이
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FailureLineChart data={monthlyFailureData} />
            </CardContent>
          </Card>

          {/* 월별 수리시간 추이 */}
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-green-500" />
                월별 평균 수리시간 추이
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RepairTimeLineChart data={monthlyRepairTimeData} />
            </CardContent>
          </Card>
        </div>

        {/* Failure Type Analysis */}
        {failureTypeData.length > 0 && (
          <Card className="shadow-lg border-0 rounded-xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
                <Wrench className="w-5 h-5 mr-2 text-blue-500" />
                고장 유형별 분류
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart data={failureTypeData} />
            </CardContent>
          </Card>
        )}

        {/* Selected Part Details */}
        {selectedPart && (
          <Card className="shadow-lg border-0 rounded-xl bg-white border-blue-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-blue-800 flex items-center justify-between">
                <span className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  {selectedPart} 상세 분석
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedPart(null)}
                >
                  닫기
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const partFailures = failureRecords.filter((record: any) => 
                  (record.byDevice || record.device) === selectedPart
                );
                
                if (partFailures.length === 0) {
                  return <p className="text-gray-500">선택된 부품에 대한 고장 기록이 없습니다.</p>;
                }

                // Group by failure type
                const typeGroups = partFailures.reduce((acc: any, record: any) => {
                  const type = record.failureType || record.category || '기타';
                  if (!acc[type]) acc[type] = [];
                  acc[type].push(record);
                  return acc;
                }, {});

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{partFailures.length}</div>
                        <div className="text-sm text-gray-600">총 고장 건수</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {Object.keys(typeGroups).length}
                        </div>
                        <div className="text-sm text-gray-600">고장 유형 수</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {partFailures.filter((r: any) => r.worktime).length > 0 ? 
                            Math.round(partFailures.reduce((sum: number, r: any) => 
                              sum + (r.worktime || 0), 0) / partFailures.filter((r: any) => r.worktime).length * 10) / 10 : 0
                          }시간
                        </div>
                        <div className="text-sm text-gray-600">평균 수리시간</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">고장 유형별 분포:</h4>
                      <div className="space-y-2">
                        {Object.entries(typeGroups).map(([type, records]: [string, any]) => (
                          <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium">{type}</span>
                            <Badge variant="secondary">{records.length}건</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}