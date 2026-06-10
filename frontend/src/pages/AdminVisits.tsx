import React, { useEffect, useState } from 'react';
import { Loader2, Fingerprint, Calendar, Clock, MapPin, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout';
import api from '../utils/api';

const AdminVisits: React.FC = () => {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const project = JSON.parse(localStorage.getItem('project') || '{}');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/visits?projectId=${project.id}`);
      setVisits(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportCSV = () => {
    if (visits.length === 0) return;

    const headers = [
      'Fecha',
      'Hora Entrada',
      'Hora Salida',
      'Operador',
      'Punto de Venta',
      'Total Canjes',
      'Premios/Productos Entregados',
      'Estado',
      'Foto Fachada'
    ];

    const rows = visits.map(v => {
      const date = new Date(v.startTime).toLocaleDateString();
      const inTime = new Date(v.startTime).toLocaleTimeString();
      const outTime = v.endTime ? new Date(v.endTime).toLocaleTimeString() : 'Activo';
      
      const count = v.redemptions?.length || 0;
      const productsMap = new Map<string, number>();
      v.redemptions?.forEach((r: any) => {
        productsMap.set(r.reward, (productsMap.get(r.reward) || 0) + 1);
      });
      const productsStr = Array.from(productsMap.entries()).map(([k, val]) => `${k} (x${val})`).join(', ');

      return [
        date,
        inTime,
        outTime,
        v.user?.fullName || 'Desconocido',
        v.point?.name || v.market?.name || 'General',
        count,
        productsStr || 'Ninguno',
        v.isActive ? 'Activo' : 'Cerrado',
        v.facadePhoto || 'SinFoto'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(["\uFEFF", csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `asistencias_${project.name}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Asistencias y Turnos</h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight">Monitorea los check-ins de los operarios en campo.</p>
          </div>
          <button 
            onClick={handleExportCSV}
            disabled={visits.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <FileText size={16} />
            Descargar Excel
          </button>
        </header>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Fecha / Entrada</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Salida</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Personal</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Punto Venta</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Productividad</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Estado</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Evidencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visits.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center gap-2">
                           <Calendar size={14} className="text-slate-400" />
                           <div>
                             <span className="text-sm font-black text-slate-800 block">{new Date(item.startTime).toLocaleDateString()}</span>
                             <span className="text-[10px] text-emerald-600 block tracking-widest font-black uppercase">{new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}</span>
                           </div>
                         </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center gap-2">
                           <Clock size={14} className="text-slate-400" />
                           {item.endTime ? (
                              <span className="text-xs font-black text-slate-500 uppercase tracking-widest mt-1 block">
                                {new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}
                              </span>
                           ) : (
                              <span className="text-xs font-black text-slate-300 uppercase tracking-widest mt-1 block italic">—</span>
                           )}
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-[10px]">
                            <Fingerprint size={14} />
                          </div>
                          <span className="text-sm font-black text-slate-700 tracking-tighter uppercase">{item.user?.fullName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-blue-500" />
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{item.point?.name || item.market?.name || 'General'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex flex-col gap-1">
                           <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg w-max uppercase tracking-widest border border-blue-100">
                             {item.redemptions?.length || 0} Canjes
                           </span>
                           {item.redemptions?.length > 0 && (
                             <p className="text-[9px] font-bold text-slate-400 w-32 truncate" title={
                               Array.from(item.redemptions.reduce((acc: any, curr: any) => { acc.set(curr.reward, (acc.get(curr.reward)||0)+1); return acc; }, new Map()).entries()).map(([k, v]: [any, any]) => `${k} (x${v})`).join(', ')
                             }>
                               {Array.from(item.redemptions.reduce((acc: any, curr: any) => { acc.set(curr.reward, 1); return acc; }, new Map()).keys()).join(', ')}
                             </p>
                           )}
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-[9px] font-black tracking-widest uppercase border border-emerald-100">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            Turno Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-[9px] font-black tracking-widest uppercase">
                            <CheckCircle2 size={12} />
                            Finalizado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {item.facadePhoto ? (
                          <a href={item.facadePhoto} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 hover:border-blue-500 hover:text-blue-600 rounded-2xl transition-all text-[10px] font-black uppercase text-slate-500">
                            Ver Fachada <ExternalLink size={14} />
                          </a>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300 uppercase italic">Sin Foto</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {visits.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-300 gap-3">
                          <Fingerprint size={48} className="opacity-20" />
                          <span className="text-xs font-black uppercase italic tracking-widest">Aún no hay marcaciones registradas</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminVisits;
