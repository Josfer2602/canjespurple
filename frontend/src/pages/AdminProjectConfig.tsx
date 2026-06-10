import React, { useState } from 'react';
import { Save, Trash2, Loader2, Plus, X, AlertTriangle, Calendar } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

const AdminProjectConfig: React.FC = () => {
  const [project, setProject] = useState<any>(JSON.parse(localStorage.getItem('project') || '{}'));
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'photos' | 'fields'>('general');

  // Form states
  const [projectName, setProjectName] = useState(project.name || '');
  const [clientName, setClientName] = useState(project.clientName || '');
  const [photoSlots, setPhotoSlots] = useState<any[]>(project.config?.photo_slots || []);
  const [extraFields, setExtraFields] = useState<any[]>(project.config?.extra_fields || []);
  const [redemptionUnit, setRedemptionUnit] = useState(project.config?.redemption_unit || 'amount');

  // New Duración de Campaña states
  const [startDate, setStartDate] = useState(project.config?.start_date || '');
  const [endDate, setEndDate] = useState(project.config?.end_date || '');

  // New Flujo Antifraude & Whitelabeling
  const [triangulationMode, setTriangulationMode] = useState<'b2b2c_digital' | 'b2b2c_mixed' | 'physical'>(
    project.config?.triangulation_mode || (project.config?.requires_qr_validation ? 'b2b2c_digital' : 'physical')
  );
  const [pdvMode, setPdvMode] = useState<'specific' | 'general'>(project.config?.pdv_mode || 'specific');
  const [brandColor, setBrandColor] = useState(project.config?.brandColor || '#8B5CF6');
  const [logoUrl, setLogoUrl] = useState(project.logoUrl || '');
  const [kvUrl, setKvUrl] = useState(project.config?.kvUrl || '');

  const handleAddField = () => {
    const defaultLabel = 'Nuevo Campo';
    const key = `field_${Date.now()}`;
    setExtraFields([...extraFields, { label: defaultLabel, key, type: 'text', required: false, options: [] }]);
  };

  const handleAddPhoto = () => {
    setPhotoSlots([...photoSlots, { label: 'Nueva Foto', key: `photo_${Date.now()}`, required: true }]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Aplicar fotos por defecto si el listado está vacío
      let finalPhotos = photoSlots;
      if (finalPhotos.length === 0) {
        finalPhotos = [
          { label: 'Foto Boleta', key: 'ticket', required: true },
          { label: 'Foto Producto', key: 'product', required: true }
        ];
        setPhotoSlots(finalPhotos);
      }

      const config = {
        ...project.config,
        photo_slots: finalPhotos,
        extra_fields: extraFields,
        redemption_unit: redemptionUnit,
        start_date: startDate,
        end_date: endDate,
        triangulation_mode: triangulationMode,
        pdv_mode: pdvMode,
        brandColor,
        kvUrl
      };

      const res = await api.post('/admin/project/config', {
        projectId: project.id,
        name: projectName,
        clientName,
        logoUrl,
        config
      });

      const updated = res.data.project;
      setProject(updated);
      localStorage.setItem('project', JSON.stringify(updated));
      toast.success('Configuración guardada con éxito');
    } catch (err) {
      console.error(err);
      toast.error('Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  const confirmResetSystem = async () => {
    setResetting(true);
    try {
      await api.post('/admin/reset', { projectId: project.id });
      toast.success('Sistema reiniciado. Toda la data transaccional ha sido borrada.');
      setShowResetConfirm(false);
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error('Error reiniciando el sistema');
    } finally {
      setResetting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic font-black text-brand-purple">Configuración & Ajustes</h2>
            <p className="text-sm text-slate-500 font-medium">Gestión avanzada de la campaña activa.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-brand-teal text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-teal/20 hover:scale-[1.02] transition-all flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Guardar Cambios
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-2">
            <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} label="General" />
            <TabButton active={activeTab === 'photos' as any} onClick={() => setActiveTab('photos' as any)} label="Fotos Canje" />
            <TabButton active={activeTab === 'fields' as any} onClick={() => setActiveTab('fields' as any)} label="Atributos Canje" />
            <TabButton active={activeTab === 'theme' as any} onClick={() => setActiveTab('theme' as any)} label="Personalización Visual" />

            <div className="pt-8 mt-8 border-t border-slate-200">
              <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest px-4 mb-4">Zona de Peligro</h4>
              <button
                onClick={() => setShowResetConfirm(true)}
                disabled={resetting}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 font-bold text-xs uppercase hover:bg-red-50 transition-colors"
              >
                {resetting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Borrar Data (Reiniciar)
              </button>
            </div>
          </div>

          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm min-h-[500px]">
            {activeTab === 'general' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">Información de Campaña</h3>

                {/* Modo de Triangulación Selector */}
                <div className="border border-slate-100 rounded-2xl p-5 mb-4 bg-slate-50">
                  <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-1">Modo de Triangulación / Canje</h4>
                  <p className="text-[10px] text-slate-500 font-bold mb-4 leading-relaxed">
                    Define cómo se validarán los canjes entre el Promotor, el Cliente y el Puesto de Venta.
                  </p>
                  <div className="space-y-3">
                    {/* Flujo 1 */}
                    <button
                      type="button"
                      onClick={() => setTriangulationMode('b2b2c_digital')}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${triangulationMode === 'b2b2c_digital'
                          ? 'border-brand-purple bg-brand-purple/5'
                          : 'border-slate-200 bg-white hover:border-brand-purple/50'
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${triangulationMode === 'b2b2c_digital' ? 'border-brand-purple' : 'border-slate-300'}`}>
                          {triangulationMode === 'b2b2c_digital' && <div className="w-1.5 h-1.5 rounded-full bg-brand-purple" />}
                        </div>
                        <span className={`text-[11px] font-black uppercase tracking-widest ${triangulationMode === 'b2b2c_digital' ? 'text-brand-purple' : 'text-slate-600'}`}>
                          Flujo 1: Digital B2B2C (Aprobado por PDV)
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-medium pl-5">
                        El cliente se registra online, el PDV lo aprueba desde su portal, y el promotor solo entrega el premio basándose en el QR.
                      </p>
                    </button>

                    {/* Flujo 2 */}
                    <button
                      type="button"
                      onClick={() => setTriangulationMode('b2b2c_mixed')}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${triangulationMode === 'b2b2c_mixed'
                          ? 'border-brand-purple bg-brand-purple/5'
                          : 'border-slate-200 bg-white hover:border-brand-purple/50'
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${triangulationMode === 'b2b2c_mixed' ? 'border-brand-purple' : 'border-slate-300'}`}>
                          {triangulationMode === 'b2b2c_mixed' && <div className="w-1.5 h-1.5 rounded-full bg-brand-purple" />}
                        </div>
                        <span className={`text-[11px] font-black uppercase tracking-widest ${triangulationMode === 'b2b2c_mixed' ? 'text-brand-purple' : 'text-slate-600'}`}>
                          Flujo 2: Mixto (Canjista Valida)
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-medium pl-5">
                        El cliente se registra online y recibe un código. Luego el promotor ingresa el código y le toma foto al comprobante firmado por el PDV.
                      </p>
                    </button>

                    {/* Flujo 3 */}
                    <button
                      type="button"
                      onClick={() => setTriangulationMode('physical')}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${triangulationMode === 'physical'
                          ? 'border-brand-purple bg-brand-purple/5'
                          : 'border-slate-200 bg-white hover:border-brand-purple/50'
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${triangulationMode === 'physical' ? 'border-brand-purple' : 'border-slate-300'}`}>
                          {triangulationMode === 'physical' && <div className="w-1.5 h-1.5 rounded-full bg-brand-purple" />}
                        </div>
                        <span className={`text-[11px] font-black uppercase tracking-widest ${triangulationMode === 'physical' ? 'text-brand-purple' : 'text-slate-600'}`}>
                          Flujo 3: Físico Directo (Ticket de PDV)
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-medium pl-5">
                        No hay registro online del cliente. El PDV le da un ticket físico impreso y el promotor registra todos los datos directamente tomando foto al ticket.
                      </p>
                    </button>
                  </div>
                </div>

                {/* PDV Mode Selector */}
                <div className="border border-slate-100 rounded-2xl p-5 mb-2">
                  <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-1">Modo de Registro de Puntos de Venta</h4>
                  <p className="text-[10px] text-slate-400 font-bold mb-4 leading-relaxed">
                    Define si controlas PDVs específicos (bodegas individuales registradas) o simplemente el canal/mercado general donde opera el consumidor.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Opción Específico */}
                    <button
                      type="button"
                      onClick={() => setPdvMode('specific')}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${pdvMode === 'specific'
                          ? 'border-brand-purple bg-brand-purple/5'
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${pdvMode === 'specific' ? 'border-brand-purple' : 'border-slate-300'}`}>
                          {pdvMode === 'specific' && <div className="w-1.5 h-1.5 rounded-full bg-brand-purple" />}
                        </div>
                        <span className={`text-[11px] font-black uppercase tracking-widest ${pdvMode === 'specific' ? 'text-brand-purple' : 'text-slate-500'}`}>
                          PDV Específico
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-medium pl-5">
                        Registras cada tienda/puesto individualmente. Controlas exactamente cuáles participan, cuántos canjes hubo por PDV y puedes asignarles QR y acceso propio.
                      </p>
                    </button>

                    {/* Opción General */}
                    <button
                      type="button"
                      onClick={() => setPdvMode('general')}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${pdvMode === 'general'
                          ? 'border-brand-teal bg-brand-teal/5'
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${pdvMode === 'general' ? 'border-brand-teal' : 'border-slate-300'}`}>
                          {pdvMode === 'general' && <div className="w-1.5 h-1.5 rounded-full bg-brand-teal" />}
                        </div>
                        <span className={`text-[11px] font-black uppercase tracking-widest ${pdvMode === 'general' ? 'text-brand-teal' : 'text-slate-500'}`}>
                          Canal / Mercado General
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-medium pl-5">
                        No registras tiendas individuales. El promotor selecciona el tipo de canal al canjear (bodega, minimarket, supermercado, etc.). Útil en general trade abierto.
                      </p>
                    </button>
                  </div>
                  {pdvMode === 'general' && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                      <span className="text-amber-500 text-sm mt-0.5">⚠</span>
                      <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                        En modo Canal General, la sección de "Puntos Canje" se usa solo como referencia de mercados. No se generan QRs ni accesos individuales por PDV.
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial</label>
                    <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-brand-purple outline-none transition-all" value={projectName} onChange={e => setProjectName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cliente / Marca</label>
                    <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-brand-purple outline-none transition-all" value={clientName} onChange={e => setClientName(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fecha de Inicio</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input type="date" className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold focus:ring-2 focus:ring-brand-purple outline-none transition-all" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fecha de Finalización</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input type="date" className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold focus:ring-2 focus:ring-brand-purple outline-none transition-all" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tipo de Medición de Canje</label>
                    <div className="flex gap-2 p-1 bg-slate-50 border border-slate-100 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setRedemptionUnit('amount')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${redemptionUnit === 'amount'
                            ? 'bg-white text-brand-purple shadow-sm'
                            : 'text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        Monto (S/)
                      </button>
                      <button
                        type="button"
                        onClick={() => setRedemptionUnit('units')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${redemptionUnit === 'units'
                            ? 'bg-white text-brand-purple shadow-sm'
                            : 'text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        Unidades
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100 md:col-span-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Restricciones de Canje</h4>
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                      <div>
                        <p className="text-xs font-black text-slate-700 uppercase italic leading-none">Limitar Canjes por DNI</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Evita que un mismo cliente canjee varias veces.</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <input
                          type="number"
                          min="0"
                          placeholder="Máx."
                          className="w-20 bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-black text-center focus:ring-2 focus:ring-brand-purple outline-none transition-all"
                          value={project.config?.max_redemptions_per_dni || ''}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0;
                            const newProject = { ...project, config: { ...project.config, max_redemptions_per_dni: val } };
                            setProject(newProject);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'photos' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">Fotos de Evidencia</h3>
                  <button onClick={handleAddPhoto} className="p-2 bg-brand-purple/5 text-brand-purple rounded-xl hover:bg-brand-purple/10 transition-colors">
                    <Plus size={20} />
                  </button>
                </div>

                <div className="bg-brand-purple/5 p-4 rounded-2xl border border-brand-purple/10 flex items-start gap-3">
                  <AlertTriangle size={18} className="text-brand-purple mt-0.5" />
                  <div className="text-[10px] text-brand-purple font-bold uppercase leading-relaxed">
                    La <b>Foto de Fachada</b> es obligatoria por defecto al iniciar la visita y no necesita ser configurada aquí. El listado inferior es exclusivo para el flujo de canje.
                  </div>
                </div>

                <div className="space-y-3">
                  {photoSlots.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-xs font-black italic border-2 border-dashed border-slate-100 rounded-3xl">Por defecto se solicitarán: Boleta y Producto.</div>
                  )}
                  {photoSlots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex-1">
                        <input type="text" className="bg-transparent border-none focus:outline-none font-bold text-slate-700 w-full" value={slot.label} onChange={e => {
                          const newSlots = [...photoSlots];
                          newSlots[idx].label = e.target.value;
                          setPhotoSlots(newSlots);
                        }} />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black px-2 py-1 bg-white border rounded-lg text-slate-400 uppercase italic">Obligatoria</span>
                        <button onClick={() => setPhotoSlots(photoSlots.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500"><X size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'fields' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">Campos Variables del Canje</h3>
                  <button onClick={handleAddField} className="p-2 bg-brand-purple/5 text-brand-purple rounded-xl hover:bg-brand-purple/10 transition-colors">
                    <Plus size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  {extraFields.map((field, idx) => (
                    <div key={idx} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <input type="text" className="bg-transparent border-none focus:outline-none font-black text-slate-800 text-base italic" value={field.label} onChange={e => {
                          const newFields = [...extraFields];
                          newFields[idx].label = e.target.value;
                          setExtraFields(newFields);
                        }} />
                        <button onClick={() => setExtraFields(extraFields.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500"><X size={20} /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <select className="bg-white border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-sm outline-none focus:ring-1 focus:ring-brand-purple" value={field.type} onChange={e => {
                          const newFields = [...extraFields];
                          newFields[idx].type = e.target.value;
                          setExtraFields(newFields);
                        }}>
                          <option value="text">TEXTO LIBRE</option>
                          <option value="list">LISTA DESPLEGABLE</option>
                          <option value="number">NÚMERO</option>
                          <option value="email">EMAIL / CORREO</option>
                          <option value="tel">TELÉFONO</option>
                          <option value="date">FECHA</option>
                        </select>
                        {field.type === 'list' && (
                          <input type="text" placeholder="Opción 1, Opción 2..." className="bg-white border-none rounded-xl px-4 py-2 text-xs font-bold shadow-sm" value={field.options?.join(', ') || ''} onChange={e => {
                            const newFields = [...extraFields];
                            newFields[idx].options = e.target.value.split(',').map(s => s.trim());
                            setExtraFields(newFields);
                          }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'theme' as any && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">Personalización Visual (Whitelabel)</h3>
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 space-y-6">

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Color Principal de la Marca</label>
                    <div className="flex items-center gap-4">
                      <div className="relative group hover:scale-105 transition-transform cursor-pointer overflow-hidden rounded-xl border-4 border-white shadow-md">
                        <input type="color" className="w-12 h-12 p-0 border-0 outline-none cursor-pointer absolute -inset-2" value={brandColor} onChange={e => setBrandColor(e.target.value)} />
                      </div>
                      <input type="text" className="w-32 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black focus:ring-2 focus:ring-brand-purple outline-none uppercase" value={brandColor} onChange={e => setBrandColor(e.target.value)} />
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 pt-1">Este color bañará la interfaz del escáner público y del módulo PDV.</p>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Logo de la Marca (URL)</label>
                    <input type="url" placeholder="https://..." className="w-full bg-white border border-slate-200 rounded-xl px-5 py-4 text-xs font-bold focus:ring-2 focus:ring-brand-purple outline-none transition-all" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />
                    {logoUrl && <img src={logoUrl} alt="Logo Prev" className="h-12 object-contain mt-2 bg-white rounded shadow-sm p-1" />}
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      Key Visual / Banner Principal (URL)
                      <span className="bg-orange-100 text-orange-600 text-[8px] px-2 py-0.5 rounded-full uppercase">1080x566 Requerido</span>
                    </label>
                    <input type="url" placeholder="https://..." className="w-full bg-white border border-slate-200 rounded-xl px-5 py-4 text-xs font-bold focus:ring-2 focus:ring-brand-purple outline-none transition-all" value={kvUrl} onChange={e => setKvUrl(e.target.value)} />
                    <p className="text-[10px] text-slate-500 italic mt-1 font-medium leading-relaxed">
                      El banner promocional aparecerá en la parte más alta de la app cuando los clientes escaneen su boleta. <br />
                      <b>Especificaciones de Diseño:</b> Máx 1MB, JPG o PNG. Resolución ideal paisada 1080x566px o cuadrado 1080x1080px.
                    </p>
                    {kvUrl && <img src={kvUrl} alt="KV Prev" className="w-full max-w-sm rounded-xl object-contain mt-2 shadow-md border border-slate-100" />}
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={confirmResetSystem}
        loading={resetting}
        title="Reiniciar Sistema"
        message="¿ESTÁS SEGURO? Esta acción borrará permanentemente todos los canjes, visitas e historial de esta campaña. No se puede deshacer."
        confirmText="Sí, Borrar Data Permanentemente"
        verifyText="REINICIAR"
        type="danger"
      />
    </AdminLayout>
  );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, label: string }> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${active ? 'bg-brand-purple text-white shadow-xl shadow-brand-purple/20' : 'text-slate-500 hover:bg-slate-100'
      }`}
  >
    {label}
  </button>
);

export default AdminProjectConfig;
