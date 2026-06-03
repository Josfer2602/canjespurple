import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, PlusCircle, MapPin, Power, History } from 'lucide-react';
import { cn } from '../utils/cn';
import logo from '../assets/logo.png';

interface StaffLayoutProps {
  children: React.ReactNode;
}

const StaffLayout: React.FC<StaffLayoutProps> = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('activeVisitId');
    localStorage.removeItem('activePointId');
    localStorage.removeItem('project');
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] max-w-md mx-auto relative shadow-2xl overflow-hidden">
      {/* Header Fijo */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
            <img src={logo} alt="Logo" className="w-7 h-7 object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-brand-purple uppercase tracking-[0.2em] leading-none">Purple BTL</span>
            <span className="text-xs font-black text-slate-800 uppercase tracking-tight italic">Operaciones</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-brand-teal/5 px-2.5 py-1 rounded-full border border-brand-teal/10">
            <div className="w-1.5 h-1.5 bg-brand-teal rounded-full animate-pulse shadow-[0_0_8px_rgba(0,188,212,0.5)]" />
            <span className="text-[10px] font-black text-brand-teal uppercase tracking-widest">Live</span>
          </div>
          <button 
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            <Power size={18} />
          </button>
        </div>
      </header>

      {/* Contenedor de Contenido */}
      <main className="flex-1 pb-32">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-lg border-t border-slate-100 px-8 py-4 flex items-center justify-between z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <NavLink 
          to="/staff" 
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 transition-all duration-300",
            isActive ? "text-brand-purple scale-110" : "text-slate-400 opacity-60"
          )}
        >
          {({ isActive }) => (
            <>
              <Home size={22} strokeWidth={isActive ? 3 : 2} />
              <span className="text-[9px] font-black uppercase tracking-widest">Inicio</span>
            </>
          )}
        </NavLink>

        <NavLink 
          to="/visita/iniciar" 
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 transition-all duration-300",
            isActive ? "text-brand-purple scale-110" : "text-slate-400 opacity-60"
          )}
        >
          {({ isActive }) => (
            <>
              <MapPin size={22} strokeWidth={isActive ? 3 : 2} />
              <span className="text-[9px] font-black uppercase tracking-widest">Punto</span>
            </>
          )}
        </NavLink>

        <NavLink 
          to="/canje/nuevo" 
          className={({ isActive }) => cn(
            "w-14 h-14 -mt-10 bg-brand-teal text-white rounded-2xl flex items-center justify-center shadow-xl shadow-brand-teal/40 border-4 border-white transition-transform active:scale-90",
            isActive ? "brightness-90" : "bg-brand-teal"
          )}
        >
          <PlusCircle size={28} />
        </NavLink>

        <NavLink 
          to="/canjes/historial" 
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 transition-all duration-300",
            isActive ? "text-brand-purple scale-110" : "text-slate-400 opacity-60"
          )}
        >
          {({ isActive }) => (
            <>
              <History size={22} strokeWidth={isActive ? 3 : 2} />
              <span className="text-[9px] font-black uppercase tracking-widest">Historial</span>
            </>
          )}
        </NavLink>
      </nav>
    </div>
  );
};

export default StaffLayout;
