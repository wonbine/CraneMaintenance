import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Copy, Brain, Loader2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface AISummaryButtonProps {
  className?: string;
}

export function AISummaryButton({ className }: AISummaryButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const generateSummary = async () => {
    setIsGenerating(true);
    try {
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

      // Call AI analysis endpoint
      const analysisResponse = await fetch('/api/ai/analyze-dashboard', {
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

      if (!analysisResponse.ok) {
        throw new Error('AI 분석 요청이 실패했습니다');
      }

      const analysisResult = await analysisResponse.json();
      setSummary(analysisResult.summary);
      setIsOpen(true);
    } catch (error) {
      console.error('AI 요약 생성 중 오류:', error);
      toast({
        title: '오류',
        description: 'AI 요약을 생성하는 중 문제가 발생했습니다',
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