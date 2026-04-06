import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AppProvider } from "./Context/MainContext.tsx"
import "leaflet/dist/leaflet.css";
import { SocketProvider } from './Context/SocketContext.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppProvider>
            <SocketProvider>
                <App />
            </SocketProvider>
        </AppProvider>
    </StrictMode>
);
