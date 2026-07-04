import { useState, ReactNode, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default to open on desktop

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Global scroll lock for all modals in Admin
  useEffect(() => {
    const checkModals = () => {
      // Find all potential modal overlays
      const overlays = document.querySelectorAll('.fixed.inset-0');
      let isModalVisible = false;
      
      overlays.forEach(overlay => {
        // Skip if it's the mobile sidebar overlay on desktop
        if (overlay.classList.contains('lg:hidden') && window.innerWidth >= 1024) {
          return;
        }
        
        const style = window.getComputedStyle(overlay);
        if (style.display !== 'none') {
          // Check if it has a background color to act as overlay
          if (overlay.className.includes('bg-') || overlay.className.includes('z-')) {
              isModalVisible = true;
          }
        }
      });

      const mainElement = document.querySelector('main');
      if (isModalVisible) {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        if (mainElement) {
          mainElement.style.overflow = 'hidden';
        }
      } else {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        if (mainElement) {
          mainElement.style.overflow = '';
        }
      }
    };

    const observer = new MutationObserver(checkModals);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true, 
      attributes: true, 
      attributeFilter: ['class', 'style'] 
    });

    // Handle window resize for lg:hidden check
    window.addEventListener('resize', checkModals);
    checkModals();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkModals);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar - Fixed */}
      <div
        className={`fixed left-0 top-0 h-screen z-50 transition-transform duration-300 ease-in-out w-64 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <AdminSidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 w-full ${
        isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
      }`}>
        {/* Header */}
        <AdminHeader onMenuClick={toggleSidebar} isSidebarOpen={isSidebarOpen} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-neutral-50">{children}</main>
      </div>
    </div>
  );
}

