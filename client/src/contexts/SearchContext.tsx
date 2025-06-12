import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface SearchFilters {
  selectedFactory: string;
  selectedCrane: string;
  startDate: string;
  endDate: string;
  selectedPeriod: string;
  dateMode: 'period' | 'range';
}

interface SearchContextType {
  filters: SearchFilters;
  updateFilters: (newFilters: Partial<SearchFilters>) => void;
  triggerSearch: () => void;
  searchTrigger: number;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<SearchFilters>({
    selectedFactory: '',
    selectedCrane: '',
    startDate: '',
    endDate: '',
    selectedPeriod: '', // Empty by default to show all data
    dateMode: 'period'
  });
  
  const [searchTrigger, setSearchTrigger] = useState(0);

  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const triggerSearch = () => {
    setSearchTrigger(prev => prev + 1);
  };

  return (
    <SearchContext.Provider value={{ filters, updateFilters, triggerSearch, searchTrigger }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}