import { Card, CardContent } from "@/components/ui/card";
import { Factory, CheckCircle, Wrench, AlertTriangle } from "lucide-react";
import type { DashboardSummary } from "@shared/schema";

interface SummaryCardsProps {
  summary: DashboardSummary;
  isLoading?: boolean;
}

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="ml-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-8 bg-gray-200 rounded w-12"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Cranes",
      value: summary.totalCranes,
      icon: Factory,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      valueColor: "text-gray-900"
    },
    {
      title: "Operating",
      value: summary.operatingCranes,
      icon: CheckCircle,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      valueColor: "text-green-600"
    },
    {
      title: "Under Maintenance",
      value: summary.maintenanceCranes,
      icon: Wrench,
      bgColor: "bg-yellow-100",
      iconColor: "text-yellow-600",
      valueColor: "text-yellow-600"
    },
    {
      title: "Urgent Maintenance",
      value: summary.urgentCranes,
      icon: AlertTriangle,
      bgColor: "bg-red-100",
      iconColor: "text-red-600",
      valueColor: "text-red-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <Card key={index} className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 ${card.bgColor} rounded-full flex items-center justify-center`}>
                  <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <p className={`text-2xl font-semibold ${card.valueColor}`}>
                  {card.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
