
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Check if Supabase environment variables are available
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables not found. Please check your .env file.');
}

createRoot(document.getElementById("root")!).render(<App />);
