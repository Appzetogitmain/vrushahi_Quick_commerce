import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { useLocation as useLocationContext } from '../hooks/useLocation';
import LocationPermissionRequest from './LocationPermissionRequest';
import ComingSoonScreen from './ComingSoonScreen';
import { useThemeContext } from '../context/ThemeContext';

interface AppLayoutProps {
  children: ReactNode;
}

// Sub-component for Dock Items to keep code clean
function NavItem({ to, isActive, label, icon }: { to: string, isActive: boolean, label: string, icon: (active: boolean) => React.ReactNode }) {
  return (
    <motion.div
      whileTap={{ scale: 0.9 }}
      className="flex-1 min-w-[64px]"
    >
      <Link to={to} className="flex flex-col items-center justify-center py-2 relative group">
        <div className="relative z-10 transition-transform duration-300 group-hover:-translate-y-0.5">
          {icon(isActive)}
        </div>
        <span className={`text-[9px] mt-1 font-black uppercase tracking-tighter transition-colors relative z-10 ${isActive ? 'text-[#ff4d6d]' : 'text-[#94a3b8]'}`}>
          {label}
        </span>
        {isActive && (
          <motion.div 
            layoutId="dockPill"
            className="absolute inset-x-1 inset-y-1 bg-pink-50/80 rounded-2xl md:rounded-3xl -z-0"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
      </Link>
    </motion.div>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mainRef = useRef<HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [categoriesRotation, setCategoriesRotation] = useState(0);
  const [prevCategoriesActive, setPrevCategoriesActive] = useState(false);
  const { isLocationEnabled, isLocationLoading, location: userLocation, hasSellersInRange, isServiceAreaLoading } = useLocationContext();
  const [showLocationRequest, setShowLocationRequest] = useState(false);
  const [showLocationChangeModal, setShowLocationChangeModal] = useState(false);
  const { currentTheme } = useThemeContext();

  const isActive = (path: string) => location.pathname === path;

  // Check if location is required for current route
  const requiresLocation = () => {
    const publicRoutes = [
      '/login', 
      '/signup', 
      '/seller/login', 
      '/seller/signup', 
      '/delivery/login', 
      '/delivery/signup', 
      '/admin/login', 
      '/policy',
      '/delivery/privacy-policy',
      '/delivery/support',
      '/support',
      '/about-us',
      '/faq',
      '/privacy-policy',
      '/seller/support',
      '/seller/privacy-policy'
    ];
    if (publicRoutes.includes(location.pathname)) {
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (isLocationLoading) return;
    if (isLocationEnabled) {
      setShowLocationRequest(false);
      return;
    }
    if (!isLocationEnabled && requiresLocation()) {
      setShowLocationRequest(true);
    } else {
      setShowLocationRequest(false);
    }
  }, [isLocationLoading, isLocationEnabled, location.pathname]);

  useEffect(() => {
    const query = searchParams.get('q') || '';
    setSearchQuery(query);
  }, [searchParams]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (location.pathname === '/search') {
      if (value.trim()) setSearchParams({ q: value });
      else setSearchParams({});
    } else {
      if (value.trim()) navigate(`/search?q=${encodeURIComponent(value)}`);
    }
  };

  useEffect(() => {
    const handleOpenLocationPicker = () => setShowLocationChangeModal(true);
    window.addEventListener('openLocationPicker', handleOpenLocationPicker);
    return () => window.removeEventListener('openLocationPicker', handleOpenLocationPicker);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (mainRef.current) mainRef.current.scrollTop = 0;
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
  }, [location.pathname]);

  const isCategoriesActive = isActive('/categories') || location.pathname.startsWith('/category/');

  useEffect(() => {
    if (isCategoriesActive && !prevCategoriesActive) {
      setCategoriesRotation(prev => prev + 360);
      setPrevCategoriesActive(true);
    } else if (!isCategoriesActive && prevCategoriesActive) {
      setCategoriesRotation(prev => prev - 360);
      setPrevCategoriesActive(false);
    }
  }, [isCategoriesActive, prevCategoriesActive]);

  const isCheckoutPage = location.pathname === '/checkout' || location.pathname.startsWith('/checkout/');
  const isProductPage = location.pathname.startsWith('/product/');
  const showHeader = false; 
  const showSearchBar = false;
  const showFooter = !isCheckoutPage && !isProductPage;
  const showComingSoon = false;

  return (
    <div className="flex flex-col min-h-screen w-full overflow-x-hidden">
      <div className="md:w-full md:bg-white md:min-h-screen overflow-x-hidden">
        <div className="md:w-full md:min-h-screen md:flex md:flex-col overflow-x-hidden">
          {showComingSoon ? (
            <ComingSoonScreen onChangeLocation={() => setShowLocationChangeModal(true)} />
          ) : (
            <>
              {/* Sticky Header */}
              {showHeader && (
                <header className="sticky top-0 z-50 bg-white shadow-sm md:shadow-md md:top-[72px]">
                  <div className="px-4 md:px-6 lg:px-8 py-1.5 bg-neutral-50 text-[10px] text-neutral-500 text-center font-black uppercase tracking-widest">
                    Fast Delivery Marketplace
                  </div>
                  {userLocation && (userLocation.address || userLocation.city) && (
                    <div className="px-4 md:px-6 lg:px-8 py-2 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 min-w-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="rgba(0,0,0,0.6)" />
                        </svg>
                        <span className="text-neutral-700 line-clamp-1">
                          {userLocation?.address || userLocation?.city || ''}
                        </span>
                      </div>
                      <button onClick={() => setShowLocationChangeModal(true)} className="text-blue-600 font-medium hover:text-blue-700 ml-2">Change</button>
                    </div>
                  )}
                  {showSearchBar && (
                    <div className="px-4 md:px-6 lg:px-8 pb-3">
                      <div className="relative max-w-2xl md:mx-auto">
                        <input type="text" value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search..." className="w-full px-4 py-2 bg-neutral-50 border rounded-lg" />
                      </div>
                    </div>
                  )}
                </header>
              )}

              {/* Main Content */}
              <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-24 md:pb-12">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </main>



              {/* Floating/Fixed Navigation Dock */}
              {showFooter && (
                <nav className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-1/2 md:-translate-x-1/2 z-[1001] w-full md:w-auto transition-all duration-500 active:scale-[0.98]">
                  <div 
                    className="relative bg-white md:bg-white/80 backdrop-blur-none md:backdrop-blur-3xl border-t border-neutral-100 md:border md:border-white/40 shadow-[0_-2px_12px_rgba(0,0,0,0.05)] md:shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-none md:rounded-[3rem] px-3 md:px-10 py-1.5 pb-[calc(env(safe-area-inset-bottom)+8px)] md:py-3 flex items-center justify-center gap-1 md:gap-8 transition-all duration-300 w-full md:min-w-[420px]"
                  >
                     <style dangerouslySetInnerHTML={{ __html: `
                        @media (min-width: 768px) {
                          .nav-dock-inner { min-width: 650px !important; }
                        }
                      `}} />
                    <div className="nav-dock-inner flex items-center justify-center w-full gap-1 md:gap-8">
                      <NavItem to="/" isActive={isActive('/')} label="Home" icon={(active) => (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M3 9.5L12 3L21 9.5V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V9.5Z" stroke={active ? "white" : "#94a3b8"} strokeWidth="2" fill={active ? "#ff4d6d" : "none"} />
                          {active && <text x="12" y="15.5" textAnchor="middle" fill="white" fontSize="9" fontWeight="900">z</text>}
                        </svg>
                      )} />
                      <NavItem to="/order-again" isActive={isActive('/order-again')} label="Reorder" icon={(active) => (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11" stroke={active ? "#ff4d6d" : "#94a3b8"} strokeWidth="2.5" />
                          <rect x="4" y="9" width="16" height="12" rx="3" fill={active ? "#ff4d6d" : "none"} stroke={active ? "#ff4d6d" : "#94a3b8"} strokeWidth="2" />
                        </svg>
                      )} />
                      <NavItem to="/stores" isActive={isActive('/stores')} label="Stores" icon={(active) => (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M3 9L12 3L21 9V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V9Z" stroke={active ? "#ff4d6d" : "#94a3b8"} strokeWidth="2" fill={active ? "#ff4d6d" : "none"} />
                        </svg>
                      )} />
                      <NavItem to="/categories" isActive={isCategoriesActive} label="Menu" icon={(active) => (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={active ? "#ff4d6d" : "#94a3b8"} strokeWidth="2" fill={active ? "#ff4d6d" : "none"} />
                          <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={active ? "#ff4d6d" : "#94a3b8"} strokeWidth="2" fill={active ? "#ff4d6d" : "none"} />
                          <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={active ? "#ff4d6d" : "#94a3b8"} strokeWidth="2" fill={active ? "#ff4d6d" : "none"} />
                          <rect x="14" y="14" width="7" height="7" rx="1.5" stroke={active ? "#ff4d6d" : "#94a3b8"} strokeWidth="2" fill={active ? "#ff4d6d" : "none"} />
                        </svg>
                      )} />
                      <NavItem to="/account" isActive={isActive('/account')} label="Account" icon={(active) => (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="7" r="4" stroke={active ? "#ff4d6d" : "#94a3b8"} strokeWidth="2" fill={active ? "#ff4d6d" : "none"} />
                          <path d="M4 21C4 17.134 7.13401 14 11 14H13C16.866 14 20 17.134 20 21" stroke={active ? "#ff4d6d" : "#94a3b8"} strokeWidth="2.5" />
                        </svg>
                      )} />
                    </div>
                  </div>
                </nav>
              )}
            </>
          )}

          {/* {showLocationRequest && (
            <LocationPermissionRequest onLocationGranted={() => setShowLocationRequest(false)} skipable={true} title="Location Required" />
          )}

          {showLocationChangeModal && (
            <LocationPermissionRequest onLocationGranted={() => setShowLocationChangeModal(false)} skipable={true} isChangeMode={true} title="Change Location" />
          )} */}
        </div>
      </div>
    </div>
  );
}
