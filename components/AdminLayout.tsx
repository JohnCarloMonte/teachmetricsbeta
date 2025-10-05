import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { FileText, Home, Users, BarChart, UserPlus, Settings, Filter, Cog, Printer, FileCheck } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
}

const years = [
  { id: "2025", label: "2025" },
  { id: "2026", label: "2026" },
  { id: "2027", label: "2027" },
];

// Get current year as string, fallback to "2024" if not in years
const currentYear = (() => {
  const y = String(new Date().getFullYear());
  return years.some(yr => yr.id === y) ? y : "2025";
})();

const AdminLayout = ({ children, activeTab = "dashboard" }: AdminLayoutProps) => {
  const location = useLocation();
  
  // Determine active tab from URL if not explicitly provided
  const currentTab = activeTab || location.pathname.split('/').pop() || 'dashboard';
  
  const tabs = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: <Home className="h-5 w-5" />,
      href: '/admin-dashboard'
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: <FileText className="h-5 w-5" />,
      href: '/admin-dashboard/reports'
    },
    { 
      id: 'teachers', 
      label: 'Teachers', 
      icon: <Users className="h-5 w-5" />,
      href: '/admin-dashboard/teachers' 
    },
    { 
      id: 'system', 
      label: 'System', 
      icon: <Cog className="h-5 w-5" />,
      href: '/admin-dashboard/system'
    },
    { 
      id: 'password-resets', 
      label: 'Password Resets', 
      icon: <UserPlus className="h-5 w-5" />,
      href: '/admin-dashboard/password-resets'
    },
    { 
      id: 'profile', 
      label: 'Profile', 
      icon: <Settings className="h-5 w-5" />,
      href: '/admin-dashboard/profile'
    },
    { 
      id: 'filter-words', 
      label: 'Filter Words', 
      icon: <Filter className="h-5 w-5" />,
      href: '/admin-dashboard/filter-words'
    },
  ];
  
  // Add year state
  const [selectedYear, setSelectedYear] = useState(currentYear);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <img 
              src="/lovable-uploads/logo.png" 
              alt="ACLC Logo" 
              className="h-12 w-12 object-contain"
            />
            <Link to="/admin-dashboard" className="text-lg md:text-xl font-bold text-primary">
              Academic Head Dashboard
            </Link>
          </div>
          <div>
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary">Logout</Link>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6">
        {/* Year Tabs */}
        <div className="mb-6 flex gap-2">
          {years.map(year => (
            <button
              key={year.id}
              className={cn(
                "px-4 py-2 rounded-md font-semibold text-sm transition-colors",
                selectedYear === year.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-primary/10"
              )}
              onClick={() => setSelectedYear(year.id)}
            >
              {year.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar navigation */}
          <aside className="w-full lg:w-64 bg-white rounded-lg shadow-sm p-4">
            <nav className="space-y-1">
              {["2024", "2025"].includes(selectedYear) ? (
                tabs.map((tab) => (
                  <Link
                    key={tab.id}
                    to={tab.href}
                    className={cn(
                      "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      currentTab === tab.id 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    )}
                  >
                    {tab.icon}
                    <span className="ml-3">{tab.label}</span>
                  </Link>
                ))
              ) : (
                <div className="text-muted-foreground text-center py-8">
                  No tabs available for {selectedYear}.<br />
                  <span className="text-xs">Coming soon.</span>
                </div>
              )}
            </nav>
          </aside>
          
          {/* Main content area */}
          <main className="flex-1 bg-white rounded-lg shadow-sm p-4 md:p-6 overflow-x-auto">
            {["2024", "2025"].includes(selectedYear) ? (
              children
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <h2 className="text-lg font-semibold mb-2">No content for {selectedYear}</h2>
                <p className="text-sm">This year is currently empty.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
