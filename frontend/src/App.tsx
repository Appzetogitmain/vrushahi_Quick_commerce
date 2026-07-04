import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy, startTransition, useEffect } from "react";
import { CartProvider } from "./context/CartContext";
import { OrdersProvider } from "./context/OrdersContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LocationProvider } from "./context/LocationContext";
import { ToastProvider } from "./context/ToastContext";

import { LoadingProvider } from "./context/LoadingContext";
import { AxiosLoadingInterceptor } from "./context/AxiosLoadingInterceptor";
import IconLoader from "./components/loaders/IconLoader";
import RouteLoaderTrigger from "./components/loaders/RouteLoaderTrigger";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import LoadingSpinner from "./components/LoadingSpinner";
import ErrorBoundary from "./components/ErrorBoundary";
import RouteTransition from "./components/RouteTransition";

// Critical routes - load immediately (Home, Cart, Checkout)
import Home from "./modules/user/Home";
import Cart from "./modules/user/Cart";
import Checkout from "./modules/user/Checkout";
import CheckoutAddress from "./modules/user/CheckoutAddress";
import ProductDetail from "./modules/user/ProductDetail";

// Lazy load less critical routes for code splitting
const Search = lazy(() => import("./modules/user/Search"));
const Orders = lazy(() => import("./modules/user/Orders"));
const OrderDetail = lazy(() => import("./modules/user/OrderDetail"));
const OrderAgain = lazy(() => import("./modules/user/OrderAgain"));
const Account = lazy(() => import("./modules/user/Account"));
const Categories = lazy(() => import("./modules/user/Categories"));
const Category = lazy(() => import("./modules/user/Category"));
const Invoice = lazy(() => import("./modules/user/Invoice"));
const Login = lazy(() => import("./modules/user/Login"));

const AboutUs = lazy(() => import("./modules/user/AboutUs"));
const Support = lazy(() => import("./modules/user/Support"));
const FAQ = lazy(() => import("./modules/user/FAQ"));
const Wishlist = lazy(() => import("./modules/user/Wishlist"));
const Addresses = lazy(() => import("./modules/user/Addresses"));
const AddressBook = lazy(() => import("./modules/user/AddressBook"));
const SellerStore = lazy(() => import("./modules/user/SellerStore"));
const Stores = lazy(() => import("./modules/user/Stores"));
const PolicyPage = lazy(() => import("./modules/user/PolicyPage"));
const CustomerPrivacyPolicy = lazy(() => import("./modules/user/CustomerPrivacyPolicy"));

// Lazy load delivery routes
const DeliveryLayout = lazy(
  () => import("./modules/delivery/components/DeliveryLayout"),
);
const DeliveryDashboard = lazy(
  () => import("./modules/delivery/pages/DeliveryDashboard"),
);
const DeliveryOrders = lazy(
  () => import("./modules/delivery/pages/DeliveryOrders"),
);
const DeliveryWallet = lazy(
  () => import("./modules/delivery/pages/DeliveryWallet"),
);
const DeliveryOrderDetail = lazy(
  () => import("./modules/delivery/pages/DeliveryOrderDetail"),
);
const DeliveryNotifications = lazy(
  () => import("./modules/delivery/pages/DeliveryNotifications"),
);
const DeliveryMenu = lazy(
  () => import("./modules/delivery/pages/DeliveryMenu"),
);
const DeliveryPendingOrders = lazy(
  () => import("./modules/delivery/pages/DeliveryPendingOrders"),
);
const DeliveryAllOrders = lazy(
  () => import("./modules/delivery/pages/DeliveryAllOrders"),
);
const DeliveryReturnOrders = lazy(
  () => import("./modules/delivery/pages/DeliveryReturnOrders"),
);
const DeliveryReturnOrderDetail = lazy(
  () => import("./modules/delivery/pages/DeliveryReturnOrderDetail"),
);
const DeliveryProfile = lazy(
  () => import("./modules/delivery/pages/DeliveryProfile"),
);

