import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Database, AlertCircle, Plus } from "lucide-react";

interface EmptyStateProps {
  type: "cranes" | "failures" | "maintenance" | "general";
  onAction?: () => void;
}

export function EmptyState({ type, onAction }: EmptyStateProps) {
  const getEmptyStateContent = () => {
    switch (type) {
      case "cranes":
        return {
          icon: <Database className="w-12 h-12 text-gray-400" />,
          title: "크레인 데이터가 없습니다",
          description: "크레인 목록 시트에 다음 정보를 추가해주세요:",
          items: [
            "crane_id: CR-001, CR-002 등 고유 식별자",
            "status: operating, maintenance, urgent 중 하나",
            "location: 크레인이 위치한 장소",
            "model: 크레인 모델명",
            "last_maintenance_date: 마지막 정비일 (YYYY-MM-DD)",
            "next_maintenance_date: 다음 정비 예정일",
            "is_urgent: 긴급 여부 (true/false)"
          ],
          action: "크레인 데이터 동기화"
        };
      
      case "failures":
        return {
          icon: <AlertCircle className="w-12 h-12 text-red-400" />,
          title: "고장 이력이 없습니다",
          description: "고장 이력 시트에 다음 정보를 추가해주세요:",
          items: [
            "crane_id: 고장난 크레인 ID",
            "date: 고장 발생일 (YYYY-MM-DD)",
            "failure_type: hydraulic, electrical, mechanical, structural",
            "description: 고장 상세 설명",
            "severity: low, medium, high, critical",
            "downtime: 가동 중단 시간 (시간 단위)",
            "cause: 고장 원인",
            "reported_by: 신고자"
          ],
          action: "고장 데이터 동기화"
        };
      
      case "maintenance":
        return {
          icon: <Plus className="w-12 h-12 text-blue-400" />,
          title: "수리 이력이 없습니다",
          description: "수리 이력 시트에 다음 정보를 추가해주세요:",
          items: [
            "crane_id: 수리한 크레인 ID",
            "date: 수리일 (YYYY-MM-DD)",
            "type: routine, preventive, repair, emergency, inspection",
            "technician: 담당 기술자",
            "status: completed, in_progress, scheduled",
            "notes: 수리 내용 메모",
            "duration: 수리 소요 시간 (시간 단위)",
            "cost: 수리 비용 (원 단위)",
            "related_failure_id: 관련 고장 ID (선택사항)"
          ],
          action: "수리 데이터 동기화"
        };
      
      default:
        return {
          icon: <FileSpreadsheet className="w-12 h-12 text-gray-400" />,
          title: "데이터를 불러올 수 없습니다",
          description: "구글 스프레드시트 API 설정을 확인해주세요:",
          items: [
            "스프레드시트가 'Google Sheets API'에서 접근 가능한가요?",
            "스프레드시트 ID가 올바른가요?",
            "시트명이 정확한가요? (비어있으면 첫 번째 시트 사용)",
            "시트에 데이터가 입력되어 있나요?",
            "첫 번째 행에 헤더(컬럼명)가 설정되어 있나요?"
          ],
          action: "데이터 다시 동기화"
        };
    }
  };

  const content = getEmptyStateContent();

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="text-center space-y-6 max-w-2xl">
          {content.icon}
          
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {content.title}
            </h3>
            <p className="text-gray-600 mb-6">
              {content.description}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 text-left">
            <h4 className="font-medium text-gray-900 mb-3">필요한 데이터 형식:</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              {content.items.map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {onAction && (
            <Button onClick={onAction} className="mt-4">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              {content.action}
            </Button>
          )}

          <div className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <strong>참고:</strong> 구글 스프레드시트의 첫 번째 행은 헤더로 사용되며, 
            위의 필드명과 정확히 일치해야 합니다. 데이터는 두 번째 행부터 입력해주세요.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 샘플 데이터 표시 컴포넌트
export function SampleDataGuide() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileSpreadsheet className="w-5 h-5 mr-2" />
          구글 스프레드시트 샘플 데이터
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* 크레인 목록 샘플 */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">1. 크레인 목록 시트 샘플:</h4>
          <div className="overflow-x-auto bg-gray-50 rounded-lg p-4">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">crane_id</th>
                  <th className="text-left p-2">status</th>
                  <th className="text-left p-2">location</th>
                  <th className="text-left p-2">model</th>
                  <th className="text-left p-2">last_maintenance_date</th>
                  <th className="text-left p-2">next_maintenance_date</th>
                  <th className="text-left p-2">is_urgent</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2">CR-001</td>
                  <td className="p-2">operating</td>
                  <td className="p-2">창고 A</td>
                  <td className="p-2">Liebherr LTM 1030</td>
                  <td className="p-2">2024-05-15</td>
                  <td className="p-2">2024-06-15</td>
                  <td className="p-2">false</td>
                </tr>
                <tr>
                  <td className="p-2">CR-002</td>
                  <td className="p-2">maintenance</td>
                  <td className="p-2">부두 B</td>
                  <td className="p-2">Manitowoc 18000</td>
                  <td className="p-2">2024-05-20</td>
                  <td className="p-2">2024-06-10</td>
                  <td className="p-2">false</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 고장 이력 샘플 */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">2. 고장 이력 시트 샘플:</h4>
          <div className="overflow-x-auto bg-gray-50 rounded-lg p-4">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">crane_id</th>
                  <th className="text-left p-2">date</th>
                  <th className="text-left p-2">failure_type</th>
                  <th className="text-left p-2">description</th>
                  <th className="text-left p-2">severity</th>
                  <th className="text-left p-2">downtime</th>
                  <th className="text-left p-2">cause</th>
                  <th className="text-left p-2">reported_by</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2">CR-002</td>
                  <td className="p-2">2024-05-19</td>
                  <td className="p-2">hydraulic</td>
                  <td className="p-2">유압 펌프 고장</td>
                  <td className="p-2">high</td>
                  <td className="p-2">24</td>
                  <td className="p-2">씰 마모</td>
                  <td className="p-2">운영팀</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 수리 이력 샘플 */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">3. 수리 이력 시트 샘플:</h4>
          <div className="overflow-x-auto bg-gray-50 rounded-lg p-4">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">crane_id</th>
                  <th className="text-left p-2">date</th>
                  <th className="text-left p-2">type</th>
                  <th className="text-left p-2">technician</th>
                  <th className="text-left p-2">status</th>
                  <th className="text-left p-2">notes</th>
                  <th className="text-left p-2">duration</th>
                  <th className="text-left p-2">cost</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2">CR-001</td>
                  <td className="p-2">2024-05-15</td>
                  <td className="p-2">routine</td>
                  <td className="p-2">김철수</td>
                  <td className="p-2">completed</td>
                  <td className="p-2">정기 점검</td>
                  <td className="p-2">4</td>
                  <td className="p-2">25000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-medium text-blue-900 mb-2">구글 스프레드시트 설정 방법:</h5>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>위의 샘플 데이터를 참고하여 3개의 시트를 생성하세요</li>
            <li>각 시트를 "링크가 있는 모든 사용자" 권한으로 공유하세요</li>
            <li>CSV 내보내기 URL을 복사하세요</li>
            <li>대시보드의 "Configure" 버튼을 클릭하여 URL을 입력하세요</li>
            <li>"Sync Data" 버튼을 눌러 데이터를 동기화하세요</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}