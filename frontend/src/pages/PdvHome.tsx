import React, { useState, useEffect } from 'react';
import { Camera, Check, X, Loader2, LogOut, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const getDirectImgUrl = (url: string) => {
  if (!url) return '';
  const driveRegex = /file\/d\/([^\/]+)/;
  const ucRegex = /id=([^&]+)/;
  const id = url.match(driveRegex)?.[1] || url.match(ucRegex)?.[1];
  
  if (id) {
    return `${api.defaults.baseURL}/vouchers/photo/${id}`;
  }
  return url;
};

const PdvHome: React.FC = () => {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // voucherId
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const project = JSON.parse(localStorage.getItem('project') || '{}');
  const point = user.point;

  const themeConfig = project.config || {};
  const brandColor = themeConfig.brandColor || '#8B5CF6';

  useEffect(() => {
    if (!point?.id) {
      toast.error('Tu usuario no está asociado a un puesto de venta.');
      return;
    }
    fetchVouchers();
    
    // Polling ligero para nuevas notificaciones
    const interval = setInterval(fetchVouchers, 10000);
    return () => clearInterval(interval);
  }, [point?.id]);

  const fetchVouchers = async () => {
    try {
      const res = await api.get(`/vouchers/pdv-pending?pointId=${point.id}`);
      setVouchers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(id);
    try {
      await api.post('/vouchers/pdv-approve', { voucherId: id, status });
      toast.success(status === 'APPROVED' ? 'Venta validada exitosamente' : 'Compra denegada');
      setVouchers(vouchers.filter(v => v.id !== id));
    } catch (err) {
      toast.error('Error al cambiar el estado del ticket.');
    } finally {
      setActionLoading(null);
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (!point) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-xl font-black uppercase text-slate-800">Error de Cuenta</h2>
        <p className="text-sm text-slate-500">Tu usuario no tiene un puesto de venta asociado. Contacta al supervisor.</p>
        <button onClick={logout} className="text-brand-purple font-bold">Cerrar Sesión</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden">
      {/* Header Corporativo (Whitelabel) */}
      <div className="px-6 py-6 rounded-b-[2rem] shadow-sm flex items-center justify-between" style={{ backgroundColor: brandColor }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex flex-col items-center justify-center text-white">
            <Ticket size={24} />
          </div>
          <div>
            <h1 className="text-white text-lg font-black uppercase tracking-tight leading-tight">Canjes Pendientes</h1>
            <p className="text-white/80 text-[10px] uppercase font-bold tracking-widest">{point.name}</p>
          </div>
        </div>
        <button onClick={logout} className="p-3 text-white/90 hover:text-white bg-white/10 rounded-full hover:bg-white/20 transition-all">
          <LogOut size={18} />
        </button>
      </div>

      <div className="px-6 py-6">
        <div className="mb-6 flex justify-between items-center">
            <h2 className="text-sm border-l-4 pl-3 font-black text-slate-700 uppercase italic" style={{ borderColor: brandColor }}>Bandeja de Aprobación</h2>
            <span className="text-[10px] bg-slate-200 text-slate-600 px-3 py-1 font-bold rounded-full">{vouchers.length} por revisar</span>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
        ) : vouchers.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center space-y-3">
             <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center"><Check size={32} /></div>
             <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Nada pendiente por ahora</p>
          </div>
        ) : (
          <div className="space-y-4">
            {vouchers.map(v => (
              <div key={v.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-start border-b border-slate-50 pb-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Cliente: {v.dni}</p>
                    <p className="text-lg font-black text-slate-800 uppercase tracking-tight mt-1 truncate max-w-[200px]">Boleta: {v.ticketNo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Monto</p>
                    <p className="text-lg font-black" style={{ color: brandColor }}>S/ {Number(v.amount).toFixed(2)}</p>
                  </div>
                </div>

                {v.photos && v.photos.length > 0 && (
                  <div 
                    className="w-full h-32 bg-slate-100 rounded-xl overflow-hidden cursor-pointer relative group border border-slate-200"
                    onClick={() => setPhotoPreview(v.photos[0])}
                  >
                     <img src={getDirectImgUrl(v.photos[0])} alt="Boleta" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                     <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="text-white mb-1" size={24} />
                        <span className="text-[10px] font-bold text-white uppercase">Ver Foto</span>
                     </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => handleValidation(v.id, 'REJECTED')}
                    disabled={actionLoading === v.id}
                    className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-black uppercase text-xs tracking-widest border border-red-100 hover:bg-red-100 flex items-center justify-center gap-2"
                  >
                    {actionLoading === v.id ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} 
                    Rechazar
                  </button>
                  <button 
                    onClick={() => handleValidation(v.id, 'APPROVED')}
                    disabled={actionLoading === v.id}
                    className="flex-[2] py-3 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-md flex items-center justify-center gap-2 hover:brightness-110 active:scale-95"
                    style={{ backgroundColor: brandColor }}
                  >
                    {actionLoading === v.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 
                    Aprobar Ticket
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {photoPreview && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <button onClick={() => setPhotoPreview(null)} className="absolute top-6 right-6 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white"><X size={24} /></button>
          <img src={getDirectImgUrl(photoPreview)} className="w-full max-w-sm rounded-2xl max-h-[80vh] object-contain" alt="Boleta Preview" />
        </div>
      )}
    </div>
  );
};

export default PdvHome;