const AdminWithdrawals = lazy(
  () => import("./modules/admin/pages/AdminWithdrawals"),
);
const DeliverySettings = lazy(
  () => import("./modules/delivery/pages/DeliverySettings"),
);
const DeliveryHelp = lazy(
  () => import("./modules/delivery/pages/DeliveryHelp"),
);
const DeliveryAbout = lazy(
  () => import("./modules/delivery/pages/DeliveryAbout"),
);
const DeliveryPrivacyPolicy = lazy(
  () => import("./modules/delivery/pages/DeliveryPrivacyPolicy"),
);
const DeliverySellersInRange = lazy(
  () => import("./modules/delivery/pages/DeliverySellersInRange"),
);
const DeliveryLogin = lazy(
  () => import("./modules/delivery/pages/DeliveryLogin"),
);
const DeliverySignUp = lazy(
  () => import("./modules/delivery/pages/DeliverySignUp"),
);

// Lazy load seller routes
const SellerLayout = lazy(
  () => import("./modules/seller/components/SellerLayout"),
);
const SellerDashboard = lazy(
  () => import("./modules/seller/pages/SellerDashboard"),
);
const SellerOrders = lazy(() => import("./modules/seller/pages/SellerOrders"));
const SellerOrderDetail = lazy(
  () => import("./modules/seller/pages/SellerOrderDetail"),
);
const SellerCategory = lazy(
  () => import("./modules/seller/pages/SellerCategory"),
);
const SellerSubCategory = lazy(
  () => import("./modules/seller/pages/SellerSubCategory"),
);
const SellerAddProduct = lazy(
  () => import("./modules/seller/pages/SellerAddProduct"),
);
const SellerTaxes = lazy(() => import("./modules/seller/pages/SellerTaxes"));
const SellerProductList = lazy(
  () => import("./modules/seller/pages/SellerProductList"),
);
const SellerStockManagement = lazy(
  () => import("./modules/seller/pages/SellerStockManagement"),
);
const SellerWallet = lazy(() => import("./modules/seller/pages/SellerWallet"));
const SellerSalesReport = lazy(
  () => import("./modules/seller/pages/SellerSalesReport"),
);
const SellerReturnRequest = lazy(
  () => import("./modules/seller/pages/SellerReturnRequest"),
);
const SellerAccountSettings = lazy(
  () => import("./modules/seller/pages/SellerAccountSettings"),
);
const SellerSubscription = lazy(() => import("./modules/seller/pages/SellerSubscription"));
const SellerLogin = lazy(() => import("./modules/seller/pages/SellerLogin"));
const SellerSignUp = lazy(() => import("./modules/seller/pages/SellerSignUp"));
const SellerFAQ = lazy(() => import("./modules/seller/pages/SellerFAQ"));
const SellerSupport = lazy(() => import("./modules/seller/pages/SellerSupport"));
const SellerPrivacyPolicy = lazy(() => import("./modules/seller/pages/SellerPrivacyPolicy"));
const SellerCustomers = lazy(() => import("./modules/seller/pages/SellerCustomers"));

