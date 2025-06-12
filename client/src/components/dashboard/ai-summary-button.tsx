import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Brain, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface AISummaryButtonProps {
  dashboardSummary?: any;
  systemOverview?: any;
  maintenanceStats?: any;
  failureCauses?: any;
}

export function AISummaryButton({ 
  dashboardSummary, 
  systemOverview, 
  maintenanceStats, 
  failureCauses 
}: AISummaryButtonProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ai/analyze-dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dashboardSummary,
          systemOverview,
          maintenanceStats,
          failureCauses,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "AI 분석 생성에 실패했습니다");
      }

      const data = await response.json();
      return data.summary;
    },
    onSuccess: (data) => {
      setSummary(data);
    },
    onError: (error) => {
      console.error("AI 분석 생성 오류:", error);
      setSummary("AI 분석 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    },
  });

  const handleGenerateSummary = () => {
    generateSummaryMutation.mutate();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center space-x-2 bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
          onClick={handleGenerateSummary}
        >
          {generateSummaryMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AI 분석 중...</span>
            </>
          ) : (
            <>
              <Brain className="w-4 h-4" />
              <span>AI 요약 보고서</span>
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