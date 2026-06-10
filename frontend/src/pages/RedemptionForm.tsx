import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Gift, Loader2, ArrowRight, UserCheck, Smartphone, ClipboardList, Mail, Calendar, Phone, CheckCircle2, Ticket } from 'lucide-react';
import StaffLayout from '../layouts/StaffLayout';
import api from '../utils/api';
import { processImage } from '../utils/image-processor';
import toast from 'react-hot-toast';

const RedemptionForm: React.FC = () => {
  const [step, setStep] = useState(1);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [consumerDni, setConsumerDni] = useState('');
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [extraData, setExtraData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [validatingDni, setValidatingDni] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const [matchingReward, setMatchingReward] = useState<string | null>(null);
  const [projectConfig, setProjectConfig] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState('');
  
  // B2B2C Voucher Flow
  const [voucherCode, setVoucherCode] = useState('');
  const [verifiedVoucher, setVerifiedVoucher] = useState<any>(null);
  const [verifyingCode, setVerifyingCode] = useState(false);
  
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const project = JSON.parse(localStorage.getItem('project') || '{}');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // 1. Fetch Rules
      const rulesRes = await api.get(`/admin/rules?projectId=${project.id}`);
      setRules(rulesRes.data);

      // 2. Fetch Project Config (Schema)
      const projRes = await api.get(`/admin/projects/${project.id}`);
      setProjectConfig(projRes.data);

    } catch (err) {
      console.error("Error fetching initial data:", err);
    }
  };

  const availableProducts = Array.from(new Set(rules.filter(r => r.type === 'BY_PRODUCTS').map(r => r.productCriteria?.productName).filter(Boolean)));

  const photoSlots = [...(projectConfig?.config?.photo_slots || [])];
  const dynamicFields = projectConfig?.config?.extra_fields || [];
  const unit = projectConfig?.config?.redemption_unit || 'amount';
  const pdvMode = projectConfig?.config?.pdv_mode || 'specific';
  
  const triangulationMode = projectConfig?.config?.triangulation_mode || (projectConfig?.config?.requires_qr_validation ? 'b2b2c_digital' : 'physical');

  // Inject dynamic photo slots based on triangulation mode
  if (triangulationMode === 'b2b2c_mixed' && !photoSlots.find(p => p.key === 'signed_receipt')) {
    photoSlots.push({ label: 'Comprobante Firmado por PDV', key: 'signed_receipt', required: true });
  }
  if (triangulationMode === 'physical' && !photoSlots.find(p => p.key === 'physical_ticket')) {
    photoSlots.push({ label: 'Ticket Físico del PDV', key: 'physical_ticket', required: true });
  }

  useEffect(() => {
    let amount = parseFloat(purchaseAmount);
    
    if (amount > 0 && rules.length > 0) {
      const hasProductRules = rules.some(r => r.type === 'BY_PRODUCTS');
      const matchingRule = rules.find(r => 
        (r.type === 'BY_PRODUCTS' ? r.productCriteria?.productName === selectedProduct : !hasProductRules) &&
        amount >= parseFloat(r.minPurchase) && 
        amount <= parseFloat(r.maxPurchase)
      );
      if (matchingRule) {
        setMatchingReward(matchingRule.rewardName);
        setExtraData(prev => ({ ...prev, reward: matchingRule.rewardName }));
      } else {
        setMatchingReward(null);
      }
    } else {
      setMatchingReward(null);
    }
  }, [purchaseAmount, selectedProduct, rules]);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const onFileChange = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await processImage(file, { maxWidth: 800, quality: 0.6 });
        setPhotos(prev => ({ ...prev, [key]: compressed }));
      } catch (err) {
        console.error("Error procesando imagen:", err);
      }
    }
  };

  const handleExtraDataChange = (key: string, value: string) => {
    setExtraData(prev => ({ ...prev, [key]: value }));
  };

  const handleNextStep = async () => {
    if (consumerDni.length < 8) {
      toast.error('Por favor, ingresa un DNI válido.');
      return;
    }
    setValidatingDni(true);
    try {
      const res = await api.get(`/redemptions/check-dni?dni=${consumerDni}&projectId=${project.id || user.projectId}`);
      if (!res.data.allowed) {
        toast.error(res.data.message);
        setValidatingDni(false);
        return;
      }
      setStep(2);
    } catch (err: any) {
      console.error('Error validando DNI', err);
      toast.error('Error de conexión al validar DNI.');
    } finally {
      setValidatingDni(false);
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setSubmitting(true);
    try {
      const visitId = localStorage.getItem('activeVisitId');
      const pointId = localStorage.getItem('activePointId');
      
      if (!visitId) {
        toast.error('Debes iniciar una visita primero.');
        setSubmitting(false);
        navigate('/staff');
        return;
      }

      if (triangulationMode === 'b2b2c_digital' || triangulationMode === 'b2b2c_mixed') {
        if (!verifiedVoucher) {
          toast.error('Debes verificar un código de voucher válido primero.');
          setSubmitting(false);
          return;
        }
      }

      // 1. Obtener GPS exacto usando Promesa para esperar al satélite
      const coords = await new Promise<{lat: number, lng: number} | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => {
            console.warn("GPS denegado o timeout", err);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 5000 } // Esperamos 5 segundos máximo a que el GPS responda
        );
      });

      await api.post('/redemptions', {
        projectId: project.id || user.projectId,
        userId: user.id,
        pointId,
        visitId,
        ticketNumber: (triangulationMode === 'b2b2c_digital' || triangulationMode === 'b2b2c_mixed') ? verifiedVoucher.ticketNo : '',
        purchaseAmount: (triangulationMode === 'b2b2c_digital' || triangulationMode === 'b2b2c_mixed') ? parseFloat(verifiedVoucher.amount) : parseFloat(purchaseAmount),
        consumerDni: (triangulationMode === 'b2b2c_digital' || triangulationMode === 'b2b2c_mixed') ? verifiedVoucher.dni : consumerDni,
        photos, 
        extraData: { ...extraData, source: (triangulationMode === 'b2b2c_digital' || triangulationMode === 'b2b2c_mixed') ? 'voucher_b2b2c' : 'app_v2' },
        coords,
        voucherId: verifiedVoucher?.id,
        items: rules.some(r => r.type === 'BY_PRODUCTS') && selectedProduct ? [{ productName: selectedProduct, quantity: parseFloat(purchaseAmount) }] : []
      });
      toast.success('¡Canje registrado con éxito!');
      navigate('/staff');
    } catch (err: any) {
      console.error(err);
      toast.error('Error al registrar canje.');
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = (triangulationMode === 'b2b2c_digital' || triangulationMode === 'b2b2c_mixed') ? (!!verifiedVoucher && photoSlots.every((slot: any, idx: number) => !slot.required || photos[slot.key || `photo_${idx}`])) : (
    (rules.some(r => r.type === 'BY_PRODUCTS') ? (selectedProduct && purchaseAmount) : purchaseAmount) && 
    consumerDni && 
    photoSlots.every((slot: any, idx: number) => !slot.required || photos[slot.key || `photo_${idx}`])
  );

  const handleVerifyVoucher = async () => {
    if (!voucherCode) return;
    setVerifyingCode(true);
    try {
      const res = await api.get(`/vouchers/verify?code=${voucherCode}&projectId=${project.id || user.projectId}&mode=${triangulationMode}`);
      setVerifiedVoucher(res.data);
      setPurchaseAmount(res.data.amount); // Triggers matching algorithm
      toast.success('Código verificado correctamente.');
      setStep(2);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error verificando código.');
      setVerifiedVoucher(null);
    } finally {
      setVerifyingCode(false);
    }
  };

  return (
    <StaffLayout>
      <div className="px-5 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Registro de Canje</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{project.name}</p>
          </div>
          <div className="flex gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${step === 1 ? 'bg-brand-purple shadow-lg shadow-brand-purple/40' : 'bg-slate-200'}`} />
            <div className={`w-2.5 h-2.5 rounded-full ${step === 2 ? 'bg-brand-purple shadow-lg shadow-brand-purple/40' : 'bg-slate-200'}`} />
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-card p-6 space-y-6">
              <div className="flex flex-col items-center text-center space-y-2 mb-4">
                <div className="w-16 h-16 bg-brand-purple/5 rounded-full flex items-center justify-center text-brand-purple mb-2">
                  <UserCheck size={32} />
                </div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Identificación</h2>
                <p className="text-xs text-slate-500 font-medium px-4">Ingresa el DNI del cliente para comenzar el registro.</p>
              </div>

              {(triangulationMode === 'b2b2c_digital' || triangulationMode === 'b2b2c_mixed') ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Código del Voucher del Cliente</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        className="form-input pl-12 text-lg font-black tracking-widest focus:border-brand-teal focus:ring-brand-teal/10 uppercase" 
                        placeholder="A4X-9B" 
                        value={voucherCode} 
                        onChange={(e) => setVoucherCode(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyVoucher()}
                      />
                      <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    </div>
                  </div>

                  <button 
                    onClick={handleVerifyVoucher}
                    disabled={voucherCode.length < 5 || verifyingCode}
                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${
                      voucherCode.length >= 5 ? 'bg-brand-purple text-white shadow-brand-purple/30' : 'bg-slate-100 text-slate-300'
                    }`}
                  >
                    {verifyingCode ? <Loader2 className="animate-spin" /> : <>Verificar Código <CheckCircle2 size={18} /></>}
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Número de DNI</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        className="form-input pl-12 text-lg font-black tracking-widest focus:border-brand-teal focus:ring-brand-teal/10" 
                        placeholder="00000000" 
                        value={consumerDni} 
                        onChange={(e) => setConsumerDni(e.target.value)} 
                      />
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    </div>
                  </div>

                  <button 
                    onClick={handleNextStep}
                    disabled={consumerDni.length < 8 || validatingDni}
                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${
                      consumerDni.length >= 8 ? 'bg-brand-teal text-white shadow-brand-teal/30' : 'bg-slate-100 text-slate-300'
                    }`}
                  >
                    {validatingDni ? <Loader2 className="animate-spin" /> : <>Continuar <ArrowRight size={18} /></>}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
            {matchingReward && (
              <div className="bg-brand-teal/5 border-2 border-brand-teal/20 p-6 rounded-[2.5rem] flex items-center justify-between shadow-sm animate-in zoom-in duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-teal/10 rounded-2xl flex items-center justify-center text-brand-teal">
                    <Gift size={24} />
                  </div>
                  <div>
                    <h4 className="text-brand-teal font-black uppercase tracking-tight text-xs">¡Premio Sugerido!</h4>
                    <p className="text-brand-purple text-lg font-black uppercase italic leading-none">{matchingReward}</p>
                  </div>
                </div>
                <CheckCircle2 className="text-brand-teal" size={24} />
              </div>
            )}

            <div className="glass-card p-6 space-y-6">
              {projectConfig?.config?.requires_qr_validation && verifiedVoucher ? (
                 <div className="bg-slate-50 border border-slate-200 p-5 rounded-[2rem]">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Resumen de Compra Validada</h3>
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 mb-2">
                       <span className="text-[10px] font-bold text-slate-400 uppercase">Monto</span>
                       <span className="text-sm font-black text-slate-700">S/ {Number(verifiedVoucher.amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100">
                       <span className="text-[10px] font-bold text-slate-400 uppercase">DNI Cliente</span>
                       <span className="text-sm font-black text-slate-700">{verifiedVoucher.dni}</span>
                    </div>
                 </div>
              ) : (
                <>
                  {/* BY_PRODUCTS CATALOG */}
                  {rules.some(r => r.type === 'BY_PRODUCTS') ? (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Producto Comprado</label>
                        <select 
                          className="form-input h-14 font-bold"
                          value={selectedProduct}
                          onChange={(e) => setSelectedProduct(e.target.value)}
                        >
                          <option value="">Selecciona el producto...</option>
                          {availableProducts.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">
                          Cant. / Monto del Producto
                        </label>
                        <div className="relative">
                          <input 
                            type="number" 
                            step="0.01"
                            className="form-input pl-10 h-14 text-lg font-black focus:border-brand-teal focus:ring-brand-teal/10" 
                            placeholder="Ej: 1500" 
                            value={purchaseAmount} 
                            onChange={e => setPurchaseAmount(e.target.value)} 
                          />
                          <Ticket className="absolute left-4 top-4 text-slate-300" size={24} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">
                        {unit === 'units' ? 'Cant. Unidades' : 'Monto Compra'}
                      </label>
                      <div className="relative">
                        <input 
                          type="number" 
                          step={unit === 'units' ? '1' : '0.01'}
                          className="form-input pl-10 h-14 text-lg font-black focus:border-brand-teal focus:ring-brand-teal/10" 
                          placeholder={unit === 'units' ? '0' : '0.00'} 
                          value={purchaseAmount} 
                          onChange={(e) => setPurchaseAmount(e.target.value)} 
                        />
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-purple font-black text-sm">
                          {unit === 'units' ? '#' : 'S/'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Campos Dinámicos */}
                  {dynamicFields.length > 0 && (
                    <div className="space-y-4 pt-2">
                      {dynamicFields.map((field: any) => {
                        const Icon = field.type === 'email' ? Mail : field.type === 'tel' ? Phone : field.type === 'date' ? Calendar : ClipboardList;
                        return (
                          <div key={field.key || field.label} className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">{field.label}</label>
                            {field.type === 'list' ? (
                              <select 
                                className="form-input h-12 font-bold text-sm appearance-none bg-slate-50 focus:border-brand-purple/40" 
                                value={extraData[field.key || field.label] || ''} 
                                onChange={(e) => handleExtraDataChange(field.key || field.label, e.target.value)}
                              >
                                <option value="">Seleccione...</option>
                                {field.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            ) : (
                              <div className="relative">
                                <input 
                                  type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : field.type === 'date' ? 'date' : 'text'} 
                                  className="form-input pl-10 h-12 text-sm font-bold focus:border-brand-purple/40" 
                                  placeholder="..." 
                                  value={extraData[field.key || field.label] || ''} 
                                  onChange={(e) => handleExtraDataChange(field.key || field.label, e.target.value)} 
                                />
                                <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}



              <div className="divider h-px bg-slate-100" />

              {!projectConfig?.config?.requires_qr_validation && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 italic">Evidencia Fotográfica ({photoSlots.length})</label>
                  <div className="grid grid-cols-2 gap-4">
                  {photoSlots.map((slot: any, idx: number) => {
                    const key = slot.key || `photo_${idx}`;
                    return (
                      <div key={key} className="space-y-2">
                        <input type="file" accept="image/*" capture="environment" className="hidden" ref={el => { fileInputRefs.current[key] = el; }} onChange={(e) => onFileChange(key, e)} />
                        <div 
                          onClick={() => fileInputRefs.current[key]?.click()}
                          className={`aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all active:scale-95 ${
                            photos[key] ? 'border-none bg-brand-purple shadow-xl' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-brand-purple/30'
                          }`}
                        >
                          {photos[key] ? (
                            <img src={photos[key]} alt="Evidencia" className="w-full h-full object-cover opacity-60" />
                          ) : (
                            <>
                              <Camera size={24} className="mb-2 opacity-30" />
                              <span className="text-[9px] font-black text-center px-3 uppercase tracking-tighter leading-tight">{slot.label}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setStep(1)}
                className="w-1/3 py-5 rounded-2xl font-black uppercase tracking-widest text-xs bg-slate-100 text-slate-500"
              >
                Atrás
              </button>
              <button 
                onClick={handleSubmit}
                disabled={!isFormValid || submitting}
                className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${
                  isFormValid ? 'bg-brand-teal text-white shadow-brand-teal/30' : 'bg-slate-200 text-slate-400'
                }`}
              >
                {submitting ? <Loader2 className="animate-spin" /> : <Gift size={20} />}
                {submitting ? '...' : 'Registrar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {submitting && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-slate-900/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-24 h-24 bg-brand-purple rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-2xl shadow-brand-purple/50 animate-bounce border-4 border-white/10">
            <Gift size={40} />
          </div>
          <h2 className="text-2xl font-black tracking-tighter text-white uppercase italic mb-2 text-center">Registrando Canje</h2>
          <p className="text-brand-teal text-[10px] font-black tracking-[0.2em] uppercase text-center max-w-xs mt-2 leading-relaxed opacity-80">
            Sincronizando la auditoría y subiendo las fotos requeridas. Por favor, no cierres esta pantalla...
          </p>
          <div className="mt-10 relative">
            <Loader2 className="animate-spin text-brand-teal" size={48} />
            <div className="absolute inset-0 border-t-2 border-white rounded-full animate-ping opacity-20"></div>
          </div>
        </div>
      )}
    </StaffLayout>
  );
};

export default RedemptionForm;