// Lazy load admin routes
const AdminLayout = lazy(
  () => import("./modules/admin/components/AdminLayout"),
);
const AdminDashboard = lazy(
  () => import("./modules/admin/pages/AdminDashboard"),
);
const AdminLogin = lazy(() => import("./modules/admin/pages/AdminLogin"));
const AdminCategory = lazy(() => import("./modules/admin/pages/AdminCategory"));
const AdminHeaderCategory = lazy(
  () => import("./modules/admin/pages/AdminHeaderCategory"),
);
const AdminSubCategory = lazy(
  () => import("./modules/admin/pages/AdminSubCategory"),
);
const AdminBrand = lazy(() => import("./modules/admin/pages/AdminBrand"));
const AdminTaxes = lazy(() => import("./modules/admin/pages/AdminTaxes"));
const AdminSellerTransaction = lazy(
  () => import("./modules/admin/pages/AdminSellerTransaction"),
);
const AdminStockManagement = lazy(
  () => import("./modules/admin/pages/AdminStockManagement"),
);
const AdminSubcategoryOrder = lazy(
  () => import("./modules/admin/pages/AdminSubcategoryOrder"),
);
const AdminManageSellerList = lazy(
  () => import("./modules/admin/pages/AdminManageSellerList"),
);
const AdminCoupon = lazy(() => import("./modules/admin/pages/AdminCoupon"));
const AdminNotification = lazy(
  () => import("./modules/admin/pages/AdminNotification"),
);
const AdminSellerLocation = lazy(
  () => import("./modules/admin/pages/AdminSellerLocation"),
);
const AdminWallet = lazy(() => import("./modules/admin/pages/AdminWallet"));
const AdminManageDeliveryBoy = lazy(
  () => import("./modules/admin/pages/AdminManageDeliveryBoy"),
);
const AdminFundTransfer = lazy(
  () => import("./modules/admin/pages/AdminFundTransfer"),
);
const AdminCashCollection = lazy(
  () => import("./modules/admin/pages/AdminCashCollection"),
);
const AdminReturnRequest = lazy(
  () => import("./modules/admin/pages/AdminReturnRequest"),
);
const AdminPaymentList = lazy(
  () => import("./modules/admin/pages/AdminPaymentList"),
);
const AdminSmsGateway = lazy(
  () => import("./modules/admin/pages/AdminSmsGateway"),
);
const AdminSystemUser = lazy(
  () => import("./modules/admin/pages/AdminSystemUser"),
);
const AdminUsers = lazy(() => import("./modules/admin/pages/AdminUsers"));
const AdminFAQ = lazy(() => import("./modules/admin/pages/AdminFAQ"));
const AdminHomeSection = lazy(
  () => import("./modules/admin/pages/AdminHomeSection"),
);
const AdminBestsellerCards = lazy(
  () => import("./modules/admin/pages/AdminBestsellerCards"),
);
const AdminPromoStrip = lazy(
  () => import("./modules/admin/pages/AdminPromoStrip"),
);
const AdminLowestPrices = lazy(
  () => import("./modules/admin/pages/AdminLowestPrices"),
);
const AdminBanners = lazy(() => import("./modules/admin/pages/AdminBanners"));
const AdminAllOrders = lazy(
  () => import("./modules/admin/pages/AdminAllOrders"),
);
const AdminPendingOrders = lazy(
  () => import("./modules/admin/pages/AdminPendingOrders"),
);
const AdminReceivedOrders = lazy(
  () => import("./modules/admin/pages/AdminReceivedOrders"),
);
const AdminProcessedOrders = lazy(
  () => import("./modules/admin/pages/AdminProcessedOrders"),
);
const AdminShippedOrders = lazy(
  () => import("./modules/admin/pages/AdminShippedOrders"),
);
const AdminOutForDeliveryOrders = lazy(
  () => import("./modules/admin/pages/AdminOutForDeliveryOrders"),
);
const AdminDeliveredOrders = lazy(
  () => import("./modules/admin/pages/AdminDeliveredOrders"),
);
const AdminCancelledOrders = lazy(
  () => import("./modules/admin/pages/AdminCancelledOrders"),
);
const AdminPendingRefundOrders = lazy(
  () => import("./modules/admin/pages/AdminPendingRefundOrders"),
);
const AdminCustomerAppPolicy = lazy(
  () => import("./modules/admin/pages/AdminCustomerAppPolicy"),
);
const AdminDeliveryAppPolicy = lazy(
  () => import("./modules/admin/pages/AdminDeliveryAppPolicy"),
);
const AdminSellerAppPolicy = lazy(
  () => import("./modules/admin/pages/AdminSellerAppPolicy"),
);
const AdminOrders = lazy(() => import("./modules/admin/pages/AdminOrders"));
const AdminOrderDetail = lazy(
  () => import("./modules/admin/pages/AdminOrderDetail"),
);
const AdminManageCustomer = lazy(
  () => import("./modules/admin/pages/AdminManageCustomer"),
);
const AdminProfile = lazy(() => import("./modules/admin/pages/AdminProfile"));
const AdminBillingSettings = lazy(
  () => import("./modules/admin/pages/AdminBillingSettings"),
);
const AdminSubscriptionPlans = lazy(
  () => import("./modules/admin/pages/AdminSubscriptionPlans"),
);
const AdminSubscriptionRevenue = lazy(
  () => import("./modules/admin/pages/AdminSubscriptionRevenue"),
);

import { initializePushNotifications, setupForegroundNotificationHandler, registerFCMToken } from "./services/pushNotificationService";

