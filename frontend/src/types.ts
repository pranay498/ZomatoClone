import React from "react";

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  profilePicture?: string;
  role: "customer" | "rider" | "seller" | "admin";
}

export interface LocationData{
    latitude: number;
    longitude: number;
    formattedAddress: string;
}

export interface AppContextType {
  user: User | null;
  token: string | null;
  isAuth: boolean;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
  setIsAuth: React.Dispatch<React.SetStateAction<boolean>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  location: LocationData | null;
  setLocation: React.Dispatch<React.SetStateAction<LocationData | null>>;
  city: City | null;
  setCity: React.Dispatch<React.SetStateAction<City | null>>;
  loadingLocation: boolean;
  setLoadingLocation: React.Dispatch<React.SetStateAction<boolean>>;
  restaurantId: string | null;
  setRestaurantId: React.Dispatch<React.SetStateAction<string | null>>;
  restaurantToken: string | null;
  setRestaurantToken: React.Dispatch<React.SetStateAction<string | null>>;
} 

export interface City {
  name: string;
  state: string;
  country: string;
}

export interface IRestaurant{
   _id: string;
    name: string;
    description: string;
    ownerId: string;
    phone: string | number;
    isVerified: boolean;
    imageUrl?: string;
    autoLocation: {
        type: string;
        coordinates: [number, number];
        formattedAddress: string;
    };
    isOpen: boolean;
    createdAt: Date;
}

export interface IMenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
  restaurantId: string;
}

export interface INearbyRestaurant extends IRestaurant { 
  distanceKm?: number; // Optional distance in km (enriched client-side if not provided by backend)   
  distance?: number;   // Optional distance in meters (if backend provides it)  
}

export interface IMenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
  restaurantId: string;
}

export interface ICartItem {
  _id: string;
  name: string;
  price: number;
  imageUrl?: string;
  quantity: number;
  restaurantId: string;
}
