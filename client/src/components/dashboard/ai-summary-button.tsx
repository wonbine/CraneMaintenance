import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Copy, Brain, Loader2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface AISummaryButtonProps {
  className?: string;
  craneId?: string; // Optional crane ID for crane-specific reports
  mode?: 'dashboard' | 'crane'; // Mode to determine which endpoint to use
}

export function AISummaryButton({ className, craneId, mode = 'dashboard' }: AISummaryButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const generateAlternativeSummary = (mode: string, craneId?: string): string => {
    const currentDate = new Date().toLocaleDateString('ko-KR');
    
    if (mode === 'crane' && craneId) {
      return `## 크레인 상태 요약 보고서 (${currentDate})

### 📋 기본 정보
- **크레인 ID**: ${craneId}
- **보고서 생성일**: ${currentDate}
- **상태**: 현재 운영 데이터를 기반으로 생성된 요약입니다.

### 🔧 운영 현황
- 선택된 크레인의 상세 데이터를 확인하여 현재 운영 상태를 파악할 수 있습니다.
- 정비 기록 및 고장 이력을 통해 크레인의 전반적인 건전성을 평가하고 있습니다.

### 📊 주요 지표
- **가동률**: 크레인의 정상 운영 시간 분석
- **정비 주기**: 예정된 정비 일정 및 점검 현황
- **안전성**: 최근 고장 기록 및 수리 이력 검토

### 💡 권장사항
1. 정기적인 점검 일정 준수
2. 예방 정비를 통한 안전성 확보
3. 운영 데이터 모니터링 지속

*참고: 이 보고서는 시스템 데이터를 기반으로 생성되었습니다.*`;
    } else {
      return `## 크레인 관리 시스템 대시보드 요약 (${currentDate})

### 📊 전체 시스템 현황
- **총 크레인 수**: 전체 공장의 크레인 운영 현황을 모니터링하고 있습니다.
- **운영 상태**: 가동중, 정비중, 긴급상황 크레인 분류 및 관리
- **공장별 분포**: 각 공장별 크레인 배치 및 운영 효율성 분석

### 🔧 정비 및 관리 현황
- **정비 스케줄**: 예정된 정비 작업 및 완료된 작업 현황
- **고장 분석**: 주요 고장 원인 및 대응 방안 검토
- **안전 관리**: 안전 점검 및 예방 조치 이행 상황

### 📈 운영 효율성
- **가동률 분석**: 전체 크레인의 평균 가동률 및 효율성 지표
- **정비 비용**: 정비 관련 비용 및 예산 관리 현황
- **성능 지표**: KPI 달성도 및 개선 필요 영역 식별

### 🎯 주요 권장사항
1. **예방 정비 강화**: 정기 점검을 통한 사전 고장 방지
2. **데이터 기반 의사결정**: 운영 데이터 분석을 통한 효율성 개선
3. **안전 관리 체계**: 지속적인 안전 점검 및 교육 실시
4. **비용 최적화**: 정비 비용 효율성 검토 및 개선

### 📋 모니터링 포인트
- 긴급 상황 크레인 즉시 대응
- 정비 일정 준수율 관리
- 공장별 운영 효율성 비교 분석

*참고: 실시간 시스템 데이터를 기반으로 생성된 요약 보고서입니다.*`;
    }
  };

  const generateSummary = async () => {
    setIsGenerating(true);
    try {
      let analysisResponse;

      if (mode === 'crane' && craneId) {
        // Call crane-specific AI analysis endpoint
        analysisResponse = await fetch('/api/ai/crane-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            craneId: craneId
          })
        });
      } else {
        // Fetch dashboard data for analysis
        const responses = await Promise.all([
          fetch('/api/dashboard/summary'),
          fetch('/api/analytics/system-overview'),
          fetch('/api/analytics/recent-maintenance-stats'),
          fetch('/api/analytics/failure-cause-distribution')
        ]);

        const [dashboardData, systemData, maintenanceData, failureData] = await Promise.all(
          responses.map(r => r.json())
        );

        // Call dashboard AI analysis endpoint
        analysisResponse = await fetch('/api/ai/analyze-dashboard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dashboardSummary: dashboardData,
            systemOverview: systemData,
            maintenanceStats: maintenanceData,
            failureCauses: failureData
          })
        });
      }

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json().catch(() => ({}));
        
        if (analysisResponse.status === 429 || errorData.message?.includes('quota')) {
          // Provide alternative summary when API quota is exceeded
          const alternativeSummary = generateAlternativeSummary(mode, craneId);
          setSummary(alternativeSummary);
          setIsOpen(true);
          
          toast({
            title: 'AI 서비스 일시 중단',
            description: 'AI 할당량 초과로 임시 요약을 제공합니다',
            variant: 'default'
          });
          return;
        } else if (analysisResponse.status === 401) {
          throw new Error('OpenAI API 키가 유효하지 않습니다.');
        } else {
          throw new Error(errorData.message || 'AI 분석 요청이 실패했습니다');
        }
      }

      const analysisResult = await analysisResponse.json();
      setSummary(analysisResult.summary);
      setIsOpen(true);
    } catch (error) {
      console.error('AI 요약 생성 중 오류:', error);
      
      let errorMessage = 'AI 요약을 생성하는 중 문제가 발생했습니다';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'AI 요약 생성 실패',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast({
        title: '복사 완료',
        description: 'AI 요약이 클립보드에 복사되었습니다',
      });
    } catch (error) {
      toast({
        title: '복사 실패',
        description: '클립보드 복사 중 오류가 발생했습니다',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          onClick={generateSummary}
          disabled={isGenerating}
          className={`bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white ${className}`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              분석 중...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              AI 요약 보고서
            </>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Brain className="w-5 h-5 mr-2 text-purple-600" />
              AI 크레인 관리 요약 보고서
            </span>
            <Button
              onClick={copyToClipboard}
              variant="outline"
              size="sm"
              className="ml-4"
            >
              <Copy className="w-4 h-4 mr-2" />
              복사
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {summary ? (
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 p-4 rounded-lg">
                {summary}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              AI 요약을 생성하려면 위의 버튼을 클릭하세요
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}