import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AppProvider } from "./Context/MainContext.tsx"
import "leaflet/dist/leaflet.css";

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppProvider>
            <App />
        </AppProvider>
    </StrictMode>
);
