import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Wrench, AlertTriangle } from "lucide-react";
import type { Crane } from "@shared/schema";

export default function CraneMap() {
  const { data: cranes = [], isLoading } = useQuery<Crane[]>({
    queryKey: ["/api/cranes"],
  });

  const groupedByLocation = cranes.reduce((acc, crane) => {
    const location = crane.location || "미지정";
    if (!acc[location]) {
      acc[location] = [];
    }
    acc[location].push(crane);
    return acc;
  }, {} as Record<string, Crane[]>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operating":
        return "bg-green-100 text-green-800 border-green-200";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "maintenance":
        return <Wrench className="h-3 w-3" />;
      case "urgent":
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <MapPin className="h-3 w-3" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-2 text-lg">크레인 지도 로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">크레인 지도</h1>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="bg-green-50">
            전체 크레인: {cranes.length}대
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(groupedByLocation).map(([location, locationCranes]) => (
          <Card key={location} className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-blue-50 border-b">
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-teal-600" />
                {location}
                <Badge variant="secondary" className="ml-auto">
                  {locationCranes.length}대
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {locationCranes.map((crane) => (
                  <div
                    key={crane.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">
                        {crane.craneId}
                      </div>
                      <div className="text-xs text-gray-500">
                        {crane.model || "모델 정보 없음"}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        className={`text-xs px-2 py-1 ${getStatusColor(crane.status)}`}
                      >
                        <span className="flex items-center space-x-1">
                          {getStatusIcon(crane.status)}
                          <span>
                            {crane.status === "operating" && "가동중"}
                            {crane.status === "maintenance" && "정비중"}
                            {crane.status === "urgent" && "긴급"}
                          </span>
                        </span>
                      </Badge>
                      {crane.isUrgent && (
                        <Badge variant="destructive" className="text-xs">
                          긴급
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {Object.keys(groupedByLocation).length === 0 && (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              크레인 데이터가 없습니다
            </p>
            <p className="text-sm text-gray-500 text-center">
              구글 스프레드시트에서 크레인 데이터를 동기화해주세요.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}