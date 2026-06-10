import React, { useEffect, useState, useRef } from 'react';
import { Plus, Loader2, Trash2, Map, Navigation, QrCode, Download, Printer, X, Key, ChevronDown, ChevronRight, Store, ShoppingBag, MoveRight } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import AdminLayout from '../layouts/AdminLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import ExcelImportButton from '../components/ExcelImportButton';

const AdminPoints: React.FC = () => {
  const [markets, setMarkets] = useState<any[]>([]);
  const [unassignedPoints, setUnassignedPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(new Set());

  // Modals
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [showPointModal, setShowPointModal] = useState(false);
  const [savingMarket, setSavingMarket] = useState(false);
  const [savingPoint, setSavingPoint] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, type: 'point'|'market'} | null>(null);
  const [credentialsModal, setCredentialsModal] = useState<{show: boolean, email: string, password: string, pointName: string} | null>(null);
  const [qrModal, setQrModal] = useState<{point: any} | null>(null);
  const [reassignPoint, setReassignPoint] = useState<string | null>(null); // pointId being reassigned
  const qrRef = useRef<HTMLDivElement>(null);

  // Forms
  const [marketForm, setMarketForm] = useState({ name: '', number: '', address: '' });
  const [pointForm, setPointForm] = useState({ name: '', address: '', ownerName: '', phone: '', marketId: '' });

  const project = JSON.parse(localStorage.getItem('project') || '{}');
  const pdvMode = project.config?.pdv_mode || 'specific';
  const requiresQr = project.config?.requires_qr_validation;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mRes, pRes] = await Promise.all([
        api.get(`/admin/markets?projectId=${project.id}`),
        api.get(`/admin/points?projectId=${project.id}`)
      ]);
      setMarkets(mRes.data);
      // Puntos sin mercado asignado
      const allPoints: any[] = pRes.data;
      setUnassignedPoints(allPoints.filter((p: any) => !p.marketId));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMarket(true);
    try {
      await api.post('/admin/markets', { ...marketForm, projectId: project.id });
      setShowMarketModal(false);
      setMarketForm({ name: '', number: '', address: '' });
      toast.success('Mercado creado con éxito');
      fetchData();
    } catch (err) {
      toast.error('Error creando mercado');
    } finally {
      setSavingMarket(false);
    }
  };

  const handleCreatePoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPoint(true);
    try {
      await api.post('/admin/points', { ...pointForm, projectId: project.id });
      setShowPointModal(false);
      setPointForm({ name: '', address: '', ownerName: '', phone: '', marketId: '' });
      toast.success('PDV creado con éxito');
      fetchData();
    } catch (err) {
      toast.error('Error creando PDV');
    } finally {
      setSavingPoint(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'market') {
        await api.delete(`/admin/markets/${deleteConfirm.id}`);
        toast.success('Mercado eliminado');
      } else {
        await api.delete(`/admin/points/${deleteConfirm.id}`);
        toast.success('PDV eliminado');
      }
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const handleGenerateAccess = async (point: any) => {
    try {
      const toastId = toast.loading('Generando acceso...');
      const res = await api.post(`/admin/points/${point.id}/access`);
      toast.dismiss(toastId);
      if (res.data.success) {
        setCredentialsModal({ show: true, email: res.data.credentials.email, password: res.data.credentials.password, pointName: point.name });
        fetchData();
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.response?.data?.message || 'Error al generar acceso');
    }
  };

  const handleReassign = async (pointId: string, marketId: string) => {
    try {
      await api.patch(`/admin/points/${pointId}`, { marketId: marketId || null });
      toast.success('PDV reasignado');
      setReassignPoint(null);
      fetchData();
    } catch (err: any) {
      toast.error('Error reasignando PDV');
    }
  };

  const getQrUrl = (pointId: string) => `${window.location.origin}/qr/${pointId}`;

  const handleDownloadQr = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `QR_${qrModal?.point?.name?.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  const handleImportPoints = async (data: any[]) => {
    try {
      const toastId = toast.loading('Importando datos...');
      const res = await api.post('/import/points', { projectId: project.id, data });
      toast.dismiss(toastId);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchData();
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.response?.data?.message || 'Error en la importación masiva');
    }
  };

  const templateData = [
    { Mercado: 'Mercado Central', Direccion_Mercado: 'Jr. Puno 123', PDV: 'Puesto 15', Direccion_PDV: 'Pasillo B', Nombre_Dueno: 'Juan Perez', Telefono: '987654321' },
    { Mercado: 'Mercado Mayorista', Direccion_Mercado: '', PDV: 'Stand Principal', Direccion_PDV: '', Nombre_Dueno: '', Telefono: '' }
  ];

  const handlePrintQr = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('');
    if (!win) return;
    win.document.write(`<html><head><title>QR - ${qrModal?.point?.name}</title>
      <style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif}
      img{width:280px;height:280px} h2{margin:16px 0 4px;font-size:16px;text-transform:uppercase} p{color:#888;font-size:11px;margin:0}</style>
      </head><body><img src="${dataUrl}"/>
      <h2>${qrModal?.point?.name}</h2><p>${qrModal?.point?.address || ''}</p>
      <script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`);
    win.document.close();
  };

  const toggleMarket = (id: string) => {
    setExpandedMarkets(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── PDV Card ───────────────────────────────────────────────────
  const PdvCard = ({ p, compact = false, showReassign = false }: { p: any, compact?: boolean, showReassign?: boolean }) => (
    <div className={`bg-white border border-slate-100 rounded-2xl p-4 hover:border-brand-purple/20 transition-all ${compact ? '' : 'shadow-sm'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 shrink-0">
            <ShoppingBag size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-700 uppercase tracking-tight truncate">{p.name}</p>
            {p.ownerName && <p className="text-[10px] text-slate-400 font-bold truncate">{p.ownerName} {p.phone && `· ${p.phone}`}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {pdvMode === 'specific' && requiresQr && (
            <button onClick={() => setQrModal({ point: p })} className="p-1.5 text-brand-purple hover:bg-brand-purple/10 rounded-lg transition-all" title="Ver QR">
              <QrCode size={14} />
            </button>
          )}
          {pdvMode === 'specific' && requiresQr && (
            p.userId
              ? <span className="text-[8px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-md uppercase flex items-center gap-1"><Key size={9}/>Acceso</span>
              : <button onClick={() => handleGenerateAccess(p)} className="text-[8px] font-black text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white px-2 py-1 rounded-md uppercase transition-all">+ Acceso</button>
          )}
          {showReassign && (
            <button
              onClick={() => setReassignPoint(reassignPoint === p.id ? null : p.id)}
              className="p-1.5 text-amber-400 hover:bg-amber-50 rounded-lg transition-all"
              title="Asignar a mercado"
            >
              <MoveRight size={14} />
            </button>
          )}
          <button onClick={() => setDeleteConfirm({ id: p.id, type: 'point' })} className="p-1.5 text-slate-200 hover:text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {/* Selector de reasignación */}
      {showReassign && reassignPoint === p.id && (
        <div className="mt-3 pt-3 border-t border-slate-50 flex gap-2">
          <select
            className="flex-1 text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 appearance-none"
            defaultValue=""
            onChange={(e) => e.target.value && handleReassign(p.id, e.target.value)}
          >
            <option value="">Selecciona un mercado...</option>
            {markets.map(m => (
              <option key={m.id} value={m.id}>{m.name}{m.number ? ` N°${m.number}` : ''}</option>
            ))}
          </select>
          <button onClick={() => setReassignPoint(null)} className="p-2 text-slate-300 hover:text-slate-500"><X size={14}/></button>
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">
              {pdvMode === 'general' ? 'Mercados' : 'Mercados y PDVs'}
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              {pdvMode === 'general' 
                ? 'Registra los mercados/canales del proyecto.' 
                : 'Registra mercados y sus puntos de venta individuales.'}
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <ExcelImportButton 
              onDataParsed={handleImportPoints}
              expectedHeaders={['Mercado']}
              templateName="Plantilla_Mercados_PDV"
              templateData={templateData}
            />
            {pdvMode === 'specific' && (
              <button onClick={() => setShowPointModal(true)} className="px-5 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2">
                <Plus size={14} /> PDV
              </button>
            )}
            <button onClick={() => setShowMarketModal(true)} className="px-6 py-3 bg-brand-teal text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-teal/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
              <Plus size={16} /> {pdvMode === 'general' ? 'Mercado' : 'Mercado'}
            </button>
          </div>
        </header>

        {loading ? (
          <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-brand-purple" size={32} /></div>
        ) : (
          <div className="space-y-4">
            {markets.length === 0 && (
              <div className="h-48 border-2 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center text-slate-300 gap-3 font-black uppercase italic text-xs tracking-widest bg-slate-50/30">
                <Store size={32} className="opacity-10" />
                No hay mercados registrados aún
              </div>
            )}
            {markets.map(m => (
              <div key={m.id} className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                {/* Cabecera del mercado */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => pdvMode === 'specific' && toggleMarket(m.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-purple/10 rounded-2xl flex items-center justify-center text-brand-purple">
                      <Store size={22} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-800 uppercase tracking-tight italic">{m.name}</h4>
                      <div className="flex items-center gap-3 mt-0.5">
                        {m.number && <span className="text-[10px] font-black text-brand-purple bg-brand-purple/5 px-2 py-0.5 rounded-md">N° {m.number}</span>}
                        {m.address && <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><Map size={10}/>{m.address}</span>}
                        {pdvMode === 'specific' && <span className="text-[10px] text-slate-400 font-bold">{m.points?.length || 0} PDVs</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: m.id, type: 'market' }); }} className="p-2 text-slate-200 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                    {pdvMode === 'specific' && (
                      expandedMarkets.has(m.id) ? <ChevronDown size={18} className="text-slate-300" /> : <ChevronRight size={18} className="text-slate-300" />
                    )}
                  </div>
                </div>

                {/* PDVs del mercado (solo en modo specific) */}
                {pdvMode === 'specific' && expandedMarkets.has(m.id) && (
                  <div className="border-t border-slate-50 p-4 space-y-2 bg-slate-50/50">
                    {m.points?.length === 0 && (
                      <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest text-center py-4">Sin PDVs asignados aún</p>
                    )}
                    {m.points?.map((p: any) => <PdvCard key={p.id} p={p} compact />)}
                    <button
                      onClick={() => { setPointForm(f => ({...f, marketId: m.id})); setShowPointModal(true); }}
                      className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black text-slate-300 uppercase tracking-widest hover:border-brand-purple/30 hover:text-brand-purple transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={12} /> Agregar PDV a este mercado
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* PDVs sin mercado asignado (solo modo specific) */}
            {pdvMode === 'specific' && unassignedPoints.length > 0 && (
              <div className="bg-white border border-dashed border-slate-200 rounded-[2rem] p-5 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PDVs sin mercado asignado</p>
                {unassignedPoints.map(p => <PdvCard key={p.id} p={p} showReassign />)}
              </div>
            )}
          </div>
        )}

        {/* ── Modal Mercado ─────────────────────────────────────── */}
        {showMarketModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowMarketModal(false)} />
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in fade-in zoom-in duration-200 relative z-10 border border-slate-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-brand-purple rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-purple/20">
                  <Store size={22} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none italic">Nuevo Mercado</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {pdvMode === 'general' ? 'Canal / punto de referencia' : 'Agrupador de PDVs'}
                  </p>
                </div>
              </div>
              <form onSubmit={handleCreateMarket} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Nombre del Mercado</label>
                    <input required type="text" className="form-input" placeholder="Ej: Mercado Mayorista" value={marketForm.name} onChange={e => setMarketForm({...marketForm, name: e.target.value})} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Dirección</label>
                    <input type="text" className="form-input" placeholder="Jr. Lima 123" value={marketForm.address} onChange={e => setMarketForm({...marketForm, address: e.target.value})} />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowMarketModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all leading-none">Cancelar</button>
                  <button type="submit" disabled={savingMarket} className="flex-[2] bg-brand-teal text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-teal/20 flex items-center justify-center gap-3 py-4 hover:brightness-110 active:scale-95 transition-all">
                    {savingMarket ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    Crear Mercado
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal PDV ─────────────────────────────────────────── */}
        {showPointModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowPointModal(false)} />
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in fade-in zoom-in duration-200 relative z-10 border border-slate-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-brand-teal rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-teal/20">
                  <Navigation size={22} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none italic">Nuevo PDV</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Punto de venta individual</p>
                </div>
              </div>
              <form onSubmit={handleCreatePoint} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Mercado / Canal</label>
                  <select className="form-input font-bold text-sm appearance-none bg-slate-50" value={pointForm.marketId} onChange={e => setPointForm({...pointForm, marketId: e.target.value})}>
                    <option value="">Sin asignar</option>
                    {markets.map(m => <option key={m.id} value={m.id}>{m.name}{m.number ? ` N°${m.number}` : ''}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Nombre del Puesto</label>
                  <input required type="text" className="form-input" placeholder="Ej: Puesto 23" value={pointForm.name} onChange={e => setPointForm({...pointForm, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Dirección / Referencia</label>
                  <input type="text" className="form-input" placeholder="Pasillo A, Stand 3" value={pointForm.address} onChange={e => setPointForm({...pointForm, address: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Nombre del Dueño</label>
                    <input type="text" className="form-input" placeholder="Juan Pérez" value={pointForm.ownerName} onChange={e => setPointForm({...pointForm, ownerName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Celular</label>
                    <input type="text" className="form-input" placeholder="987654321" value={pointForm.phone} onChange={e => setPointForm({...pointForm, phone: e.target.value})} />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowPointModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all leading-none">Cancelar</button>
                  <button type="submit" disabled={savingPoint} className="flex-[2] bg-brand-teal text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-teal/20 flex items-center justify-center gap-3 py-4 hover:brightness-110 active:scale-95 transition-all">
                    {savingPoint ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    Crear PDV
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal Credenciales ────────────────────────────────── */}
        {credentialsModal?.show && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <div className="bg-white max-w-sm w-full p-8 rounded-[2rem] shadow-2xl relative z-10 text-center space-y-6">
              <div><h3 className="text-xl font-black text-slate-800 uppercase tracking-tight italic">Acceso Creado</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Para: <b>{credentialsModal.pointName}</b></p></div>
              <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Email</p>
                <p className="text-sm font-black text-slate-700 select-all mb-4">{credentialsModal.email}</p>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Contraseña temporal</p>
                <p className="text-lg font-black text-brand-purple select-all">{credentialsModal.password}</p>
              </div>
              <button onClick={() => setCredentialsModal(null)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-colors">Cerrar</button>
            </div>
          </div>
        )}

        {/* ── Modal QR ─────────────────────────────────────────── */}
        {qrModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setQrModal(null)} />
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative z-10 border border-slate-100 animate-in zoom-in duration-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic leading-none">{qrModal.point.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Código QR para Scanner</p>
                </div>
                <button onClick={() => setQrModal(null)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors"><X size={20} /></button>
              </div>
              <div ref={qrRef} className="flex flex-col items-center bg-slate-50 rounded-[2rem] p-6 border border-slate-100 mb-6">
                <QRCodeCanvas value={getQrUrl(qrModal.point.id)} size={220} bgColor="#FFFFFF" fgColor="#1e1b4b" level="H" includeMargin />
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-3 text-center">Escanear para registrar compra</p>
              </div>
              <div className="bg-brand-purple/5 border border-brand-purple/10 rounded-xl px-4 py-2 mb-6">
                <p className="text-[9px] font-black text-brand-purple uppercase tracking-widest mb-0.5">URL del Scanner</p>
                <p className="text-[10px] text-slate-600 font-mono break-all">{getQrUrl(qrModal.point.id)}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleDownloadQr} className="flex-1 py-3.5 rounded-2xl bg-brand-purple text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-brand-purple/20">
                  <Download size={16} /> Descargar
                </button>
                <button onClick={handlePrintQr} className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 active:scale-95 transition-all">
                  <Printer size={16} /> Imprimir
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
        title={deleteConfirm?.type === 'market' ? 'Eliminar Mercado' : 'Eliminar PDV'}
        message={deleteConfirm?.type === 'market' ? 'Se desvincularan los PDVs de este mercado pero no se eliminarán.' : '¿Seguro que deseas eliminar este punto de venta?'}
        confirmText="Eliminar"
        type="danger"
      />
    </AdminLayout>
  );
};

export default AdminPoints;
