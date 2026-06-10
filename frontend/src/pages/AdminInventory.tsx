import React, { useEffect, useState } from 'react';
import { Package, AlertTriangle, Search, Loader2, MapPin, Store, RefreshCw, Plus, Trash2, Clock, History, Calendar } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import ExcelImportButton from '../components/ExcelImportButton';

const AdminInventory: React.FC = () => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Asignar Stock Modal
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isQuickAdd, setIsQuickAdd] = useState(false);
  const [form, setForm] = useState({
    assignTo: 'market', // 'market' or 'point'
    marketId: '',
    pointId: '',
    itemName: '',
    stockToAdd: 1,
    threshold: 5
  });

  // History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeItemName, setActiveItemName] = useState<string>('');

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const project = JSON.parse(localStorage.getItem('project') || '{}');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, marketRes, pointRes] = await Promise.all([
        api.get(`/admin/inventory?projectId=${project.id}`),
        api.get(`/admin/markets?projectId=${project.id}`),
        api.get(`/admin/points?projectId=${project.id}`)
      ]);
      setInventory(invRes.data);
      setMarkets(marketRes.data);
      setPoints(pointRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        projectId: project.id,
        itemName: form.itemName,
        stockToAdd: form.stockToAdd,
        threshold: form.threshold
      };
      if (form.assignTo === 'market') payload.marketId = form.marketId;
      if (form.assignTo === 'point') payload.pointId = form.pointId;

      await api.post('/admin/inventory/assign', payload);
      setShowModal(false);
      setForm({ assignTo: 'market', marketId: '', pointId: '', itemName: '', stockToAdd: 1, threshold: 5 });
      toast.success('Stock asignado correctamente');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Error asignando stock');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/admin/inventory/${deleteConfirm}`);
      toast.success('Registro desactivado y limpiado');
      fetchData();
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      toast.error('Error al desactivar registro');
    }
  };

  const handleViewHistory = async (id: string, itemName: string) => {
    setShowHistoryModal(true);
    setLogsLoading(true);
    setActiveItemName(itemName);
    try {
      const res = await api.get(`/admin/inventory/${id}/logs`);
      setLogs(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Error cargando historial');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleImportInventory = async (data: any[]) => {
    try {
      const toastId = toast.loading('Importando inventario...');
      const res = await api.post('/import/inventory', { projectId: project.id, data });
      toast.dismiss(toastId);
      if (res.data.success) {
        toast.success(res.data.message);
        if (res.data.errors && res.data.errors.length > 0) {
          console.warn('Errores de importación:', res.data.errors);
          toast.error(`Hubo errores en ${res.data.errors.length} filas (ver consola)`);
        }
        fetchData();
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.response?.data?.message || 'Error en la importación masiva');
    }
  };

  const templateData = [
    { Producto: 'Polo BTL', Cantidad: 50, Alerta_Minima: 5, Mercado_Destino: 'Mercado Central', PDV_Destino: 'Puesto 15' },
    { Producto: 'Gorra BTL', Cantidad: 100, Alerta_Minima: 10, Mercado_Destino: 'Mercado Mayorista', PDV_Destino: '' }
  ];

  const filtered = inventory.filter(i => {
    const locName = i.market?.name || i.point?.name || i.user?.fullName || 'Sin Ubicación';
    return locName.toLowerCase().includes(search.toLowerCase()) || i.itemName.toLowerCase().includes(search.toLowerCase());
  });

  const lowStockCount = inventory.filter(i => i.stock <= i.threshold).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Gestión de Stock</h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight">Control en tiempo real de premios y materiales en campo.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input
                type="text"
                placeholder="Buscar producto o ubicación..."
                className="pl-11 pr-6 py-3 bg-white border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-brand-purple/10 focus:border-brand-purple/40 outline-none w-64 shadow-sm font-bold placeholder:text-slate-300 transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {user.role === 'ADMIN' && (
              <div className="flex gap-2">
                <ExcelImportButton 
                  onDataParsed={handleImportInventory}
                  expectedHeaders={['Producto', 'Cantidad']}
                  templateName="Plantilla_Inventario"
                  templateData={templateData}
                />
                <button
                  onClick={() => {
                  setIsQuickAdd(false);
                  setForm({ assignTo: 'market', marketId: '', pointId: '', itemName: '', stockToAdd: 1, threshold: 5 });
                  setShowModal(true);
                }}
                className="px-6 py-3 bg-brand-teal text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-teal/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 border border-brand-teal"
              >
                <Plus size={16} />
                Cargar Material
              </button>
              </div>
            )}
            <button
              onClick={fetchData}
              className="p-3 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all text-slate-400 shadow-sm"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin text-brand-purple' : ''} />
            </button>
          </div>
        </header>

        {lowStockCount > 0 && (
          <div className="bg-white border-2 border-red-100 p-6 rounded-[2.5rem] flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500 shadow-xl shadow-red-500/5">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-red-50 rounded-[1.25rem] flex items-center justify-center text-red-500 border border-red-100">
                <AlertTriangle size={28} />
              </div>
              <div>
                <h4 className="text-red-900 font-black uppercase tracking-tighter italic text-lg">Alerta de Stock Crítico</h4>
                <p className="text-red-500 text-xs font-black uppercase tracking-widest">Hay {lowStockCount} items que necesitan reabastecimiento inmediato.</p>
              </div>
            </div>
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
          </div>
        )}

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-brand-purple" size={40} />
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Ubicación / Punto</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Ítem de Campaña</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Stock Actual</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Status Operativo</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Acciones de Gestión</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                      <td className="px-8 py-7 border-b border-slate-50">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border ${item.pointId ? 'bg-orange-50 text-orange-400 border-orange-100 group-hover:bg-orange-500 group-hover:text-white' : 'bg-blue-50 text-blue-400 border-blue-100 group-hover:bg-blue-500 group-hover:text-white'}`}>
                            {item.pointId ? <Store size={20} /> : <MapPin size={20} />}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 uppercase tracking-tighter text-sm italic">
                              {item.point?.name || item.market?.name || item.user?.fullName || 'Desconocido'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold tracking-tight uppercase">
                              {item.pointId ? 'Punto de Venta (PDV)' : (item.marketId ? 'Mercado General' : 'Asignación Personal')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-7 border-b border-slate-50">
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-brand-purple/40" />
                          <span className="font-black text-slate-700 uppercase italic text-sm tracking-tight">{item.itemName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-7 border-b border-slate-50">
                        <div className="flex items-end gap-1">
                          <span className={`text-2xl font-black tracking-tighter ${item.stock <= item.threshold ? 'text-red-500' : 'text-slate-900'}`}>
                            {item.stock}
                          </span>
                          <span className="text-[10px] font-black text-slate-400 uppercase mb-2">und</span>
                        </div>
                      </td>
                      <td className="px-8 py-7 border-b border-slate-50">
                        {item.stock <= item.threshold ? (
                          <span className="bg-red-50 text-red-600 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-red-100 flex items-center gap-2 w-fit">
                            <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                            Crítico
                          </span>
                        ) : (
                          <span className="bg-brand-teal/5 text-brand-teal text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-brand-teal/10 flex items-center gap-2 w-fit">
                            <div className="w-1.5 h-1.5 bg-brand-teal rounded-full" />
                            Operativo
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-7 border-b border-slate-50 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <span className="text-[10px] font-black text-slate-300 uppercase italic mr-3 tracking-widest">Alert @ {item.threshold}</span>
                          {user.role === 'ADMIN' && (
                            <button 
                              onClick={() => {
                                 setIsQuickAdd(true);
                                 setForm({
                                   assignTo: item.pointId ? 'point' : 'market',
                                   marketId: item.marketId || '',
                                   pointId: item.pointId || '',
                                   itemName: item.itemName,
                                   stockToAdd: 1,
                                   threshold: item.threshold
                                 });
                                 setShowModal(true);
                              }}
                              className="p-2.5 bg-brand-teal/5 text-brand-teal rounded-xl hover:bg-brand-teal hover:text-white transition-all shadow-sm border border-brand-teal/10"
                              title="Recarga Rápida"
                            >
                              <Plus size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleViewHistory(item.id, item.itemName)}
                            className="p-2.5 bg-brand-purple/5 text-brand-purple rounded-xl hover:bg-brand-purple hover:text-white transition-all shadow-sm border border-brand-purple/10"
                            title="Trazabilidad"
                          >
                            <Clock size={16} />
                          </button>
                          {user.role === 'ADMIN' && (
                            <button 
                              onClick={() => setDeleteConfirm(item.id)}
                              className="p-2.5 bg-slate-50 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-slate-50"
                              title="Dar de baja"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-24 text-center">
                         <div className="flex flex-col items-center gap-4 text-slate-200">
                           <Package size={50} className="opacity-10" />
                           <p className="text-xs font-black uppercase tracking-[0.2em] italic">No se encontraron registros de stock</p>
                         </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de Asignación */}
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
            <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-in fade-in zoom-in duration-200 relative z-10 border border-slate-100">
              <div className="flex items-center gap-5 mb-8">
                <div className="w-14 h-14 bg-brand-purple rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-purple/20">
                  <Package size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none italic">
                    {isQuickAdd ? 'Recarga de Stock' : 'Carga Inicial'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestión de inventario para campo</p>
                </div>
              </div>

              <form onSubmit={handleAssign} className="space-y-6">
                {!isQuickAdd && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Nivel de Asignación</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, assignTo: 'market', pointId: '' })}
                        className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all ${form.assignTo === 'market' ? 'border-brand-purple bg-brand-purple/5 text-brand-purple' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                      >
                        Mercado General
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, assignTo: 'point', marketId: '' })}
                        className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all ${form.assignTo === 'point' ? 'border-brand-purple bg-brand-purple/5 text-brand-purple' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                      >
                        Punto de Venta (PDV)
                      </button>
                    </div>
                  </div>
                )}

                {form.assignTo === 'market' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Mercado General</label>
                    <select disabled={isQuickAdd} required className="form-input disabled:bg-slate-50" value={form.marketId} onChange={e => setForm({ ...form, marketId: e.target.value })}>
                      <option value="">Seleccionar mercado...</option>
                      {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                )}

                {form.assignTo === 'point' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Punto de Venta Específico</label>
                    <select disabled={isQuickAdd} required className="form-input disabled:bg-slate-50" value={form.pointId} onChange={e => setForm({ ...form, pointId: e.target.value })}>
                      <option value="">Seleccionar PDV...</option>
                      {points.map(p => <option key={p.id} value={p.id}>{p.name} {p.market ? `(${p.market.name})` : ''}</option>)}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Ítem de Campaña</label>
                  <input disabled={isQuickAdd} required type="text" className="form-input disabled:bg-slate-50 disabled:text-slate-400" placeholder="Ej: Polo BTL Talla M" value={form.itemName} onChange={e => setForm({ ...form, itemName: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Cantidad Ingreso (+)</label>
                    <input autoFocus required type="number" min="1" className="form-input" value={form.stockToAdd} onChange={e => setForm({ ...form, stockToAdd: parseInt(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Mínimo de Alerta</label>
                    <input required type="number" min="1" className="form-input" value={form.threshold} onChange={e => setForm({ ...form, threshold: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div className="flex gap-4 pt-8">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all leading-none">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-[2] bg-brand-teal text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-teal/20 flex items-center justify-center gap-3 hover:brightness-110 active:scale-95 transition-all">
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    Confirmar Carga
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Historial */}
        {showHistoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)}></div>
            <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl animate-in fade-in zoom-in duration-300 relative z-10 border border-slate-100 max-h-[85vh] flex flex-col">
              <div className="flex items-center gap-5 mb-8 shrink-0">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-brand-purple shadow-sm border border-slate-100">
                  <History size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none italic">Trazabilidad de Cargas</h3>
                  <p className="text-[10px] text-brand-purple font-black uppercase tracking-widest mt-1.5">{activeItemName}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-4">
                {logsLoading ? (
                  <div className="py-20 flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-brand-purple" size={40} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compilando historial...</p>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="py-20 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] italic">No se registran movimientos históricos</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log: any) => (
                       <div key={log.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-brand-purple/20 transition-all duration-300 hover:shadow-xl hover:shadow-brand-purple/5">
                         <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <Calendar size={12} className="text-brand-purple/40" />
                              <p className="text-xs font-black text-slate-800 tracking-tighter">{new Date(log.createdAt).toLocaleDateString()} - {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pre-Stock: <span className="text-slate-600">{log.previousStock}</span></span>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                           <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl border border-emerald-100 font-black text-lg tracking-tighter">
                             +{log.addedStock}
                           </div>
                         </div>
                       </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-8 shrink-0">
                <button type="button" onClick={() => setShowHistoryModal(false)} className="w-full py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-600 rounded-[1.5rem] transition-all border border-slate-100">
                  Cerrar Historial
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Ocultar Registro"
        message="¿Seguro que deseas eliminar este registro de stock? (Se ocultará del sistema para mantener la integridad)."
        confirmText="Ocultar Definitivamente"
        type="danger"
      />
    </AdminLayout>
  );
};

export default AdminInventory;