function AppContent() {
  const { isAuthenticated } = useAuth();

  // Initialize push notifications (service worker registration only)
  useEffect(() => {
    initializePushNotifications();
    setupForegroundNotificationHandler();
  }, []);

  // NOTE: FCM token registration is handled in individual login flows
  // (DeliveryLogin, SellerLogin, AdminLogin, CustomerLogin)
  // This prevents duplicate notifications from being sent on:
  // - Page refresh
  // - Tab switching
  // - Component re-renders
  // - Auth state rehydration

  return (
    <ErrorBoundary>
      <LoadingProvider>
        <AxiosLoadingInterceptor>
          <IconLoader />
          <ThemeProvider>
            <LocationProvider>
              <ToastProvider>
                <CartProvider>
                  <OrdersProvider>
                    <BrowserRouter
                      future={{
                        v7_startTransition: true,
                        v7_relativeSplatPath: true,
                      }}>
                      <RouteLoaderTrigger />
                      <Routes>
                        {/* ... (rest of the routes) */}
                        {/* Public Routes */}
                        <Route
                          path="/login"
                          element={
                            <PublicRoute>
                              <Suspense fallback={<IconLoader forceShow />}>
                                <Login />
                              </Suspense>
                            </PublicRoute>
                          }
                        />

                        <Route
                          path="/seller/login"
                          element={
                            <PublicRoute>
                              <Suspense fallback={<IconLoader forceShow />}>
                                <SellerLogin />
                              </Suspense>
                            </PublicRoute>
                          }
                        />
                        <Route
                          path="/seller/signup"
                          element={
                            <PublicRoute>
                              <Suspense fallback={<IconLoader forceShow />}>
                                <SellerSignUp />
                              </Suspense>
                            </PublicRoute>
                          }
                        />
                        <Route
                          path="/delivery/login"
                          element={
                            <PublicRoute>
                              <Suspense fallback={<IconLoader forceShow />}>
                                <DeliveryLogin />
                              </Suspense>
                            </PublicRoute>
                          }
                        />
                        <Route
                          path="/delivery/signup"
                          element={
                            <PublicRoute>
                              <Suspense fallback={<IconLoader forceShow />}>
                                <DeliverySignUp />
                              </Suspense>
                            </PublicRoute>
                          }
                        />
                        <Route
                          path="/admin/login"
                          element={
                            <PublicRoute>
                              <Suspense fallback={<IconLoader forceShow />}>
                                <AdminLogin />
                              </Suspense>
                            </PublicRoute>
                          }
                        />

                        <Route
                          path="/delivery/support"
                          element={
                            <Suspense fallback={<IconLoader forceShow />}>
                              <DeliveryHelp />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/delivery/privacy-policy"
                          element={
                            <Suspense fallback={<IconLoader forceShow />}>
                              <DeliveryPrivacyPolicy />
                            </Suspense>
                          }
                        />

                        <Route
                          path="/seller/support"
                          element={
                            <Suspense fallback={<IconLoader forceShow />}>
                              <SellerSupport />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/seller/privacy-policy"
                          element={
                            <Suspense fallback={<IconLoader forceShow />}>
                              <SellerPrivacyPolicy />
                            </Suspense>
                          }
                        />

                        {/* Delivery App Routes */}
                        <Route
                          path="/delivery/*"
                          element={
                            <ProtectedRoute
                              requiredUserType="Delivery"
                              redirectTo="/delivery/login">
                              <Suspense fallback={<IconLoader forceShow />}>
                                <DeliveryLayout>
                                  <Routes>
                                    <Route
                                      path=""
                                      element={<DeliveryDashboard />}
                                    />
                                    <Route
                                      path="orders"
                                      element={<DeliveryOrders />}
                                    />
                                    <Route
                                      path="orders/:id"
                                      element={<DeliveryOrderDetail />}
                                    />
                                    <Route
                                      path="orders/pending"
                                      element={<DeliveryPendingOrders />}
                                    />
                                    <Route
                                      path="orders/all"
                                      element={<DeliveryAllOrders />}
                                    />
                                    <Route
                                      path="orders/return"
                                      element={<DeliveryReturnOrders />}
                                    />
                                    <Route
                                      path="orders/return-pickup/:id"
                                      element={<DeliveryReturnOrderDetail />}
                                    />
                                    <Route
                                      path="notifications"
                                      element={<DeliveryNotifications />}
                                    />
                                    <Route
                                      path="menu"
                                      element={<DeliveryMenu />}
                                    />
                                    <Route
                                      path="profile"
                                      element={<DeliveryProfile />}
                                    />

                                    <Route
                                      path="wallet"
                                      element={<DeliveryWallet />}
                                    />
                                    <Route
                                      path="settings"
                                      element={<DeliverySettings />}
                                    />
                                    <Route
                                      path="support"
                                      element={<DeliveryHelp />}
                                    />
                                    <Route
                                      path="about"
                                      element={<DeliveryAbout />}
                                    />
                                    <Route
                                      path="sellers-in-range"
                                      element={<DeliverySellersInRange />}
                                    />
                                  </Routes>
                                </DeliveryLayout>
                              </Suspense>
                            </ProtectedRoute>
                          }
                        />

                        {/* Seller App Routes */}
                        <Route
                          path="/seller/*"
                          element={
                            <ProtectedRoute
                              requiredUserType="Seller"
                              redirectTo="/seller/login">
                              <Suspense fallback={<IconLoader forceShow />}>
                                <SellerLayout>
                                  <Routes>
                                    <Route
                                      path=""
                                      element={<SellerDashboard />}
                                    />
                                    <Route
                                      path="orders"
                                      element={<SellerOrders />}
                                    />
                                    <Route
                                      path="orders/:id"
                                      element={<SellerOrderDetail />}
                                    />
                                    <Route
                                      path="category"
                                      element={<SellerCategory />}
                                    />
                                    <Route
                                      path="subcategory"
                                      element={<SellerSubCategory />}
                                    />
                                    <Route
                                      path="product/add"
                                      element={<SellerAddProduct />}
                                    />
                                    <Route
                                      path="product/edit/:id"
                                      element={<SellerAddProduct />}
                                    />
                                    <Route
                                      path="product/taxes"
                                      element={<SellerTaxes />}
                                    />
                                    <Route
                                      path="product/list"
                                      element={<SellerProductList />}
                                    />
                                    <Route
                                      path="product/stock"
                                      element={<SellerStockManagement />}
                                    />
                                    <Route
                                      path="return"
                                      element={<SellerReturnRequest />}
                                    />
                                    <Route
                                      path="return-order"
                                      element={<SellerReturnRequest />}
                                    />
                                    <Route
                                      path="wallet"
                                      element={<SellerWallet />}
                                    />
                                    <Route
                                      path="faqs"
                                      element={<SellerFAQ />}
                                    />
                                    <Route
                                      path="support"
                                      element={<SellerSupport />}
                                    />
                                    <Route
                                      path="reports/sales"
                                      element={<SellerSalesReport />}
                                    />
                                    <Route
                                      path="account-settings"
                                      element={<SellerAccountSettings />}
                                    />
                                    <Route
                                      path="subscription"
                                      element={<SellerSubscription />}
                                    />
                                    <Route
                                      path="customers"
                                      element={<SellerCustomers />}
                                    />
                                  </Routes>
                                </SellerLayout>
                              </Suspense>
                            </ProtectedRoute>
                          }
                        />

                        {/* Admin App Routes */}
                        <Route
                          path="/admin/*"
                          element={
                            <ProtectedRoute
                              requiredUserType="Admin"
                              redirectTo="/admin/login">
                              <Suspense fallback={<IconLoader forceShow />}>
                                <AdminLayout>
                                  <Routes>
                                    <Route
                                      path=""
                                      element={<AdminDashboard />}
                                    />
                                    <Route
                                      path="profile"
                                      element={<AdminProfile />}
                                    />
                                    <Route
                                      path="category"
                                      element={<AdminCategory />}
                                    />
                                    <Route
                                      path="category/header"
                                      element={<AdminHeaderCategory />}
                                    />
                                    <Route
                                      path="subcategory"
                                      element={<AdminSubCategory />}
                                    />
                                    <Route
                                      path="subcategory-order"
                                      element={<AdminSubcategoryOrder />}
                                    />
                                    <Route
                                      path="brand"
                                      element={<AdminBrand />}
                                    />
                                    <Route
                                      path="product/taxes"
                                      element={<AdminTaxes />}
                                    />
                                    <Route
                                      path="product/list"
                                      element={<AdminStockManagement />}
                                    />
                                    <Route
                                      path="product/edit/:id"
                                      element={<SellerAddProduct />}
                                    />
                                    <Route
                                      path="manage-seller/list"
                                      element={<AdminManageSellerList />}
                                    />
                                    <Route
                                      path="manage-seller/transaction"
                                      element={<AdminSellerTransaction />}
                                    />
                                    <Route
                                      path="delivery-boy/manage"
                                      element={<AdminManageDeliveryBoy />}
                                    />
                                    <Route
                                      path="delivery-boy/fund-transfer"
                                      element={<AdminFundTransfer />}
                                    />
                                    <Route
                                      path="delivery-boy/cash-collection"
                                      element={<AdminCashCollection />}
                                    />
                                    <Route
                                      path="manage-location/seller-location"
                                      element={<AdminSellerLocation />}
                                    />
                                    <Route
                                      path="wallet"
                                      element={<AdminWallet />}
                                    />
                                    <Route
                                      path="coupon"
                                      element={<AdminCoupon />}
                                    />
                                    <Route
                                      path="return"
                                      element={<AdminReturnRequest />}
                                    />
                                    <Route
                                      path="withdrawals"
                                      element={<AdminWithdrawals />}
                                    />
                                    <Route
                                      path="notification"
                                      element={<AdminNotification />}
                                    />
                                    <Route
                                      path="orders"
                                      element={<AdminOrders />}
                                    />
                                    <Route
                                      path="customers"
                                      element={<AdminManageCustomer />}
                                    />
                                    <Route
                                      path="collect-cash"
                                      element={<AdminCashCollection />}
                                    />
                                    <Route
                                      path="payment-list"
                                      element={<AdminPaymentList />}
                                    />
                                    <Route
                                      path="sms-gateway"
                                      element={<AdminSmsGateway />}
                                    />
                                    <Route
                                      path="system-user"
                                      element={<AdminSystemUser />}
                                    />
                                    <Route
                                      path="customer-app-policy"
                                      element={<AdminCustomerAppPolicy />}
                                    />
                                    <Route
                                      path="delivery-app-policy"
                                      element={<AdminDeliveryAppPolicy />}
                                    />
                                    <Route
                                      path="seller-app-policy"
                                      element={<AdminSellerAppPolicy />}
                                    />
                                    <Route
                                      path="billing-settings"
                                      element={<AdminBillingSettings />}
                                    />
                                    <Route
                                      path="subscription-plans"
                                      element={<AdminSubscriptionPlans />}
                                    />
                                    <Route
                                      path="subscription-revenue"
                                      element={<AdminSubscriptionRevenue />}
                                    />
                                    <Route
                                      path="users"
                                      element={<AdminUsers />}
                                    />
                                    <Route
                                      path="faq"
                                      element={<AdminFAQ />}
                                    />
                                    <Route
                                      path="home-section"
                                      element={<AdminHomeSection />}
                                    />
                                    <Route
                                      path="bestseller-cards"
                                      element={<AdminBestsellerCards />}
                                    />
                                    <Route
                                      path="promo-strip"
                                      element={<AdminPromoStrip />}
                                    />
                                    <Route
                                      path="lowest-prices"
                                      element={<AdminLowestPrices />}
                                    />
                                    <Route
                                      path="banners"
                                      element={<AdminBanners />}
                                    />
                                    <Route
                                      path="orders/all"
                                      element={<AdminAllOrders />}
                                    />
                                    <Route
                                      path="orders/pending"
                                      element={<AdminPendingOrders />}
                                    />
                                    <Route
                                      path="orders/received"
                                      element={<AdminReceivedOrders />}
                                    />
                                    <Route
                                      path="orders/processed"
                                      element={<AdminProcessedOrders />}
                                    />
                                    <Route
                                      path="orders/shipped"
                                      element={<AdminShippedOrders />}
                                    />
                                    <Route
                                      path="orders/out-for-delivery"
                                      element={<AdminOutForDeliveryOrders />}
                                    />
                                    <Route
                                      path="orders/delivered"
                                      element={<AdminDeliveredOrders />}
                                    />
                                    <Route
                                      path="orders/cancelled"
                                      element={<AdminCancelledOrders />}
                                    />
                                    <Route
                                      path="orders/pending-refund"
                                      element={<AdminPendingRefundOrders />}
                                    />
                                    <Route
                                      path="orders/:id"
                                      element={<AdminOrderDetail />}
                                    />
                                  </Routes>
                                </AdminLayout>
                              </Suspense>
                            </ProtectedRoute>
                          }
                        />

                        {/* Main App Routes */}
                        <Route
                          path="/*"
                          element={
                            <AppLayout>
                              <Suspense fallback={<IconLoader forceShow />}>
                                <Routes>
                                  <Route path="/" element={<Home />} />
                                  <Route path="/stores" element={<Stores />} />
                                  <Route path="/policy" element={<PolicyPage />} />
                                  <Route path="/privacy-policy" element={<CustomerPrivacyPolicy />} />
                                  <Route
                                    path="/user/home"
                                    element={<Home />}
                                  />
                                  <Route
                                    path="/search"
                                    element={<Search />}
                                  />
                                  <Route
                                    path="/orders"
                                    element={
                                      <ProtectedRoute requiredUserType="Customer">
                                        <Orders />
                                      </ProtectedRoute>
                                    }
                                  />
                                  <Route
                                    path="/orders/:id"
                                    element={
                                      <ProtectedRoute requiredUserType="Customer">
                                        <OrderDetail />
                                      </ProtectedRoute>
                                    }
                                  />
                                  <Route
                                    path="/order-again"
                                    element={
                                      <ProtectedRoute requiredUserType="Customer">
                                        <OrderAgain />
                                      </ProtectedRoute>
                                    }
                                  />
                                  <Route
                                    path="/account"
                                    element={
                                      <ProtectedRoute requiredUserType="Customer">
                                        <Account />
                                      </ProtectedRoute>
                                    }
                                  />
                                  <Route
                                    path="/about-us"
                                    element={<AboutUs />}
                                  />
                                  <Route
                                    path="/support"
                                    element={<Support />}
                                  />
                                  <Route path="/faq" element={<FAQ />} />
                                  <Route
                                    path="/wishlist"
                                    element={
                                      <ProtectedRoute requiredUserType="Customer">
                                        <Wishlist />
                                      </ProtectedRoute>
                                    }
                                  />
                                  <Route
                                    path="/categories"
                                    element={<Categories />}
                                  />
                                  <Route
                                    path="/category/:id"
                                    element={<Category />}
                                  />
                                  <Route
                                    path="/address-book"
                                    element={
                                      <ProtectedRoute requiredUserType="Customer">
                                        <AddressBook />
                                      </ProtectedRoute>
                                    }
                                  />
                                  <Route
                                    path="/checkout"
                                    element={
                                      <ProtectedRoute requiredUserType="Customer">
                                        <Checkout />
                                      </ProtectedRoute>
                                    }
                                  />
                                  <Route
                                    path="/checkout/address"
                                    element={
                                      <ProtectedRoute requiredUserType="Customer">
                                        <CheckoutAddress />
                                      </ProtectedRoute>
                                    }
                                  />
                                  <Route
                                    path="/product/:id"
                                    element={<ProductDetail />}
                                  />
                                  <Route
                                    path="/orders/:id/invoice"
                                    element={
                                      <ProtectedRoute requiredUserType="Customer">
                                        <Invoice />
                                      </ProtectedRoute>
                                    }
                                  />
                                  <Route path="/cart" element={<Cart />} />
                                  <Route
                                    path="/addresses"
                                    element={
                                      <ProtectedRoute requiredUserType="Customer">
                                        <Addresses />
                                      </ProtectedRoute>
                                    }
                                  />
                                  <Route
                                    path="/stores"
                                    element={<Stores />}
                                  />
                                  <Route
                                    path="/store/:sellerId"
                                    element={<SellerStore />}
                                  />
                                </Routes>
                              </Suspense>
                            </AppLayout>
                          }
                        />
                      </Routes>
                    </BrowserRouter>
                  </OrdersProvider>
                </CartProvider>
              </ToastProvider>
            </LocationProvider>
          </ThemeProvider>
        </AxiosLoadingInterceptor>
      </LoadingProvider>
    </ErrorBoundary >
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
