import {
  createContext,
  useEffect,
  useRef,
  ReactNode,
  useContext,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useApp } from "./MainContext";

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  
  let appContext: any = null;
  try {
    appContext = useApp(); // 👈 from MainContext
  } catch (error) {
    console.warn("⚠️ AppProvider not found, SocketProvider must be inside AppProvider");
  }

  const { token, isAuth } = appContext || { token: null, isAuth: false };
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuth || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // ⚠️ already connected hai → dobara mat banao
    if (socketRef.current?.connected) return;

    // 🟢 socket connect करो - RealTime service से directly
    const newSocket = io("http://localhost:8004", { // 👈 Direct connection to RealTime service
      auth: {
        token, // JWT token
      },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ [Frontend] Socket connected:", newSocket.id);
      console.log("✅ [Frontend] Token sent:", token?.substring(0, 20) + "...");
    });

    newSocket.on("disconnect", () => {
      console.log("❌ [Frontend] Socket disconnected");
    });

    newSocket.on("connect_error", (err) => {
      console.error("❌ [Frontend] Socket error:", err.message);
      console.error("❌ [Frontend] Full error:", err);
    });

    // cleanup on unmount
    return () => {
      if (newSocket.connected) {
        newSocket.disconnect();
      }
    };
  }, [token, isAuth]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};