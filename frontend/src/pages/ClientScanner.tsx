import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Loader2, CheckCircle2, Ticket, Mail, Phone, Calendar, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const ClientScanner: React.FC = () => {
  const { pointId } = useParams();
  
  // States
  const [loading, setLoading] = useState(true);
  const [point, setPoint] = useState<any>(null);
  const [theme, setTheme] = useState({ brandColor: '#8B5CF6', logoUrl: '', kvUrl: '' });
  
  const [form, setForm] = useState({
    dni: '',
    amount: ''
  });
  const [extraData, setExtraData] = useState<Record<string, any>>({});
  
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [voucher, setVoucher] = useState<any>(null); // { id, code, status }
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchPoint = async () => {
      try {
        const res = await api.get(`/vouchers/point-info/${pointId}`);
        setPoint(res.data);
        setTheme({
          brandColor: res.data.project.config?.brandColor || '#8B5CF6',
          logoUrl: res.data.project.logoUrl || res.data.project.config?.logoUrl || '',
          kvUrl: res.data.project.config?.kvUrl || ''
        });
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Error cargando información.');
      } finally {
        setLoading(false);
      }
    };
    if (pointId) fetchPoint();
  }, [pointId]);

  // Polling for voucher status
  useEffect(() => {
    let interval: any;
    if (voucher && voucher.status === 'PENDING') {
      interval = setInterval(async () => {
        try {
          const res = await api.get(`/vouchers/${voucher.id}/status`);
          if (res.data.status !== 'PENDING') {
            setVoucher(prev => ({ ...prev, status: res.data.status, code: res.data.code }));
            clearInterval(interval);
            if (res.data.status === 'APPROVED') {
              toast.success('¡Tu canje fue aprobado!');
            } else if (res.data.status === 'REJECTED') {
              toast.error('Tu canje fue rechazado por el Puesto de Venta.');
            }
          }
        } catch (e) {}
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [voucher]);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen es muy pesada. Máximo 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) return toast.error('Debes subir una foto de tu boleta.');
    
    setSubmitting(true);
    try {
      const res = await api.post('/vouchers/create', {
        projectId: point.projectId,
        pointId,
        dni: form.dni,
        phone: '',
        ticketNo: '',
        amount: parseFloat(form.amount) || 0,
        extraData,
        photos: { ticket: photo }
      });
      
      setVoucher(res.data.voucher);
      toast.success('Información enviada.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al enviar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" size={32} /></div>;
  }

  if (!point) {
    return <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center"><CheckCircle2 size={32} /></div>
      <h2 className="text-xl font-black uppercase text-slate-800">QR Inválido</h2>
      <p className="text-sm text-slate-500">Este punto de venta temporal no existe o fue deshabilitado.</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans">
      {/* Header KV */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: theme.kvUrl ? '240px' : '100px', backgroundColor: theme.brandColor }}>
        {theme.kvUrl && (
          <img src={theme.kvUrl} alt="Campaign KV" className="absolute inset-0 w-full h-full object-cover opacity-90" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        
        <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
            <div>
              {theme.logoUrl && <img src={theme.logoUrl} alt="Logo" className="h-10 object-contain mb-2 bg-white rounded-md p-1 shadow-md" />}
              <h1 className="text-xl font-black text-white uppercase tracking-tight drop-shadow-md">{point.project.name}</h1>
              <p className="text-xs text-white/90 font-medium pb-1 drop-shadow-sm">📍 {point.name}</p>
            </div>
        </div>
      </div>

      <div className="px-6 relative -mt-4 z-10">
        
        {!voucher ? (
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
            <div className="text-center mb-6">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">Registrar Compra</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Gana premios al instante</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">DNI del Cliente</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white transition-colors outline-none" placeholder="00000000" minLength={8} maxLength={15} value={form.dni} onChange={e => setForm({...form, dni: e.target.value})} />
              </div>

              {(() => {
                const unit = point?.project?.config?.redemption_unit || 'amount';
                return (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      {unit === 'units' ? 'Cant. Unidades' : 'Monto (S/)'}
                    </label>
                    <input 
                      required 
                      type="number" 
                      step={unit === 'units' ? '1' : '0.01'} 
                      min="0" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white transition-colors outline-none" 
                      placeholder={unit === 'units' ? '0' : '0.00'} 
                      value={form.amount} 
                      onChange={e => setForm({...form, amount: e.target.value})} 
                    />
                  </div>
                );
              })()}

              {/* Campos Dinámicos */}
              {point?.project?.config?.extra_fields?.length > 0 && (
                <div className="space-y-4 pt-2">
                  {point.project.config.extra_fields.map((field: any) => {
                    const Icon = field.type === 'email' ? Mail : field.type === 'tel' ? Phone : field.type === 'date' ? Calendar : ClipboardList;
                    return (
                      <div key={field.key || field.label} className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{field.label}</label>
                        {field.type === 'list' ? (
                          <select 
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white transition-colors outline-none appearance-none" 
                            value={extraData[field.key || field.label] || ''} 
                            onChange={(e) => setExtraData({...extraData, [field.key || field.label]: e.target.value})}
                          >
                            <option value="">Seleccione...</option>
                            {field.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <div className="relative">
                            <input 
                              type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : field.type === 'date' ? 'date' : 'text'} 
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-3.5 text-sm font-bold focus:bg-white transition-colors outline-none" 
                              placeholder="..." 
                              value={extraData[field.key || field.label] || ''} 
                              onChange={(e) => setExtraData({...extraData, [field.key || field.label]: e.target.value})} 
                            />
                            <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Foto de la Boleta</label>
                 
                 <input 
                   type="file" 
                   accept="image/*" 
                   capture="environment" 
                   className="hidden" 
                   ref={fileInputRef} 
                   onChange={handlePhotoCapture} 
                 />

                 {photo ? (
                   <div className="relative rounded-2xl overflow-hidden border border-slate-200" onClick={() => fileInputRef.current?.click()}>
                     <img src={photo} alt="Boleta Capturada" className="w-full h-40 object-cover" />
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                       <span className="text-white text-xs font-bold uppercase tracking-widest">Cambiar Foto</span>
                     </div>
                   </div>
                 ) : (
                   <button 
                     type="button" 
                     onClick={() => fileInputRef.current?.click()}
                     className="w-full h-32 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-all focus:outline-none focus:ring-4 focus:ring-brand-purple/10"
                   >
                     <Camera size={28} className="text-slate-400" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tomar Foto</span>
                   </button>
                 )}
              </div>

              <button 
                type="submit" 
                disabled={submitting || !photo}
                style={{ backgroundColor: theme.brandColor }}
                className="w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs text-white shadow-xl flex items-center justify-center gap-3 mt-4 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Generar Código QR'}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center flex flex-col items-center justify-center animate-in zoom-in duration-300">
             
             {voucher.status === 'PENDING' && (
               <>
                  <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-inner mb-6 relative" style={{ backgroundColor: theme.brandColor + '15', color: theme.brandColor }}>
                    <div className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin" style={{ borderLeftColor: theme.brandColor, borderBottomColor: theme.brandColor, borderRightColor: theme.brandColor }}></div>
                    <Ticket size={32} />
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tight italic" style={{ color: theme.brandColor }}>En Espera</h2>
                  <p className="text-sm font-medium text-slate-500 mt-2 max-w-xs leading-relaxed">
                    Muestra tu celular al encargado del puesto para que apruebe tu compra inmediata.
                  </p>
               </>
             )}

             {voucher.status === 'APPROVED' && (
               <>
                  <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-inner animate-bounce">
                    <CheckCircle2 size={48} />
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tight italic text-slate-800">CÓDIGO DE CANJE</h2>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1 mb-6">Acércate al módulo canjeador</p>
                  
                  <div className="bg-slate-50 border-2 border-dashed border-slate-300 w-full p-6 rounded-2xl mb-4">
                    <p className="text-5xl font-black uppercase tracking-[0.2em] text-slate-800" style={{ color: theme.brandColor }}>
                      {voucher.code}
                    </p>
                  </div>
                  
                  <p className="text-[10px] font-bold text-slate-400 mt-2">Muestra este código al Promotor.</p>
               </>
             )}

             {voucher.status === 'REJECTED' && (
               <>
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={40} className="rotate-45" />
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tight italic text-red-500">Rechazado</h2>
                  <p className="text-sm font-medium text-slate-500 mt-2">El vendedor no validó la compra asociada a este ticket.</p>
                  <button onClick={() => setVoucher(null)} className="mt-8 text-xs font-bold uppercase tracking-widest text-blue-500 underline">Volver a intentar</button>
               </>
             )}
          </div>
        )}
      </div>
      
      <div className="text-center mt-12 pb-6">
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Powered by BTL SaaS</p>
      </div>
    </div>
  );
};

export default ClientScanner;
