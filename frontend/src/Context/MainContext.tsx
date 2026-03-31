import { createContext, useContext, useState, ReactNode, useEffect, useRef, use } from "react";
import apiClient from "../services/apiClient"
import { AppContextType, LocationData, City } from "../types";
import { User } from "../types";


const AppContext = createContext<AppContextType | undefined>(undefined);


type AppProviderProps = {
  children: ReactNode;
};

export const AppProvider = ({ children }: AppProviderProps) => {


  const hasFetched = useRef(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(localStorage.getItem("accessToken"));

  const [location, setLocation] = useState<LocationData | null>(null);
  const [city, setCity] = useState<City | null>(null);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(false);

  const [restaurantId, setRestaurantId] = useState<string | null>(localStorage.getItem("restaurantId"));
  const [restaurantToken, setRestaurantToken] = useState<string | null>(localStorage.getItem("restaurantToken"));

  async function fetchUser() {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      setIsAuth(false);
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.get("/auth/profile");

      console.log("Profile response:", res.data);

      if (res.data.success) {
        setUser(res.data.data.user);
        setIsAuth(true);
      } else {
        setIsAuth(false);
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      setIsAuth(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    if (!token || hasFetched.current) return;

    hasFetched.current = true;
    fetchUser();
  }, [token]);

  useEffect(() => {
    if (!window.isSecureContext) {
      console.error("❌ Geolocation requires HTTPS or localhost");
      alert("Location only works on HTTPS. You're on: " + window.location.href);
      return;
    }
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en-US,en;q=0.9" } }
          );

          if (!res.ok) throw new Error("Network response was not ok");
          const data = await res.json();

          console.log("Location response:", data);

          // 🔥 formatted address
          const formattedAddress = data.display_name;

          // 🔥 city extract
          const cityName =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            "";


          setLocation({
            latitude,
            longitude,
            formattedAddress,
          });


          setCity({
            name: cityName,
            state: data.address?.state,
            country: data.address?.country,
          });

        } catch (error) {
          console.error("Error fetching location details:", error);
          // Fallback setting coordinates even if address fetch fails
          setLocation({
            latitude,
            longitude,
            formattedAddress: "Unknown Location",
          });
        } finally {
          setLoadingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation Error:", error.message);

        let errorMessage = "Unable to retrieve your location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "Location access was denied.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "Location information is unavailable (check OS settings).";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "Location request timed out.";
        }

        console.warn(errorMessage);
        // Removed the intrusive alert() here to prevent looping/annoying popups
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        isAuth,
        loading,
        setUser,
        setToken,
        setIsAuth,
        setLoading,
        location,
        setLocation,
        city,
        setCity,
        loadingLocation,
        setLoadingLocation,
        restaurantId,
        setRestaurantId,
        restaurantToken,
        setRestaurantToken
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return context;
};