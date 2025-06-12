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
    <div className="flex h-screen w-64 flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex h-16 items-center px-6 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <img 
            src="/src/assets/pocrane-logo.svg" 
            alt="PoCRANE Logo" 
            className="h-8 w-auto"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name} 
                href={item.href}
                className={cn(
                  "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-500"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
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
      <div className="border-t border-gray-100 p-4">
        <div className="flex items-center rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-50 cursor-pointer">
          <Settings className="mr-3 h-4 w-4 text-gray-400" />
          <span className="text-sm">설정</span>
        </div>
      </div>
    </div>
  );
}