import React, { useEffect, useState } from 'react';
import { Plus, Loader2, Link2, ExternalLink, Calendar, Briefcase, Trash2 } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

const AdminProjects: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [switchConfirm, setSwitchConfirm] = useState<any>(null);

  const [form, setForm] = useState({
    name: '',
    clientName: ''
  });

  const currentProject = JSON.parse(localStorage.getItem('project') || '{}');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/projects');
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/admin/projects', form);
      setShowModal(false);
      setForm({ name: '', clientName: '' });
      fetchProjects();
      setSwitchConfirm(res.data.project);
    } catch (err) {
      console.error(err);
      toast.error('Error creando proyecto');
    } finally {
      setSaving(false);
    }
  };

  const handleSwitch = (project: any) => {
    localStorage.setItem('project', JSON.stringify(project));
    localStorage.setItem('activePointId', ''); // Reset point context
    localStorage.setItem('activeVisitId', ''); // Reset visit context
    window.location.href = '/admin'; // Force reload to refresh all context
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/admin/projects/${deleteConfirm.id}`);
      toast.success('Proyecto eliminado permanentemente');
      
      if (currentProject.id === deleteConfirm.id) {
        localStorage.removeItem('project');
        localStorage.removeItem('activePointId');
        localStorage.removeItem('activeVisitId');
        window.location.reload();
      } else {
        fetchProjects();
        setDeleteConfirm(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error eliminando proyecto');
      setDeleteConfirm(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Mis Proyectos BTL</h2>
            <p className="text-sm text-slate-500 font-medium">Gestiona y crea nuevas campañas independientes.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-brand-teal text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-teal/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 border border-brand-teal"
          >
            <Plus size={16} />
            Nuevo Proyecto
          </button>
        </header>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-brand-purple" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((p) => (
              <div 
                key={p.id} 
                className={`bg-white p-8 rounded-[2.5rem] border-2 transition-all relative overflow-hidden group ${
                  currentProject.id === p.id ? 'border-brand-purple shadow-xl shadow-brand-purple/5' : 'border-slate-100 shadow-sm hover:border-slate-200'
                }`}
              >
                {currentProject.id === p.id && (
                  <div className="absolute top-0 right-0 bg-brand-purple text-white px-6 py-1.5 rounded-bl-3xl text-[9px] font-black uppercase tracking-widest shadow-sm">
                    Gestionando Ahora
                  </div>
                )}
                
                <div className="flex items-start gap-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    currentProject.id === p.id ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'bg-slate-50 text-slate-300 group-hover:bg-slate-100'
                  }`}>
                    <Briefcase size={26} />
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                       <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">{p.name}</h4>
                       <button 
                         onClick={() => setDeleteConfirm(p)}
                         className="p-2 text-slate-200 hover:text-red-500 transition-colors"
                       >
                         <Trash2 size={18} />
                       </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest decoration-brand-teal underline underline-offset-4 decoration-2">{p.clientName}</p>
                    <div className="flex items-center gap-4 pt-3">
                       <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-300 uppercase italic">
                         <Calendar size={12} className="text-brand-purple/40" />
                         {new Date(p.createdAt).toLocaleDateString()}
                       </div>
                       <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-300 uppercase">
                         <Link2 size={12} />
                         ID: {p.id.substring(0,8)}...
                       </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                  {currentProject.id === p.id ? (
                    <span className="text-[10px] font-black text-brand-purple uppercase tracking-[0.2em] flex items-center gap-2.5 bg-brand-purple/5 px-4 py-1.5 rounded-full border border-brand-purple/10">
                       <div className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-pulse"></div>
                       Gestión Activa
                    </span>
                  ) : (
                    <button 
                      onClick={() => handleSwitch(p)}
                      className="px-6 py-3 bg-slate-50 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all flex items-center gap-2 border border-slate-100"
                    >
                      <ExternalLink size={12} />
                      Gestionar Proyecto
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal simple */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-6">Nueva Campaña</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Nombre del Proyecto</label>
                  <input required type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-brand-purple/10 focus:border-brand-purple/40 outline-none transition-all placeholder:text-slate-300 font-bold" placeholder="Campaña Invierno 2026" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Cliente / Marca</label>
                  <input required type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-brand-purple/10 focus:border-brand-purple/40 outline-none transition-all placeholder:text-slate-300 font-bold" placeholder="Nombre de la Empresa" value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})} />
                </div>
                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors tracking-widest leading-none">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-[2] px-8 bg-brand-teal text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-teal/20 flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all">
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    Crear Proyecto
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Eliminar Campaña"
        message={`ALERTA: Borrarás toda la información (canjes, personal, stock) de la campaña.`}
        verifyText={deleteConfirm?.name}
        confirmText="Eliminar Todo Permanentemente"
        type="danger"
      />

      <ConfirmModal
        isOpen={!!switchConfirm}
        onClose={() => setSwitchConfirm(null)}
        onConfirm={() => handleSwitch(switchConfirm)}
        title="Proyecto Creado"
        message="¿Deseas activar y empezar a gestionar este nuevo proyecto ahora mismo?"
        confirmText="Sí, Activar"
        type="info"
      />
    </AdminLayout>
  );
};

export default AdminProjects;
