import { Navigate, Outlet } from "react-router-dom";
import { useApp } from "../Context/MainContext";

const PublicRoute = () => {
  const { isAuth, user, loading } = useApp();

  
  if (isAuth) {
    if (!user?.role) {
      return <Navigate to="/select-role" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />
};

export default PublicRoute;