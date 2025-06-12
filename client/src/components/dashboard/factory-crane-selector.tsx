import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Factory, Building2 } from "lucide-react";

interface FactoryCraneSelectorProps {
  onSelectionChange: (factory?: string, craneName?: string) => void;
}

export function FactoryCraneSelector({ onSelectionChange }: FactoryCraneSelectorProps) {
  const [selectedFactory, setSelectedFactory] = useState<string>("");
  const [selectedCrane, setSelectedCrane] = useState<string>("");

  const { data: factories = [] } = useQuery<string[]>({
    queryKey: ["/api/factories"],
  });

  // Get crane names filtered by selected factory
  const { data: craneNames = [] } = useQuery<string[]>({
    queryKey: ["/api/crane-names", selectedFactory],
    queryFn: async () => {
      const url = selectedFactory && selectedFactory !== "all" 
        ? `/api/crane-names?factory=${encodeURIComponent(selectedFactory)}`
        : '/api/crane-names';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch crane names');
      return response.json();
    },
  });

  // Reset crane selection when factory changes
  useEffect(() => {
    if (selectedFactory) {
      setSelectedCrane(""); // Reset crane selection when factory changes
    }
  }, [selectedFactory]);

  const handleFactoryChange = (factory: string) => {
    setSelectedFactory(factory);
    setSelectedCrane(""); // Clear crane selection when factory changes
    onSelectionChange(factory === "all" ? undefined : factory, undefined);
  };

  const handleCraneChange = (crane: string) => {
    setSelectedCrane(crane);
    onSelectionChange(selectedFactory === "all" ? undefined : selectedFactory, crane === "all" ? undefined : crane);
  };

  const handleReset = () => {
    setSelectedFactory("");
    setSelectedCrane("");
    onSelectionChange(undefined, undefined);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Factory className="w-5 h-5 text-blue-500" />
            <span>공장 및 크레인 선택</span>
          </h3>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <Select value={selectedFactory} onValueChange={handleFactoryChange}>
                <SelectTrigger className="w-[200px] h-9 text-sm">
                  <SelectValue placeholder="공장 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 공장</SelectItem>
                  {factories.map((factory) => (
                    <SelectItem key={factory} value={factory}>
                      {factory}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Factory className="w-4 h-4 text-gray-500" />
              <Select value={selectedCrane} onValueChange={handleCraneChange}>
                <SelectTrigger className="w-[200px] h-9 text-sm">
                  <SelectValue placeholder="크레인 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 크레인</SelectItem>
                  {craneNames.map((crane) => (
                    <SelectItem key={crane} value={crane}>
                      {crane}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            초기화
          </Button>
          <div className="text-sm text-gray-500">
            {selectedFactory && selectedFactory !== "all" && (
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                공장: {selectedFactory}
              </span>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}