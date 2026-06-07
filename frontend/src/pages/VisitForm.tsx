import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, Loader2, Navigation, Check } from 'lucide-react';
import StaffLayout from '../layouts/StaffLayout';
import api from '../utils/api';
import { processImage } from '../utils/image-processor';
import toast from 'react-hot-toast';

const VisitForm: React.FC = () => {
  const [pointId, setPointId] = useState('');
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingVisit, setCheckingVisit] = useState(true);
  const [points, setPoints] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const project = JSON.parse(localStorage.getItem('project') || '{}');
  const projectId = project.id || user.projectId;

  const fetchData = async () => {
    try {
      setCheckingVisit(true);
      
      // 1. Verificar visita activa
      const res = await api.get(`/visits/get-active?userId=${user.id}`);
      if (res.data) {
        toast.error('Ya tienes una visita activa.');
        navigate('/staff');
        return;
      }

      // 2. Cargar puntos del proyecto
      const endpoint = projectId ? `/admin/points?projectId=${projectId}` : `/admin/points`;
      const pointsRes = await api.get(endpoint);
      setPoints(pointsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingVisit(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getGPS = () => {
    setLoadingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoadingGPS(false);
      },
      (err) => {
        console.error(err);
        setLoadingGPS(false);
        setCoords({ lat: -12.046374, lng: -77.042793 });
      }
    );
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await processImage(file, { maxWidth: 1024, quality: 0.7 });
        setPhoto(compressed);
      } catch (err) {
        console.error("Error procesando imagen:", err);
      }
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await api.post('/visits/start', {
        userId: user.id,
        pointId,
        facadePhoto: photo,
        coords
      });
      
      localStorage.setItem('activeVisitId', response.data.visitId);
      localStorage.setItem('activePointId', pointId);

      toast.success('¡Visita iniciada con éxito!');
      navigate('/staff');
    } catch (err) {
      console.error(err);
      toast.error('Error al iniciar visita.');
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = pointId && coords && photo;

  if (checkingVisit) {
    return (
      <StaffLayout>
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-400">
          <Loader2 size={40} className="animate-spin text-brand-purple" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] italic">Verificando sesión...</p>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div className="px-5 py-6 space-y-7 animate-in">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Iniciar Punto Operativo</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Registra tu ubicación para comenzar la jornada.</p>
        </div>

        <div className="glass-card p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Punto de Canje Autorizado</label>
            <select className="form-input bg-white border-slate-200" value={pointId} onChange={(e) => setPointId(e.target.value)}>
              <option value="">Selecciona un punto...</option>
              {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Validación GPS</label>
            <button 
              onClick={getGPS}
              className={`w-full py-5 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 transition-all duration-300 ${
                coords ? 'bg-brand-purple/5 border-brand-purple/20 text-brand-purple shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-brand-purple/30'
              }`}
            >
              {loadingGPS ? <Loader2 size={20} className="animate-spin" /> : <Navigation size={20} className={coords ? 'text-brand-purple' : 'opacity-30'} />}
              <span className="text-xs font-black uppercase tracking-widest">{coords ? 'Ubicación Verificada' : 'Obtener Coordenadas'}</span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Foto de Fachada (Testigo)</label>
            <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={onFileChange} />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`relative w-full aspect-video rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all duration-500 ${
                photo ? 'bg-slate-900 border-none shadow-2xl' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-brand-purple/30'
              }`}
            >
              {photo ? (
                <>
                  <img src={photo} alt="Fachada" className="w-full h-full object-cover opacity-60" />
                  <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
                    <div className="bg-brand-teal p-3 rounded-full shadow-lg shadow-brand-teal/40">
                      <CheckCircle2 size={32} className="text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase text-white tracking-[0.2em] bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">Foto Registrada</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3 group-hover:bg-brand-purple/10 transition-colors">
                    <Camera size={28} className="opacity-20 group-hover:opacity-100 transition-opacity text-brand-purple" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">Capturar Foto</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={!isFormValid || submitting}
          className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs transition-all shadow-2xl flex items-center justify-center gap-3 ${
            isFormValid 
              ? 'bg-brand-teal text-white shadow-brand-teal/30 hover:brightness-110 active:scale-95' 
              : 'bg-slate-100 text-slate-300 shadow-none'
          }`}
        >
          {submitting ? <Loader2 className="animate-spin" /> : <Check size={20} />}
          {submitting ? 'Abriendo Punto...' : 'Confirmar Ingreso'}
        </button>
      </div>
    </StaffLayout>
  );
};

export default VisitForm;
