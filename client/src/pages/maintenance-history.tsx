import { MaintenanceTable } from "@/components/dashboard/maintenance-table";

export default function MaintenanceHistory() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">정비 이력</h1>
      </div>
      <MaintenanceTable />
    </div>
  );
}