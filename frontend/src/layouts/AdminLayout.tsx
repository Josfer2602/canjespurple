import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { 
  LayoutDashboard, 
  Users, 
  MapIcon, 
  Settings, 
  LogOut,
  Search,
  Layers,
  Gift,
  FileText,
  Receipt,
  Ticket
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const project = JSON.parse(localStorage.getItem('project') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="p-8 flex-1 overflow-y-auto">
          <div className="flex items-center gap-4 px-3 mb-12 group">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-500 border border-slate-100">
            <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-slate-800 tracking-tighter italic leading-none">Purple BTL</h1>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Admin Panel</span>
          </div>
        </div>

          <nav className="space-y-1">
            {/* OPERACIÓN */}
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2 mt-2">Operación</div>
            <AdminNavItem to="/admin" icon={<LayoutDashboard size={18} />} label="Dashboard" end />
            <AdminNavItem to="/admin/canjes" icon={<Receipt size={18} />} label="Canjes Registrados" />
            <AdminNavItem to="/admin/asistencias" icon={<Layers size={18} />} label="Asistencias" />
            
            {['ADMIN', 'SUPERVISOR'].includes(user.role) && (
              <AdminNavItem to="/admin/inventario" icon={<Gift size={18} />} label="Saldos Stock" />
            )}

            {user.role === 'ADMIN' && (
              <>
                <AdminNavItem to="/admin/puntos" icon={<MapIcon size={18} />} label="Puntos Canje" />
                <AdminNavItem to="/admin/personal" icon={<Users size={18} />} label="Personal Campo" />
                <AdminNavItem to="/admin/tickets" icon={<Ticket size={18} />} label="Generador Tickets" />
              </>
            )}

            {/* CONFIGURACIÓN Y ADMINISTRACIÓN */}
            {user.role === 'ADMIN' && (
              <>
                {/* Separador Visual */}
                <div className="mx-4 mt-6 mb-4 border-t border-slate-100"></div>
                
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2">Config. Sistema</div>
                <AdminNavItem to="/admin/config" icon={<Settings size={18} />} label="Ajustes Generales" />
                
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mt-5 mb-2">Reglas de Negocio</div>
                <AdminNavItem to="/admin/reglas" icon={<FileText size={18} />} label="Lineamientos" />

                {/* Separador Visual */}
                <div className="mx-4 mt-6 mb-4 border-t border-slate-100"></div>

                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2">Administración</div>
                <AdminNavItem to="/admin/proyectos" icon={<Layers size={18} />} label="Master Proyectos" />
              </>
            )}
          </nav>
        </div>

        <div className="p-8 border-t border-slate-50">
          <div className="bg-brand-purple/5 p-4 rounded-3xl mb-4 border border-brand-purple/10">
            <p className="text-[9px] font-black text-brand-purple/40 uppercase tracking-widest mb-1">Proyecto Activo</p>
            <p className="text-xs font-black text-brand-purple uppercase tracking-tighter italic truncate">{project.name || 'Sin Proyecto'}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all duration-200 font-bold text-xs uppercase"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50/50">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-50">
        <div className="flex items-center gap-1.5 bg-brand-teal/5 px-2 py-1 rounded-full border border-brand-teal/10">
          <div className="w-1.5 h-1.5 bg-brand-teal rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-brand-teal uppercase tracking-tighter">Online</span>
        </div>
          <div className="flex items-center gap-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Bienvenido, <span className="text-slate-900">{user.fullName}</span>
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center relative">
              <Search className="absolute left-4 text-slate-300" size={16} />
              <input type="text" placeholder="Buscar en el panel..." className="bg-slate-50 border border-slate-100 rounded-2xl py-2.5 pl-12 pr-6 text-xs font-bold focus:ring-4 focus:ring-brand-purple/10 focus:border-brand-purple/40 outline-none w-64 transition-all placeholder:text-slate-300" />
            </div>
            {/* Notification bell removed as requested */}
            <div className="w-px h-8 bg-slate-100"></div>
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xs uppercase shadow-xl shadow-slate-900/20">
              {user.fullName?.charAt(0)}
            </div>
          </div>
        </header>

        <div className="p-10">
          {children}
        </div>
      </main>
    </div>
  );
};

const AdminNavItem: React.FC<{ to: string, icon: any, label: string, end?: boolean }> = ({ to, icon, label, end }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-300 text-xs font-black uppercase tracking-widest ${
        isActive 
          ? 'bg-brand-purple text-white shadow-xl shadow-brand-purple/20 scale-[1.02]' 
          : 'text-slate-400 hover:text-brand-purple hover:bg-brand-purple/5'
      }`
    }
  >
    {icon}
    {label}
  </NavLink>
);

export default AdminLayout;
