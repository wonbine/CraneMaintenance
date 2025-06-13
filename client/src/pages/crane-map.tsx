import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Wrench, AlertTriangle, Calendar, Clock, Settings, User, HelpCircle, ExternalLink } from "lucide-react";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { useLocation } from "wouter";
import type { Crane } from "@shared/schema";
import craneCoordinates from "../data/crane-coordinates-complete.json";

interface CraneCoordinate {
  크레인코드: string;
  좌표: string;
}

export default function CraneMap() {
  const [selectedCrane, setSelectedCrane] = useState<Crane | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [, setLocation] = useLocation();

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
    const matchingCrane = cranes.find(crane => {
      // Direct match first
      if (crane.craneId === craneCode || crane.craneName === craneCode) {
        return true;
      }
      
      // Check if crane name contains the crane code (like "3CPL(CT82)" contains "CT82")
      if (crane.craneName?.includes(`(${craneCode})`) || crane.craneName?.includes(craneCode)) {
        return true;
      }
      
      // Check if crane ID contains the crane code
      if (crane.craneId?.includes(craneCode)) {
        return true;
      }
      
      // Check if crane code is part of crane name without parentheses
      if (crane.craneName?.includes(craneCode)) {
        return true;
      }
      
      return false;
    });

    if (matchingCrane) {
      return {
        ...matchingCrane,
        installationDate: matchingCrane.installationDate || null,
        inspectionReferenceDate: matchingCrane.inspectionReferenceDate || null,
        inspectionCycle: matchingCrane.inspectionCycle || null,
        leadTime: matchingCrane.leadTime || null,
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
      grade: "B",
      driveType: "정보 없음",
      unmannedOperation: "무인",
      installationDate: null,
      inspectionReferenceDate: null,
      inspectionCycle: null,
      leadTime: null,
      position
    };
  });

  // Helper function to format dates to yyyy-mm-dd
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      
      return date.toISOString().split('T')[0]; // Returns yyyy-mm-dd format
    } catch {
      return dateString.split('T')[0]; // Fallback for already formatted strings
    }
  };

  const handleCraneClick = (crane: Crane) => {
    setSelectedCrane(crane);
    setIsModalOpen(true);
  };

  const handleViewDetails = () => {
    if (selectedCrane) {
      // Navigate to dashboard with selected crane's equipment code
      const craneId = selectedCrane.craneId || selectedCrane.craneName || '';
      setLocation(`/?crane=${encodeURIComponent(craneId)}`);
      setIsModalOpen(false);
    }
  };

  // Calculate next inspection date and D-day countdown
  const calculateInspectionData = (crane: Crane) => {
    if (!crane.inspectionReferenceDate || !crane.inspectionCycle) {
      return { nextInspectionDate: null, daysUntilInspection: null, progressPercentage: 0 };
    }

    const referenceDate = new Date(crane.inspectionReferenceDate);
    const nextInspectionDate = new Date(referenceDate);
    nextInspectionDate.setDate(referenceDate.getDate() + crane.inspectionCycle);
    
    const today = new Date();
    const timeDiff = nextInspectionDate.getTime() - today.getTime();
    const daysUntilInspection = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    // Calculate progress percentage (how much of the cycle has passed)
    const cycleStart = referenceDate;
    const cycleEnd = nextInspectionDate;
    const totalCycleDays = crane.inspectionCycle;
    const daysPassed = Math.floor((today.getTime() - cycleStart.getTime()) / (1000 * 3600 * 24));
    const progressPercentage = Math.min(100, Math.max(0, (daysPassed / totalCycleDays) * 100));

    return {
      nextInspectionDate: nextInspectionDate.toISOString().split('T')[0],
      daysUntilInspection,
      progressPercentage
    };
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A":
        return "bg-blue-500 border-blue-700"; // A급 - 파란색 (최고등급)
      case "B":
        return "bg-green-500 border-green-700"; // B급 - 초록색 (중간등급)
      case "C":
        return "bg-orange-500 border-orange-700"; // C급 - 주황색 (기본등급)
      default:
        return "bg-gray-400 border-gray-600"; // 등급 정보 없음
    }
  };

  const getCellBackgroundColor = (grade: string) => {
    switch (grade) {
      case "A":
        return "bg-blue-200"; // A급 - 연한 파란색
      case "B":
        return "bg-green-200"; // B급 - 연한 초록색
      case "C":
        return "bg-orange-200"; // C급 - 연한 주황색
      default:
        return "bg-gray-200"; // 등급 정보 없음
    }
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

  const getGradeBadgeColor = (grade: string | null | undefined) => {
    switch (grade) {
      case "A급":
      case "A":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "B급":
      case "B":
        return "bg-green-100 text-green-800 border-green-200";
      case "C급":
      case "C":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getUnmannedBadgeColor = (unmannedOperation: string | null | undefined) => {
    switch (unmannedOperation) {
      case "무인":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "유인":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getUnmannedIcon = (unmannedOperation: string | null | undefined) => {
    switch (unmannedOperation) {
      case "무인":
        return <Settings className="h-3 w-3" />;
      case "유인":
        return <User className="h-3 w-3" />;
      default:
        return <HelpCircle className="h-3 w-3" />;
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
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="bg-green-50">
              전체 크레인: {cranes.length}대
            </Badge>
            <Badge variant="outline" className="bg-blue-50">
              지도에 표시: {cranesWithPositions.length}대
            </Badge>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">색상 범례:</span>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-blue-200 border border-blue-400 rounded"></div>
              <span className="text-sm">A급: {cranes.filter(c => c.grade === 'A').length}대</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-green-200 border border-green-400 rounded"></div>
              <span className="text-sm">B급: {cranes.filter(c => c.grade === 'B').length}대</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-orange-200 border border-orange-400 rounded"></div>
              <span className="text-sm">C급: {cranes.filter(c => c.grade === 'C').length}대</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-gray-200 border border-gray-400 rounded"></div>
              <span className="text-sm">정보없음: {cranes.filter(c => !c.grade || c.grade === '').length}대</span>
            </div>
          </div>
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

              {/* Grid Background with Colored Cells */}
              <div className="relative w-full h-full min-w-[2400px] min-h-[2000px]">
                {/* Colored Cell Grid */}
                {cranesWithPositions.map((crane, index) => (
                  <div
                    key={`cell-${crane.id}-${index}-${crane.position.x}-${crane.position.y}`}
                    className={`absolute border-2 border-gray-400 ${getCellBackgroundColor(crane.grade || "")} hover:opacity-90 transition-opacity duration-200`}
                    style={{
                      left: `${crane.position.x - 15}px`,
                      top: `${crane.position.y - 12}px`,
                      width: '30px',
                      height: '25px',
                      opacity: 0.8
                    }}
                  >
                    {/* Cell Label */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-800">
                        {crane.grade || "?"}
                      </span>
                    </div>
                  </div>
                ))}
              
              {/* Crane Position Markers */}
                {cranesWithPositions.map((crane, index) => (
                  <button
                    key={`crane-${crane.id}-${index}-${crane.position.x}-${crane.position.y}`}
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
                        className={`w-3 h-3 rounded-full border-2 shadow-md transition-all duration-200 group-hover:scale-150 ${getGradeColor(
                          crane.grade || ""
                        )}`}
                      />
                      
                      {/* Crane Label */}
                      <div className="absolute top-5 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                        <div className="text-center font-medium">
                          {crane.craneName || crane.craneId}
                        </div>
                        <div className="text-center text-gray-300 text-xs">
                          {crane.craneId}
                        </div>
                        <div className="text-center text-yellow-300 font-bold">
                          등급: {crane.grade || "미분류"}
                        </div>
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
              {/* Grade Badge */}
              <div className="flex justify-center">
                <Badge
                  className={`px-3 py-1 font-bold text-white ${
                    selectedCrane.grade === 'A' ? 'bg-blue-600' : 
                    selectedCrane.grade === 'B' ? 'bg-green-600' : 
                    selectedCrane.grade === 'C' ? 'bg-orange-600' : 'bg-gray-500'
                  }`}
                >
                  등급: {selectedCrane.grade || "B"}
                </Badge>
              </div>

              {/* Crane Details */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">크레인명</span>
                  <span className="font-medium">{selectedCrane.craneName || selectedCrane.craneId}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">설비코드</span>
                  <span className="font-medium">{selectedCrane.craneId}</span>
                </div>
                
                {/* Grade - Enhanced Visual Display */}
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">등급(Grade)</span>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      className={`px-3 py-1 text-sm font-bold ${
                        selectedCrane.grade === "A급" || selectedCrane.grade === "A" 
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : selectedCrane.grade === "B급" || selectedCrane.grade === "B"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : selectedCrane.grade === "C급" || selectedCrane.grade === "C"
                          ? "bg-orange-100 text-orange-800 border-orange-200"
                          : "bg-gray-100 text-gray-800 border-gray-200"
                      }`}
                    >
                      {selectedCrane.grade?.replace('급', '') || "B"}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">운전방식(DriveType)</span>
                  <span className="font-medium">{selectedCrane.driveType || "정보 없음"}</span>
                </div>
                
                {/* Unmanned Operation - Enhanced Visual Display */}
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">유/무인(UnmannedOperation)</span>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      className={`px-3 py-1 text-sm font-bold ${
                        selectedCrane.unmannedOperation === "무인"
                          ? "bg-purple-100 text-purple-800 border-purple-200"
                          : selectedCrane.unmannedOperation === "유인"
                          ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                          : "bg-gray-100 text-gray-800 border-gray-200"
                      }`}
                    >
                      <span className="flex items-center space-x-1">
                        {selectedCrane.unmannedOperation === "무인" ? (
                          <Settings className="h-3 w-3" />
                        ) : null}
                        {selectedCrane.unmannedOperation || "무인"}
                      </span>
                    </Badge>
                  </div>
                </div>

                {/* Installation and Inspection Data */}
                <div className="border-t pt-3 mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    설치 및 점검 정보
                  </h4>
                  
                  {selectedCrane.installationDate && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-500">설치일자</span>
                      <span className="font-medium">{formatDate(selectedCrane.installationDate)}</span>
                    </div>
                  )}
                  
                  {selectedCrane.inspectionReferenceDate && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-500">점검기준일</span>
                      <span className="font-medium">{formatDate(selectedCrane.inspectionReferenceDate)}</span>
                    </div>
                  )}
                  
                  {selectedCrane.inspectionCycle && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-500">정비주기</span>
                      <span className="font-medium">{selectedCrane.inspectionCycle}일</span>
                    </div>
                  )}
                  
                  {selectedCrane.leadTime && (
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-gray-500">리드타임</span>
                      <span className="font-medium">{selectedCrane.leadTime}일</span>
                    </div>
                  )}

                  {/* Inspection Progress Gauge */}
                  {(() => {
                    const inspectionData = calculateInspectionData(selectedCrane);
                    if (inspectionData.nextInspectionDate) {
                      const isOverdue = inspectionData.daysUntilInspection! < 0;
                      const urgentThreshold = 7; // 7 days warning
                      const isUrgent = inspectionData.daysUntilInspection! <= urgentThreshold && !isOverdue;
                      
                      return (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-medium text-gray-700 flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              점검 진행률
                            </h5>
                            <span className={`text-sm font-bold ${
                              isOverdue ? 'text-red-600' : 
                              isUrgent ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {isOverdue ? `D+${Math.abs(inspectionData.daysUntilInspection!)}` : 
                               `D-${inspectionData.daysUntilInspection}`}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <div className="w-16 h-16">
                              <CircularProgressbar
                                value={inspectionData.progressPercentage}
                                text={`${Math.round(inspectionData.progressPercentage)}%`}
                                styles={buildStyles({
                                  textSize: '20px',
                                  pathColor: isOverdue ? '#DC2626' : 
                                           isUrgent ? '#EA580C' : '#059669',
                                  textColor: isOverdue ? '#DC2626' : 
                                           isUrgent ? '#EA580C' : '#059669',
                                  trailColor: '#E5E7EB',
                                })}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="text-xs text-gray-500 mb-1">다음 점검일</div>
                              <div className="font-medium">{formatDate(inspectionData.nextInspectionDate)}</div>
                              <div className={`text-xs mt-1 ${
                                isOverdue ? 'text-red-600' : 
                                isUrgent ? 'text-orange-600' : 'text-green-600'
                              }`}>
                                {isOverdue ? '점검이 지연되었습니다' : 
                                 isUrgent ? '점검이 임박했습니다' : '점검 일정이 양호합니다'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
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
                <Button
                  size="sm"
                  onClick={handleViewDetails}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  상세정보
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      
    </div>
  );
}