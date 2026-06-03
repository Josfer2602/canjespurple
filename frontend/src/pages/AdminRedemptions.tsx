import React, { useEffect, useState } from 'react';
import { Loader2, Trash2, Edit3, Save, Receipt, AlertCircle, FileText } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout';
import api from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

const AdminRedemptions: React.FC = () => {
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; reward: string }>({ open: false, id: '', reward: '' });
  const [deleting, setDeleting] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const project = JSON.parse(localStorage.getItem('project') || '{}');
  const isUnits = project.config?.redemption_unit === 'units';
  const extraFields = project.config?.extra_fields || [];
  const requireTicket = project.config?.unique_ticket_validation;

  const [form, setForm] = useState({
    id: '',
    amount: '',
    ticketNo: '',
    extraData: {} as Record<string, string>
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/redemptions?projectId=${project.id}`);
      setRedemptions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async () => {
    const { id } = deleteConfirm;
    if (!id) return;
    
    setDeleting(true);
    try {
      const res = await api.delete(`/admin/redemptions/${id}`);
      if (res.data.success) {
        setDeleteConfirm({ open: false, id: '', reward: '' });
        toast.success('Canje borrado con éxito');
        fetchData();
      } else {
        toast.error('No se pudo borrar el canje');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Error al eliminar: ${err.response?.data?.message || err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const triggerDelete = (item: any) => {
    setDeleteConfirm({ open: true, id: item.id, reward: item.reward || 'Promocional' });
  };

  const handleEditClick = (item: any) => {
    setForm({
      id: item.id,
      amount: item.amount,
      ticketNo: item.ticketNo || '',
      extraData: item.extraData || {}
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/admin/redemptions/${form.id}`, {
        amount: parseFloat(form.amount || '0'),
        ticketNo: form.ticketNo,
        extraData: form.extraData
      });
      setShowModal(false);
      toast.success('Canje editado con éxito');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar edición');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (redemptions.length === 0) return;

    // Headers
    const headers = [
      'Fecha',
      'Hora',
      'DNI',
      requireTicket ? 'Comprobante' : '',
      'Premio',
      isUnits ? 'Unidades' : 'Monto Compra',
      'Punto',
      'Staff',
      ...extraFields.map((f: any) => f.label)
    ].filter(Boolean);

    // Rows
    const rows = redemptions.map(r => {
      const date = new Date(r.createdAt);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        r.dni,
        requireTicket ? (r.ticketNo || '') : '',
        r.reward,
        r.amount,
        r.visit?.point?.name || '',
        r.visit?.user?.fullName || '',
        ...extraFields.map((f: any) => r.extraData?.[f.key] || r.extraData?.[f.label] || '')
      ].filter((_, idx) => {
        if (!requireTicket && idx === 3) return false;
        return true;
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(["\uFEFF", csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `canjes_${project.name}_${new Date().toISOString().split('T')[0]}.csv`);
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
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Auditoría de Canjes</h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight">Registro histórico integral y corrección de data operativa.</p>
          </div>
          <button 
            onClick={handleExportCSV}
            disabled={redemptions.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-brand-teal text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-teal/20 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-brand-teal"
          >
            <FileText size={16} />
            Exportar Reporte (CSV)
          </button>
        </header>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-brand-purple" size={32} />
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-50">
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Fecha / Hora</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">DNI Cliente</th>
                    {requireTicket && <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Comprobante</th>}
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Premio / Acción</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      {isUnits ? 'Unidades' : 'Total Compra'}
                    </th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Contexto Operativo</th>
                    {extraFields.map((field: any, idx: number) => (
                      <th key={idx} className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{field.label}</th>
                    ))}
                    {user.role === 'ADMIN' && <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {redemptions.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-all duration-300 group">
                      <td className="px-6 py-5 whitespace-nowrap">
                         <span className="text-xs font-black text-slate-800 tracking-tighter italic">{new Date(item.createdAt).toLocaleDateString()}</span>
                         <span className="text-[10px] text-brand-purple font-black block tracking-widest uppercase mt-0.5">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}</span>
                      </td>
                      <td className="px-6 py-5 text-sm font-black text-slate-700 tracking-tighter">{item.dni}</td>
                      {requireTicket && <td className="px-6 py-5 text-xs text-slate-400 font-bold uppercase">{item.ticketNo || '-'}</td>}
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-purple/5 text-brand-purple text-[10px] font-black tracking-widest uppercase border border-brand-purple/10 shadow-sm">
                          <Receipt size={12} />
                          {item.reward}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-sm font-black text-slate-900 tracking-tighter">
                          {isUnits ? '' : 'S/ '} {Number(item.amount).toFixed(2)} {isUnits ? 'und' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-900 uppercase italic tracking-tight underline decoration-brand-teal decoration-2 underline-offset-4 mb-1">{item.visit?.point?.name || 'Local'}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">By: {item.visit?.user?.fullName?.split(' ')[0]}</span>
                        </div>
                      </td>
                      {extraFields.map((field: any, idx: number) => (
                        <td key={idx} className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase">
                          {item.extraData?.[field.key] || item.extraData?.[field.label] || '-'}
                        </td>
                      ))}
                      {user.role === 'ADMIN' && (
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => handleEditClick(item)} className="p-2.5 bg-brand-purple/5 text-brand-purple hover:bg-brand-purple hover:text-white transition-all rounded-xl border border-brand-purple/10" title="Editar Canje">
                               <Edit3 size={15} />
                             </button>
                            <button onClick={() => triggerDelete(item)} className="p-2.5 bg-slate-50 text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all rounded-xl border border-slate-50" title="Eliminar y devolver stock">
                               <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {redemptions.length === 0 && (
                    <tr>
                      <td colSpan={12} className="px-6 py-24 text-center">
                         <div className="flex flex-col items-center gap-4 text-slate-200">
                           <Receipt size={50} className="opacity-10" />
                           <p className="text-xs font-black uppercase tracking-[0.2em] italic">No se registran transacciones históricas</p>
                         </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Editar */}
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative z-10 border border-slate-100 animate-in fade-in zoom-in duration-300">
               <div className="flex items-center gap-5 mb-8">
                 <div className="w-14 h-14 bg-brand-purple rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-purple/20">
                   <Edit3 size={28} />
                 </div>
                 <div>
                   <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none italic">Corregir Canje</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ajuste técnico de valores</p>
                 </div>
               </div>

               <div className="bg-brand-purple/5 p-5 rounded-[2rem] border border-brand-purple/10 flex items-start gap-4 mb-8">
                 <AlertCircle className="text-brand-purple shrink-0 mt-1" size={20} />
                 <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.1em] leading-relaxed italic">
                   Estas modificaciones afectan directamente los reportes de auditoría y conciliación de stock.
                 </p>
               </div>

               <form onSubmit={handleSave} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">
                      {isUnits ? 'Unidades' : 'Monto de Compra (S/)'}
                    </label>
                    <input 
                      required 
                      type="number" 
                      step={isUnits ? '1' : '0.01'} 
                      className="form-input" 
                      value={form.amount} 
                      onChange={e => setForm({...form, amount: e.target.value})} 
                    />
                 </div>

                 {requireTicket && (
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Número de Comprobante</label>
                     <input 
                       className="form-input" 
                       value={form.ticketNo} 
                       onChange={e => setForm({...form, ticketNo: e.target.value})} 
                     />
                   </div>
                 )}

                 {extraFields.map((field: any, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">{field.label}</label>
                      <input 
                        required={field.required}
                        className="form-input" 
                        value={form.extraData[field.key] || ''} 
                        onChange={e => setForm({
                          ...form, 
                          extraData: { ...form.extraData, [field.key]: e.target.value }
                        })} 
                      />
                    </div>
                 ))}

                 <div className="flex gap-4 pt-6">
                   <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all leading-none">Cancelar</button>
                   <button type="submit" disabled={saving} className="flex-[2] bg-brand-teal text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-teal/20 flex items-center justify-center gap-3 hover:brightness-110 active:scale-95 transition-all">
                     {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                     Guardar Cambios
                   </button>
                 </div>
               </form>
            </div>
          </div>
        )}
        <ConfirmModal 
          isOpen={deleteConfirm.open}
          onClose={() => setDeleteConfirm({ ...deleteConfirm, open: false })}
          onConfirm={handleDelete}
          loading={deleting}
          title="Eliminar Registro de Auditoría"
          message={deleteConfirm.reward === 'Promocional' 
            ? 'Esta acción borrará permanentemente el registro.' 
            : `Al borrar, se reintegrará 1 unidad de "${deleteConfirm.reward}" al stock.`}
          confirmText="Sí, Eliminar Permanentemente"
        />
      </div>
    </AdminLayout>
  );
};

export default AdminRedemptions;
