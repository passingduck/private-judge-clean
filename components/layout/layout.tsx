import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showHeader?: boolean;
  showSidebar?: boolean;
}

export default function Layout({ 
  children, 
  title = '사적 재판',
  showHeader = true,
  showSidebar = false 
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {showHeader && (
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  {title}
                </h1>
              </div>
              <nav className="flex space-x-4">
                <a 
                  href="/dashboard" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  대시보드
                </a>
                <a 
                  href="/history" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  히스토리
                </a>
              </nav>
            </div>
          </div>
        </header>
      )}
      
      <div className="flex">
        {showSidebar && (
          <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
            <div className="p-4">
              <nav className="space-y-2">
                <a 
                  href="/rooms/create" 
                  className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  새 토론 생성
                </a>
                <a 
                  href="/rooms" 
                  className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  참여 중인 토론
                </a>
              </nav>
            </div>
          </aside>
        )}
        
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
