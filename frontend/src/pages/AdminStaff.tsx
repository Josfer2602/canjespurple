import React, { useEffect, useState } from 'react';
import { Users, Plus, Loader2, Trash2, Mail, ShieldCheck } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

const AdminStaff: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'STAFF'
  });

  const project = JSON.parse(localStorage.getItem('project') || '{}');

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/staff?projectId=${project.id}`);
      setStaff(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/staff', { ...form, projectId: project.id });
      setShowModal(false);
      setForm({ fullName: '', email: '', password: '', role: 'STAFF' });
      toast.success('Usuario creado con éxito');
      fetchStaff();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error creando usuario');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/admin/staff/${deleteConfirm}`);
      toast.success('Usuario eliminado');
      fetchStaff();
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar personal');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Gestión de Personal</h2>
            <p className="text-sm text-slate-500 font-medium">Administra todos los roles y cuentas del proyecto.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-brand-teal text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-teal/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 border border-brand-teal"
          >
            <Plus size={16} />
            Añadir Personal
          </button>
        </header>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-brand-purple" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staff.map((u) => (
              <div key={u.id} className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-brand-purple/20 transition-all duration-300">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-brand-purple group-hover:text-white transition-all duration-500 shadow-sm border border-slate-100">
                    <Users size={20} />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em] border ${
                    u.role === 'ADMIN' ? 'bg-brand-purple text-white border-brand-purple' :
                    u.role === 'CLIENTE' ? 'bg-brand-teal text-white border-brand-teal' :
                    u.role === 'SUPERVISOR' ? 'bg-brand-purple/10 text-brand-purple border-brand-purple/20' : 
                    'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {u.role}
                  </span>
                </div>
                
                <div className="space-y-1.5">
                  <h4 className="text-lg font-black text-slate-800 uppercase tracking-tighter italic leading-tight">{u.fullName}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold lowercase tracking-tight">
                    <Mail size={12} className="text-brand-purple/40" />
                    {u.email}
                  </div>
                </div>

                <div className="mt-7 pt-5 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] italic">
                    Puntos Visitados: {u.visits?.length || 0}
                  </span>
                  <button 
                    onClick={() => setDeleteConfirm(u.id)}
                    className="p-2 text-slate-200 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {staff.length === 0 && (
              <div className="col-span-full h-48 border-2 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center text-slate-300 gap-3 font-black uppercase italic text-xs tracking-widest bg-slate-50/30">
                <Users size={32} className="opacity-10" />
                Sin personal registrado
              </div>
            )}
          </div>
        )}

        {/* Modal Uniforme */}
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in fade-in zoom-in duration-200 relative z-10 border border-slate-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-brand-purple rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-purple/20">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none italic">Alta de Cuenta</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Crea accesos autorizados</p>
                </div>
              </div>

              <form onSubmit={handleCreate} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Nombre Completo</label>
                  <input required type="text" className="form-input" placeholder="Ej: Juan Perez" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Email Acceso</label>
                  <input required type="email" className="form-input" placeholder="juan@marca.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Contraseña Temporal</label>
                  <input required type="text" className="form-input" placeholder="123456" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Rol de Sistema</label>
                  <select className="form-input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    <option value="ADMIN">ADMINISTRADOR</option>
                    <option value="CLIENTE">CLIENTE</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="STAFF">STAFF (CANJISTA)</option>
                  </select>
                </div>
                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all leading-none">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-[2] bg-brand-teal text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-teal/20 flex items-center justify-center gap-3 hover:brightness-110 active:scale-95 transition-all">
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    Crear Acceso
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
        title="Eliminar Personal"
        message="¿Seguro que deseas eliminar este usuario de manera permanente?"
        confirmText="Eliminar"
        type="danger"
      />
    </AdminLayout>
  );
};

export default AdminStaff;
