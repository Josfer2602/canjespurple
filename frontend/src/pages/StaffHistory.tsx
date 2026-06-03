import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Receipt, Gift, ArrowLeft } from 'lucide-react';
import StaffLayout from '../layouts/StaffLayout';
import api from '../utils/api';

const StaffHistory: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const project = JSON.parse(localStorage.getItem('project') || '{}');
  const isUnits = project.config?.redemption_unit === 'units';
  const formatVal = (val: number) => isUnits ? `${val.toFixed(2)} uds` : `S/ ${val.toFixed(2)}`;

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/redemptions/history?userId=${user.id}`);
      setHistory(res.data);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StaffLayout>
      <div className="px-5 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/staff')}
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Mis Canjes</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Historial Reciente</p>
          </div>
        </div>

        {/* History List */}
        <div className="space-y-4 pb-6">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-4 animate-pulse h-24" />
              ))}
            </div>
          ) : history.length > 0 ? (
            history.map((item, idx) => (
              <div key={idx} className="glass-card p-4 flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-5">
                  <Receipt size={64} />
                </div>
                
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-800 uppercase">DNI: {item.dni}</span>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                      <Clock size={12} className="text-blue-500" />
                      <span>{new Date(item.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                  </div>
                  <div className="bg-green-50 text-green-600 px-2.5 py-1 rounded-lg text-xs font-black">
                    {formatVal(Number(item.amount))}
                  </div>
                </div>

                <div className="h-px w-full bg-slate-100" />

                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-tight relative z-10">
                  <div className="flex items-center gap-1.5 w-1/2">
                    <MapPin size={12} className="text-red-500 min-w-[12px]" />
                    <span className="truncate" title={item.visit?.point?.name || 'Punto'}>
                      {item.visit?.point?.name || 'Varios'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 w-1/2 justify-end text-blue-600">
                    <span className="truncate">{item.reward}</span>
                    <Gift size={12} className="min-w-[12px]" />
                  </div>
                </div>
              </div>
            ))
          ) : (
             <div className="p-8 text-center flex flex-col items-center gap-3">
               <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                 <Receipt size={32} />
               </div>
               <p className="text-slate-400 text-xs font-medium italic">No se encontraron canjes recientes.</p>
             </div>
          )}
        </div>
      </div>
    </StaffLayout>
  );
};

export default StaffHistory;
