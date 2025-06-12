import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Brain, FileText, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AISummaryResponse {
  success: boolean;
  summary: string;
  timestamp: string;
  dataAnalyzed: {
    totalCranes: number;
    totalFactories: number;
    analysisDate: string;
  };
  error?: string;
  details?: string;
}

export function AISummaryButton() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summaryData, setSummaryData] = useState<AISummaryResponse | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const generateSummary = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AISummaryResponse = await response.json();

      if (data.success) {
        setSummaryData(data);
        setIsDialogOpen(true);
        toast({
          title: "AI 요약 보고서 생성 완료",
          description: "대시보드 데이터 분석이 완료되었습니다.",
        });
      } else {
        throw new Error(data.error || "요약 생성 실패");
      }
    } catch (error) {
      console.error("AI Summary generation failed:", error);
      toast({
        title: "AI 요약 보고서 생성 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatSummaryText = (text: string) => {
    // Split by numbered sections and format them
    const sections = text.split(/(\d+\.\s+[^\n]+)/g).filter(Boolean);
    
    return sections.map((section, index) => {
      if (/^\d+\.\s+/.test(section)) {
        // This is a section header
        return (
          <h3 key={index} className="font-semibold text-lg mt-6 mb-3 text-blue-600 dark:text-blue-400">
            {section}
          </h3>
        );
      } else {
        // This is section content
        const paragraphs = section.split('\n').filter(Boolean);
        return paragraphs.map((paragraph, pIndex) => (
          <p key={`${index}-${pIndex}`} className="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">
            {paragraph}
          </p>
        ));
      }
    });
  };

  return (
    <>
      <Button
        onClick={generateSummary}
        disabled={isGenerating}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium px-6 py-2 rounded-lg shadow-md transition-all duration-200"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            AI 분석 중...
          </>
        ) : (
          <>
            <Brain className="w-4 h-4 mr-2" />
            AI 요약 보고서
          </>
        )}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <FileText className="w-6 h-6 text-blue-600" />
              AI 대시보드 요약 보고서
            </DialogTitle>
          </DialogHeader>
          
          {summaryData && (
            <div className="space-y-4">
              {/* Report metadata */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border">
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    분석 일시: {new Date(summaryData.timestamp).toLocaleString('ko-KR')}
                  </div>
                  <div>총 크레인: {summaryData.dataAnalyzed.totalCranes}대</div>
                  <div>총 공장: {summaryData.dataAnalyzed.totalFactories}개</div>
                </div>
              </div>

              {/* Summary content */}
              <ScrollArea className="h-[50vh] pr-4">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {formatSummaryText(summaryData.summary)}
                </div>
              </ScrollArea>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(summaryData.summary);
                    toast({
                      title: "복사 완료",
                      description: "보고서 내용이 클립보드에 복사되었습니다.",
                    });
                  }}
                >
                  텍스트 복사
                </Button>
                <Button
                  onClick={() => setIsDialogOpen(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  닫기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}