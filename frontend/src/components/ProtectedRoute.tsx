import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useApp } from "../Context/MainContext";

const ProtectedRoute = () => {
  const { isAuth, user, loading } = useApp();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  // 🔐 Not logged in
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  // 🔥 ROLE NOT SELECTED → FORCE /select-role
  if (!user?.role && location.pathname !== "/select-role") {
    return <Navigate to="/select-role" replace />;
  }

  // 🔥 ROLE ALREADY SELECTED → BLOCK /select-role
  if (user?.role && location.pathname === "/select-role") {
    if (user.role === 'rider') return <Navigate to="/rider/dashboard" replace />;
    if (user.role === 'seller') return <Navigate to="/restaurant" replace />;
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }

  // Prevent riders from browsing customer areas
  if (user?.role === 'rider' && !location.pathname.startsWith('/rider')) {
    return <Navigate to="/rider/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;