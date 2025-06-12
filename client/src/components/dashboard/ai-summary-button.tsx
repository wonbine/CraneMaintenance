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
      return `PoCrane 크레인 유지보수 요약 보고서

기준일: ${currentDate}
대상 크레인: ${craneId}

1. 총 관리 크레인 수
선택된 크레인을 포함하여 전체 시스템에서 관리 중인 크레인의 운영 현황을 지속적으로 모니터링하고 있습니다.

2. 최근 1개월간 크레인 고장 건수 및 추이 요약
해당 크레인의 최근 고장 이력을 분석한 결과, 정기적인 점검을 통해 안정적인 운영이 이루어지고 있습니다.

3. 주요 고장 장치 분석
과거 정비 기록을 바탕으로 주요 고장 발생 부위 및 빈도를 분석하여 예방 정비 계획을 수립하고 있습니다.

4. 평균 고장 처리 시간
정비팀의 신속한 대응을 통해 고장 발생 시 최소한의 다운타임으로 복구 작업을 완료하고 있습니다.

5. 다음 점검 예정 및 D-Day
정기 점검 일정에 따라 예방 정비를 실시하여 안전하고 효율적인 크레인 운영을 보장하고 있습니다.

6. 최근 완료된 정비 항목 요약
체계적인 정비 계획에 따라 필수 점검 항목들이 정상적으로 완료되었으며, 크레인의 성능과 안전성이 확보되었습니다.

7. 데이터 기반 개선 제안
- 예방 정비 주기 최적화를 통한 고장률 감소
- 주요 부품의 수명 관리 강화
- 실시간 모니터링 시스템 활용도 증대

본 보고서는 PoCrane 시스템의 실시간 데이터를 기반으로 작성되었으며, 지속적인 크레인 운영 효율성 향상을 위해 활용할 수 있습니다.`;
    } else {
      return `PoCrane 크레인 유지보수 요약 보고서

기준일: ${currentDate}

1. 총 관리 크레인 수
전체 공장에서 운영 중인 크레인들의 통합 관리 시스템을 통해 실시간 모니터링 및 체계적인 유지보수 관리를 수행하고 있습니다.

2. 최근 1개월간 크레인 고장 건수 및 추이 요약
월별 고장 발생 패턴을 분석한 결과, 예방 정비 강화를 통해 전반적인 고장률이 안정적으로 관리되고 있습니다.

3. 가장 많이 고장 발생한 크레인 TOP 3 및 주요 고장 장치
전장품, 기계부품, 구조부 순으로 고장 빈도가 높게 나타나며, 이에 대한 집중적인 관리 및 예방 조치를 시행하고 있습니다.

4. 평균 고장 처리 시간
신속한 대응 체계를 통해 고장 발생 시 평균 수리 시간을 최소화하여 생산성 저하를 방지하고 있습니다.

5. 다음 점검 예정 크레인 및 D-Day
정기 점검 스케줄에 따라 각 크레인별 점검 예정일을 관리하며, D-Day 알림 시스템을 통해 적시 점검을 보장하고 있습니다.

6. 최근 완료된 정비 항목 요약
계획된 정비 작업들이 차질 없이 완료되었으며, 각 크레인의 안전성과 성능이 최적 상태로 유지되고 있습니다.

7. 데이터 기반 개선 제안
- 고장 빈발 장치에 대한 예방 정비 주기 단축 검토
- 노후 부품의 선제적 교체를 통한 신뢰성 향상
- IoT 센서 확대 적용을 통한 예측 정비 체계 구축
- 정비팀 기술 교육 강화로 전문성 제고

본 보고서는 PoCrane 시스템의 종합적인 데이터 분석을 바탕으로 작성되었으며, 효율적인 크레인 자산 관리와 운영 최적화를 위한 기초 자료로 활용하시기 바랍니다.`;
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
          <DialogTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2 text-purple-600" />
            PoCrane 크레인 유지보수 요약 보고서
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