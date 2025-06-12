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
  { name: "정비수리 이력", href: "/maintenance-history", icon: Wrench },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-64 flex-col bg-gradient-to-b from-teal-600 to-teal-800 text-white">
      {/* Header */}
      <div className="flex h-16 items-center justify-center border-b border-teal-500/30">
        <h1 className="text-xl font-bold">크레인 관리 시스템</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <a
                className={cn(
                  "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-teal-700 text-white shadow-lg"
                    : "text-teal-100 hover:bg-teal-700/50 hover:text-white"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-white" : "text-teal-200"
                  )}
                />
                {item.name}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-teal-500/30 p-4">
        <div className="flex items-center rounded-lg bg-teal-700/50 px-3 py-2">
          <Settings className="mr-3 h-4 w-4 text-teal-200" />
          <span className="text-sm text-teal-100">설정</span>
        </div>
      </div>
    </div>
  );
}