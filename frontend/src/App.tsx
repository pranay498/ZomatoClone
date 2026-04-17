import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "react-hot-toast";
import LoginPage from "./pages/LoginPage";
import Home from "./components/Home/Home";
import PublicRoute from "./components/PublicRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import SelectedRole from "./components/SelectedRole";
import Navbar from "./components/Navbar";
import RestaurantPage from "./components/Restaurnant/Restaurantpage";
import RestaurantDetail from "./components/Home/RestaurantDetails";
import AddressPaymentPage from "./pages/AddressPaymentPage";
import CheckoutPage from "./pages/CheckoutPage";
import Orders from "./pages/Orders";
import RiderDashboard from "./pages/Rider/RiderDashboard";
import AccountPage from "./pages/AccountPage";
import AdminDashboard from "./components/AdminDashboard";
import RegisterPage from "./pages/RegisterPage";

export default function App() {


  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID as string}>
      <Toaster position="top-right" reverseOrder={false} />
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/select-role" element={<SelectedRole />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/restaurant" element={<RestaurantPage />} />
            <Route path="/restaurant/:id" element={<RestaurantDetail />} />
            <Route path="/address-payment" element={< AddressPaymentPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/rider/dashboard" element={<RiderDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}