import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Users, Power, Plus, LayoutGrid, Clock, Calendar } from 'lucide-react';
import StaffLayout from '../layouts/StaffLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

/**
 * HomePageStaff Component
 * 
 * Es la pantalla principal ("Home") para los usuarios tipo Staff en campo.
 * Muestra información clave como:
 * - El punto de visita activo actual (si ya iniciaron turno o visita)
 * - Estadísticas o datos básicos del proyecto (días restantes)
 * - El stock en tiempo real asignado a este promotor/staff
 */
const HomePageStaff: React.FC = () => {
  // Variables de Estado
  const [stock, setStock] = useState<any[]>([]); // Almacena inventario del usuario
  const [activeVisit, setActiveVisit] = useState<any>(null); // Almacena si el staff inició un "punto operativo"
  const [, setLoading] = useState(true); // Controla cargas en background
  const [showConfirmClose, setShowConfirmClose] = useState(false); // Modal para confirmar cierre de visita
  const navigate = useNavigate();
  
  // Extraemos información del usuario y del proyecto actualmente logueado desde localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const project = JSON.parse(localStorage.getItem('project') || '{}');

  // `useEffect` principal: Se ejecuta al montar el componente para obtener datos.
  useEffect(() => {
    fetchData();
  }, []);

  /**
   * fetchData
   * Función asíncrona que consulta al backend 2 cosas:
   * 1. El inventario asociado a este proyecto y a este usuario en particular.
   * 2. Si el usuario actual tiene una "visita" o turno activo en un punto en particular.
   */
  const fetchData = async () => {
    try {
      setLoading(true);
      // Pide inventario personal al backend
      const invRes = await api.get(`/admin/inventory?projectId=${project.id}&userId=${user.id}`);
      setStock(invRes.data);

      // Pide el punto o "visita" activa actualmente
      const visitRes = await api.get(`/visits/get-active?userId=${user.id}`);
      setActiveVisit(visitRes.data);
      
      // Si el backend nos responde con un punto activo, guardamos los IDs globales para otros procesos
      if (visitRes.data) {
        localStorage.setItem('activeVisitId', visitRes.data.id);
        localStorage.setItem('activePointId', visitRes.data.pointId);
      } else {
        // Si no hay visita activa, nos aseguramos de borrar rastros
        localStorage.removeItem('activeVisitId');
        localStorage.removeItem('activePointId');
      }
    } catch (err) {
      console.error("Error fetching staff data:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * handleEndVisit
   * Se ejecuta cuando el staff desea terminar su labor en el punto actual.
   * Manda una señal a la API con la hora de cierre y actualiza el dashboard.
   */
  const handleEndVisit = async () => {
    if (!activeVisit) return;
    try {
      await api.post('/visits/end', { visitId: activeVisit.id });
      toast.success('Punto cerrado con éxito.');
      fetchData(); // Refrescamos pantallas
      setShowConfirmClose(false); // Ocultamos el modal pop-up de conformación
    } catch (err) {
      console.error(err);
      toast.error('Error al cerrar punto.');
    }
  };

  /**
   * getStockColor
   * Función utilitaria que retorna clases de CSS basadas en el stock disponible.
   * - Agotado: rojo
   * - Bajo (menor al min/threshold): naranja
   * - Óptimo: verde
   */
  const getStockColor = (qty: number, min: number) => {
    if (qty === 0) return 'text-red-500 border-red-500 bg-red-50';
    if (qty < min) return 'text-orange-500 border-orange-500 bg-orange-50';
    return 'text-green-500 border-green-500 bg-green-50';
  };

  return (
    <StaffLayout>
      <div className="px-5 py-6 space-y-6">
        
        {/* SECCIÓN 1: Visita / Punto Activo */}
        <div className="space-y-3">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 italic">Punto Actual Activo</h2>
          
          {activeVisit ? (
            // Si hay una visita activa, mostramos una tarjeta con los datos de inicio y botones de canje
            <div className="glass-card p-6 border-l-4 border-brand-teal flex flex-col gap-5 shadow-xl shadow-brand-teal/5">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-black text-slate-900 uppercase leading-none tracking-tight">{activeVisit.point?.name}</span>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    <Clock size={12} className="text-brand-purple" />
                    <span>Iniciado: {new Date(activeVisit.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}</span>
                  </div>
                </div>
                {/* Botón para abrir el Modal de cerrar visita */}
                <button 
                  onClick={() => setShowConfirmClose(true)}
                  className="bg-brand-purple/5 text-brand-purple p-2.5 rounded-2xl hover:bg-brand-purple hover:text-white transition-all shadow-sm"
                  title="Cerrar Punto"
                >
                  <Power size={18} />
                </button>
              </div>
              {/* Botón CTA principal de Registrar Canje */}
              <button 
                onClick={() => navigate('/canje/nuevo')}
                className="w-full bg-brand-teal text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-teal/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 border border-brand-teal"
              >
                <Plus size={20} />
                Registrar Nuevo Canje
              </button>
            </div>
          ) : (
            // Si NO hay visita activa, pedimos al staff que abra un punto para poder empezar
            <button 
              onClick={() => navigate('/visita/iniciar')}
              className="w-full py-10 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 text-slate-400 active:scale-95 transition-all bg-white/50 hover:bg-white hover:border-brand-purple/30 group"
            >
              <LayoutGrid size={40} className="opacity-10 group-hover:opacity-30 transition-opacity text-brand-purple" />
              <span className="text-xs font-black uppercase tracking-widest px-8 text-center leading-relaxed">Abrir Punto Operativo para comenzar</span>
            </button>
          )}
        </div>

        {/* SECCIÓN 2: Grid de Estadísticas / Info Básica del Proyecto */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Card: Nombre del Proyecto y Duración */}
          <div className="glass-card p-5 group hover:-translate-y-1 transition-transform relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Proyecto Activo</span>
              <div className="w-8 h-8 rounded-full bg-brand-purple/5 flex items-center justify-center text-brand-purple">
                <Users size={16} />
              </div>
            </div>
            <span className="text-xs font-black text-slate-800 truncate block decoration-brand-teal underline underline-offset-8 decoration-2">{project.name}</span>
            {(project.config?.start_date || project.config?.end_date) && (
              <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-1.5 overflow-hidden">
                <Calendar size={10} className="text-brand-purple shrink-0" />
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter truncate">
                  {project.config.start_date || '?'} al {project.config.end_date || '?'}
                </span>
              </div>
            )}
          </div>
          
          {/* Card: Estado / Días restantes */}
          <div className="glass-card p-5 group hover:-translate-y-1 transition-transform">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</span>
              <div className="w-8 h-8 rounded-full bg-brand-teal/5 flex items-center justify-center text-brand-teal">
                {project.config?.end_date ? <Clock size={16} /> : <Package size={16} />}
              </div>
            </div>
            {project.config?.end_date ? (
              <div className="flex items-end gap-1">
                <span className="text-sm font-black text-slate-800">
                  {Math.max(0, Math.ceil((new Date(project.config.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))}
                </span>
                <span className="text-[9px] font-black text-slate-400 uppercase mb-0.5">días restantes</span>
              </div>
            ) : (
              <span className="text-xs font-black text-slate-800 truncate block">Operativo</span>
            )}
          </div>
        </div>

        {/* SECCIÓN 3: Listado de Inventario/Stock Personal del Promotor */}
        <div className="space-y-4 pb-10">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-purple" />
              Gestión de Stock
            </h2>
          </div>
          <div className="glass-card divide-y divide-slate-100 overflow-hidden">
            {stock.length > 0 ? stock.map((item, idx) => {
              const colorClass = getStockColor(item.stock, item.threshold);
              return (
                <div key={idx} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.itemName}</span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase w-fit tracking-tighter ${colorClass}`}>
                      {item.stock === 0 ? 'Agotado' : item.stock < item.threshold ? 'Stock Bajo' : 'Nivel Óptimo'}
                    </span>
                  </div>
                  <div className="flex items-end gap-1.5">
                    <span className={`text-3xl font-black tracking-tighter ${item.stock === 0 ? 'text-slate-200' : 'text-slate-900'}`}>
                      {item.stock}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase mb-2">und</span>
                  </div>
                </div>
              );
            }) : (
              <div className="p-8 text-center text-slate-400 text-xs font-medium italic">
                No tienes stock asignado aún.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALES EXTRAS: Modal de Confirmación Crítica (Cerrar punto) */}
      <ConfirmModal
        isOpen={showConfirmClose}
        onClose={() => setShowConfirmClose(false)} // Cierra sin finalizar
        onConfirm={handleEndVisit} // Aprueba y ejecuta finalizar la visita
        title="Cerrar Punto Operativo"
        message="¿Seguro que deseas cerrar el punto? No podrás registrar más canjes aquí sin iniciar una nueva marca de asistencia."
        confirmText="Sí, Cerrar Pto."
        type="danger"
      />
    </StaffLayout>
  );
};

export default HomePageStaff;
