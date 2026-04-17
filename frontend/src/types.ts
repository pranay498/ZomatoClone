export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  profilePicture?: string;
  role: "customer" | "rider" | "seller" | "admin";
}

export interface LocationData {
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

export interface IRestaurant {
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

export interface IOrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface IOrder {
  _id?: string;
  userId: string;
  restaurantId: string;
  restaurantName?: string;
  riderName?: string;
  riderPhone?: string;
  deliveryAddress?: {
    formattedAddress: string;
    mobile: number;
    latitude: number;
    longitude: number;
  };
  items: IOrderItem[];
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentId?: string;
  totalAmount: number;
  createdAt: string;
}

export interface RiderProfile {
  _id: string;
  userId: string;
  name: string;
  picture: string;
  phoneNumber: string;
  addharNumber: string;
  drivingLicenseNumber: string;
  isVerified: boolean;
  isAvailable: boolean;
  location: { type: "Point"; coordinates: [number, number] };
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  addressId: string;
  paymentMethod: "cod" | "upi" | "card";
  totalAmount: number;
  userPhone?: string;
  restaurantId: string;
}

export interface CreateOrderResponse {
  success: boolean;
  orderId?: string;  // MongoDB _id — use for all subsequent calls
  status?: string;  // "pending"
  message?: string;
}

export interface RazorpayOrderResponse {
  success: boolean;
  razorpayOrderId?: string;
  amount?: number;
  currency?: string;
  message?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
}

export interface ConfirmCODResponse {
  success: boolean;
  message?: string;
}


export interface CartSidebarProps {
  items: ICartItem[];
  total: number;
  onAdd: (item: Omit<ICartItem, "quantity">) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: () => void;
  open: boolean;
  onClose: () => void;
}