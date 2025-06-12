import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Map, 
  AlertTriangle, 
  Wrench,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "대시보드", href: "/", icon: LayoutDashboard },
  { name: "크레인 지도", href: "/crane-map", icon: Map },
  { name: "돌발수리 이력", href: "/failure-history", icon: AlertTriangle },
  { name: "일상수리 이력", href: "/maintenance-history", icon: Wrench },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-96 flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex h-24 items-center px-10 border-b border-gray-100">
        <div className="flex flex-col items-start space-y-1 w-full">
          <img 
            src="/src/assets/pocrane-logo.png" 
            alt="PoCRANE Logo" 
            className="h-14 w-auto max-w-[280px] object-contain"
          />
          <p className="text-gray-500 font-medium text-[18px] text-center">스마트 크레인 정비 모니터링 시스템</p>
        </div>
      </div>
      {/* Navigation */}
      <nav className="flex-1 px-8 py-10">
        <div className="space-y-3">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name} 
                href={item.href}
                className={cn(
                  "group flex items-center rounded-xl px-6 py-4 text-lg font-medium transition-all duration-200 cursor-pointer shadow-sm",
                  isActive
                    ? "bg-blue-50 text-blue-700 border-r-4 border-blue-500 shadow-md"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-5 h-7 w-7 flex-shrink-0",
                    isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-500"
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
      {/* Footer */}
      <div className="border-t border-gray-100 px-8 py-6">
        <button className="group flex w-full items-center rounded-xl px-6 py-4 text-lg font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 shadow-sm hover:shadow-md mb-6">
          <Settings className="mr-5 h-7 w-7 text-gray-400 group-hover:text-gray-500" />
          설정
        </button>
        
        <div className="pt-4 border-t border-gray-100">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-gray-600">PoCRANE v2.0</p>
            <p className="text-xs text-gray-400">크레인 정비 관리 시스템</p>
            <p className="text-xs text-gray-400">© 2024 All rights reserved</p>
          </div>
        </div>
      </div>
    </div>
  );
}