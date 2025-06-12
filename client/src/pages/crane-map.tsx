import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Wrench, AlertTriangle } from "lucide-react";
import type { Crane } from "@shared/schema";
import craneCoordinates from "../data/crane-coordinates-complete.json";

interface CraneCoordinate {
  크레인코드: string;
  좌표: string;
}

export default function CraneMap() {
  const [selectedCrane, setSelectedCrane] = useState<Crane | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: cranes = [], isLoading } = useQuery<Crane[]>({
    queryKey: ["/api/cranes"],
  });

  // Convert Excel coordinates (like "A1", "B2") to pixel positions
  const convertCoordinateToPosition = (coordinate: string) => {
    const match = coordinate.match(/^([A-Z]+)(\d+)$/);
    if (!match) return { x: 0, y: 0 };
    
    const letters = match[1];
    const numbers = parseInt(match[2]);
    
    // Convert letters to column number (A=1, B=2, ..., AA=27, etc.)
    let column = 0;
    for (let i = 0; i < letters.length; i++) {
      column = column * 26 + (letters.charCodeAt(i) - 64);
    }
    
    // Scale coordinates to fit in a reasonable map size with less overlap
    const x = (column - 1) * 30; // 30px per column for better spacing
    const y = (numbers - 1) * 25; // 25px per row for better spacing
    
    return { x, y };
  };

  // Create crane markers from all coordinate data, handling duplicates
  const cranesWithPositions = (craneCoordinates as CraneCoordinate[]).map((coord, index) => {
    const position = convertCoordinateToPosition(coord.좌표);
    const craneCode = coord.크레인코드;
    // Try to find matching crane in database
    const matchingCrane = cranes.find(crane => 
      crane.craneId === craneCode || 
      crane.craneName === craneCode ||
      crane.craneId?.includes(craneCode) ||
      craneCode.includes(crane.craneId || '')
    );

    if (matchingCrane) {
      return {
        ...matchingCrane,
        position
      };
    }

    // Create a placeholder crane object for coordinate data without matching database entry
    return {
      id: index + 10000, // Use high numbers to avoid conflicts
      craneId: `${craneCode}-${index}`, // Make unique with index
      craneName: craneCode,
      plantSection: "공장",
      status: "operating" as const,
      location: `좌표: ${coord.좌표}`,
      model: "정보 없음",
      lastMaintenanceDate: null,
      nextMaintenanceDate: null,
      isUrgent: false,
      grade: "N/A",
      driveType: "N/A",
      unmannedOperation: "N/A",
      position
    };
  });

  const handleCraneClick = (crane: Crane) => {
    setSelectedCrane(crane);
    setIsModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operating":
        return "bg-green-500";
      case "maintenance":
        return "bg-yellow-500";
      case "urgent":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBadgeColor = (status: string) => {
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
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between p-6 border-b bg-white">
        <h1 className="text-3xl font-bold tracking-tight">크레인 지도</h1>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="bg-green-50">
            전체 크레인: {cranes.length}대
          </Badge>
          <Badge variant="outline" className="bg-blue-50">
            지도에 표시: {cranesWithPositions.length}대 (좌표 데이터)
          </Badge>
        </div>
      </div>

      {/* Interactive Crane Map */}
      <div className="flex-1 p-6">
        <Card className="border-0 shadow-lg h-full">
          <CardHeader className="bg-gradient-to-r from-teal-50 to-blue-50 border-b">
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-teal-600" />
              공장 크레인 지도
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-full">
            <div className="relative w-full h-full bg-gray-50 border rounded-lg overflow-auto">
              {/* Map Legend */}
              <div className="absolute top-4 right-4 z-10 bg-white p-3 rounded-lg shadow-md border">
                <h4 className="text-sm font-medium mb-2">범례</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>가동중</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>정비중</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>긴급</span>
                  </div>
                </div>
              </div>

              {/* Crane Position Markers */}
              <div className="relative w-full h-full min-w-[2400px] min-h-[2000px]">
                {cranesWithPositions.map((crane) => (
                  <button
                    key={crane.id}
                    onClick={() => handleCraneClick(crane)}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                    style={{
                      left: `${crane.position.x}px`,
                      top: `${crane.position.y}px`,
                    }}
                  >
                    <div className="relative">
                      {/* Crane Marker */}
                      <div
                        className={`w-3 h-3 rounded-full border border-white shadow-md transition-all duration-200 group-hover:scale-150 ${getStatusColor(
                          crane.status
                        )}`}
                      />
                      
                      {/* Crane Label */}
                      <div className="absolute top-5 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {crane.craneId}
                      </div>
                    </div>
                  </button>
                ))}

                {/* Grid lines for reference */}
                <div className="absolute inset-0 pointer-events-none opacity-10">
                  {/* Vertical lines */}
                  {Array.from({ length: 40 }, (_, i) => (
                    <div
                      key={`v-${i}`}
                      className="absolute top-0 bottom-0 w-px bg-gray-400"
                      style={{ left: `${i * 30}px` }}
                    />
                  ))}
                  {/* Horizontal lines */}
                  {Array.from({ length: 30 }, (_, i) => (
                    <div
                      key={`h-${i}`}
                      className="absolute left-0 right-0 h-px bg-gray-400"
                      style={{ top: `${i * 30}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Crane Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-teal-600" />
              <span>크레인 정보</span>
            </DialogTitle>
            <DialogDescription>
              크레인의 상세 정보와 현재 상태를 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCrane && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex justify-center">
                <Badge
                  className={`px-3 py-1 ${getStatusBadgeColor(selectedCrane.status)}`}
                >
                  <span className="flex items-center space-x-1">
                    {getStatusIcon(selectedCrane.status)}
                    <span>
                      {selectedCrane.status === "operating" && "가동중"}
                      {selectedCrane.status === "maintenance" && "정비중"}
                      {selectedCrane.status === "urgent" && "긴급"}
                    </span>
                  </span>
                </Badge>
              </div>

              {/* Crane Details */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">크레인명</span>
                  <span className="font-medium">{selectedCrane.craneId}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">설비코드</span>
                  <span className="font-medium">{selectedCrane.craneId || "N/A"}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">등급(Grade)</span>
                  <span className="font-medium">{selectedCrane.grade || "정보 없음"}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">운전방식(DriveType)</span>
                  <span className="font-medium">{selectedCrane.driveType || "정보 없음"}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">유/무인(UnmannedOperation)</span>
                  <span className="font-medium">{selectedCrane.unmannedOperation || "정보 없음"}</span>
                </div>

                {selectedCrane.location && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">위치</span>
                    <span className="font-medium">{selectedCrane.location}</span>
                  </div>
                )}

                {selectedCrane.model && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">모델</span>
                    <span className="font-medium">{selectedCrane.model}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  닫기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {cranesWithPositions.length === 0 && (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              지도에 표시할 크레인이 없습니다
            </p>
            <p className="text-sm text-gray-500 text-center">
              좌표 데이터와 일치하는 크레인을 찾을 수 없습니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}