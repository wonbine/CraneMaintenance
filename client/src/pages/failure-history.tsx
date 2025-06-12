import { FailureTable } from "@/components/dashboard/failure-table";

export default function FailureHistory() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">돌발수리 이력</h1>
          <p className="text-gray-600 mt-2">크레인별 돌발수리 기록을 조회합니다</p>
        </div>
      </div>

      <FailureTable />
    </div>
  );
}