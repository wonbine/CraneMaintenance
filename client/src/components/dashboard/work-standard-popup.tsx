
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface WorkStandardPopupProps {
  isOpen: boolean;
  onClose: () => void;
  taskName: string;
}

export function WorkStandardPopup({ isOpen, onClose, taskName }: WorkStandardPopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-bold text-gray-800">
            📋 작업표준서 - {taskName}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="px-6 pb-6 max-h-[75vh]">
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h2 className="text-lg font-bold text-blue-800 mb-2">
                🧷 작업순서별 유의사항 – 작업방법 및 안전사항 정리
              </h2>
            </div>

            {/* 1. 사전 준비작업 */}
            <Card className="border-2 border-gray-200">
              <CardContent className="p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  🔹 1. 사전 준비작업
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left font-medium">구분</th>
                        <th className="border border-gray-300 p-2 text-left font-medium">유의 작업방법</th>
                        <th className="border border-gray-300 p-2 text-left font-medium">안전사항</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">TBM 실시</td>
                        <td className="border border-gray-300 p-2">설비운전자·정비자와 위험요소·조치방안 논의</td>
                        <td className="border border-gray-300 p-2 text-red-700">회의 결과 반드시 기록 및 모니터링 시스템에 태깅</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">자재 준비</td>
                        <td className="border border-gray-300 p-2">부품 및 공구를 작업 위치로 미리 정위치</td>
                        <td className="border border-gray-300 p-2 text-red-700">운반 중 낙하 및 충돌 위험 주의 (특히 고소작업 시)</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">도면 점검</td>
                        <td className="border border-gray-300 p-2">P&ID 도면의 포인트를 현장과 매칭</td>
                        <td className="border border-gray-300 p-2 text-red-700">오지정 방지를 위해 최소 2인 이상 공동확인 필수</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 2. ILS 잠금작업 */}
            <Card className="border-2 border-gray-200">
              <CardContent className="p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  🔹 2. ILS 잠금작업
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left font-medium">구분</th>
                        <th className="border border-gray-300 p-2 text-left font-medium">유의 작업방법</th>
                        <th className="border border-gray-300 p-2 text-left font-medium">안전사항</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">1차 잠금</td>
                        <td className="border border-gray-300 p-2">협력사 담당자가 NFB 차단 후 Master Key 삽입</td>
                        <td className="border border-gray-300 p-2 text-red-700">반드시 ILS Order 체크리스트와 GIB 기록 일치 확인</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">2차 확인</td>
                        <td className="border border-gray-300 p-2">점검담당자 Yellow Lock 설치</td>
                        <td className="border border-gray-300 p-2 text-red-700">잠금 위치별 이중 확인 후 안전감찰 부착</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">3차 잠금</td>
                        <td className="border border-gray-300 p-2">모든 작업자 Red Lock 설치</td>
                        <td className="border border-gray-300 p-2 text-red-700 font-bold">Red Lock 없이는 절대 작업 시작 금지</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 3. 크레인 탑승 및 접근 준비 */}
            <Card className="border-2 border-gray-200">
              <CardContent className="p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  🔹 3. 크레인 탑승 및 접근 준비
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left font-medium">구분</th>
                        <th className="border border-gray-300 p-2 text-left font-medium">유의 작업방법</th>
                        <th className="border border-gray-300 p-2 text-left font-medium">안전사항</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">동반 탑승</td>
                        <td className="border border-gray-300 p-2">작업자 + 설비운영자 함께 탑승</td>
                        <td className="border border-gray-300 p-2 text-red-700">혼자 이동 금지, 승하차는 지정 탑승구만 사용</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">고소작업 접근</td>
                        <td className="border border-gray-300 p-2">공구·부품은 도구함 또는 안전줄 사용</td>
                        <td className="border border-gray-300 p-2 text-red-700">낙하물 방지 조치, 안전모/벨트 착용 필수</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 4. 스토퍼 설치 및 위치 고정 */}
            <Card className="border-2 border-gray-200">
              <CardContent className="p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  🔹 4. 스토퍼 설치 및 위치 고정
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left font-medium">구분</th>
                        <th className="border border-gray-300 p-2 text-left font-medium">유의 작업방법</th>
                        <th className="border border-gray-300 p-2 text-left font-medium">안전사항</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">설치 절차</td>
                        <td className="border border-gray-300 p-2">2인 1조로 기준 위치에 스토퍼 설치</td>
                        <td className="border border-gray-300 p-2 text-red-700">설치 기준 매뉴얼 준수, 설치 후 흔들림 점검</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">주행차단</td>
                        <td className="border border-gray-300 p-2">크레인 고정 상태에서 Wheel 작업 시작</td>
                        <td className="border border-gray-300 p-2 text-red-700 font-bold">스토퍼 미설치 시 낙하·끼임 사고 위험 매우 높음</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 5. 본작업 – Wheel 탈거 및 장착 */}
            <Card className="border-2 border-gray-200">
              <CardContent className="p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  🔹 5. 본작업 – Wheel 탈거 및 장착
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left font-medium">구분</th>
                        <th className="border border-gray-300 p-2 text-left font-medium">유의 작업방법</th>
                        <th className="border border-gray-300 p-2 text-left font-medium">안전사항</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">탈거 절차</td>
                        <td className="border border-gray-300 p-2">중심 맞춰 해체, 하단 지지대 또는 받침대 사용</td>
                        <td className="border border-gray-300 p-2 text-red-700">탈거 시 Wheel 쏠림 주의, 손·발 끼임 주의</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">장착 절차</td>
                        <td className="border border-gray-300 p-2">대각선 순서로 볼트 체결 후 토크렌치로 마무리</td>
                        <td className="border border-gray-300 p-2 text-red-700">체결 불균형으로 인한 회전 불량 예방 필요</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">중량물 취급</td>
                        <td className="border border-gray-300 p-2">이동 전 신호자 지정 후 통신 체계 유지</td>
                        <td className="border border-gray-300 p-2 text-red-700">정위치 안 맞으면 억지로 밀지 말고 재조정 실시</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 6. 작업 종료 및 시운전 */}
            <Card className="border-2 border-gray-200">
              <CardContent className="p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  🔹 6. 작업 종료 및 시운전
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left font-medium">구분</th>
                        <th className="border border-gray-300 p-2 text-left font-medium">유의 작업방법</th>
                        <th className="border border-gray-300 p-2 text-left font-medium">안전사항</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">마무리 점검</td>
                        <td className="border border-gray-300 p-2">Wheel 유격, 볼트 풀림, 위치 불균형 등 확인</td>
                        <td className="border border-gray-300 p-2 text-red-700">마찰음, 진동 발생 시 즉시 작업 중지 및 재확인</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">잠금 해제</td>
                        <td className="border border-gray-300 p-2">작업자 → 확인자 → 협력사 순서대로 잠금 해제</td>
                        <td className="border border-gray-300 p-2 text-red-700">중간 순서 어길 경우 오작동 위험 발생</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">시운전</td>
                        <td className="border border-gray-300 p-2">수동-자동 전환 순서대로 시험 운전</td>
                        <td className="border border-gray-300 p-2 text-red-700">이상 징후 발견 시 바로 중지하고 보고 필수</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 요약 포인트 체크리스트 */}
            <Card className="border-2 border-green-200 bg-green-50">
              <CardContent className="p-4">
                <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center">
                  ✅ 요약 포인트 체크리스트
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-green-300">
                    <thead>
                      <tr className="bg-green-100">
                        <th className="border border-green-300 p-2 text-left font-medium">단계</th>
                        <th className="border border-green-300 p-2 text-left font-medium">가장 중요한 유의사항</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-green-300 p-2 font-medium">사전준비</td>
                        <td className="border border-green-300 p-2">TBM 기록 및 도면 현장 매칭 확인</td>
                      </tr>
                      <tr>
                        <td className="border border-green-300 p-2 font-medium">ILS</td>
                        <td className="border border-green-300 p-2 font-bold text-red-700">개인 Red Lock 설치 없이는 절대 작업 금지</td>
                      </tr>
                      <tr>
                        <td className="border border-green-300 p-2 font-medium">고정작업</td>
                        <td className="border border-green-300 p-2 font-bold text-red-700">스토퍼 없으면 Wheel 교체 절대 금지</td>
                      </tr>
                      <tr>
                        <td className="border border-green-300 p-2 font-medium">체결작업</td>
                        <td className="border border-green-300 p-2">순서 + 토크 준수, 힘으로 밀지 않기</td>
                      </tr>
                      <tr>
                        <td className="border border-green-300 p-2 font-medium">종료절차</td>
                        <td className="border border-green-300 p-2">점검 후 잠금 해제 순서 반드시 지킬 것</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
