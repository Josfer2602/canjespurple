import React, { useEffect, useState } from 'react';
import { Plus, Loader2, Trash2, Edit3, Save, Info, PackageOpen, LayoutGrid } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

const AdminRules: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [form, setForm] = useState({
    id: undefined as string | undefined,
    minPurchase: 0,
    maxPurchase: 0,
    rewardName: '',
    type: 'BY_AMOUNT',
    productCriteria: {} as any
  });

  const project = JSON.parse(localStorage.getItem('project') || '{}');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rulesRes, invRes] = await Promise.all([
        api.get(`/admin/rules?projectId=${project.id}`),
        api.get(`/admin/inventory?projectId=${project.id}`)
      ]);
      
      setRules(rulesRes.data);
      
      // Extraer nombres únicos de items del inventario
      const items = Array.from(new Set(invRes.data.map((i: any) => i.itemName))) as string[];
      setInventoryItems(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rewardName) {
      toast.error('Debes seleccionar un producto del inventario');
      return;
    }
    setSaving(true);
    try {
      if (form.minPurchase >= form.maxPurchase) {
        toast.error('El monto mínimo debe ser menor al máximo');
        return;
      }
      await api.post('/admin/rules', { ...form, projectId: project.id });
      setShowModal(false);
      setForm({ id: undefined, minPurchase: 0, maxPurchase: 0, rewardName: '', type: 'BY_AMOUNT', productCriteria: {} });
      fetchData();
      toast.success(form.id ? 'Regla actualizada' : 'Regla creada con éxito');
    } catch (err) {
      console.error(err);
      toast.error('Error guardando regla');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (rule: any) => {
    setForm({
      id: rule.id,
      minPurchase: parseFloat(rule.minPurchase),
      maxPurchase: parseFloat(rule.maxPurchase),
      rewardName: rule.rewardName,
      type: rule.type || 'BY_AMOUNT',
      productCriteria: rule.productCriteria || {}
    });
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/admin/rules/${deleteConfirm}`);
      toast.success('Regla eliminada');
      fetchData();
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Gestión de Premios</h2>
            <p className="text-sm text-slate-500 font-medium">Define los lineamientos operativos según el consumo.</p>
          </div>
          <button 
            onClick={() => {
              setForm({ id: undefined, minPurchase: 0, maxPurchase: 0, rewardName: '', type: 'BY_AMOUNT', productCriteria: {} });
              setShowModal(true);
            }}
            className="px-6 py-3 bg-brand-teal text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-teal/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 border border-brand-teal"
          >
            <Plus size={16} />
            Nueva Regla
          </button>
        </header>

        <div className="bg-brand-purple/5 p-6 rounded-[2.5rem] border border-brand-purple/10 flex items-start gap-4 shadow-xl shadow-brand-purple/5">
           <Info className="text-brand-purple mt-1" size={24} />
           <div className="space-y-1">
             <h4 className="text-sm font-black text-brand-purple uppercase tracking-[0.1em] italic leading-none mb-1">Motor de Canje Activo</h4>
             <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest leading-relaxed">
               Cada regla asocia un rango de compra a un ítem del inventario. 
               Al registrarse, el stock se descontará automáticamente del responsable.
             </p>
           </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-brand-purple" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rules.map((rule) => (
              <div key={rule.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-brand-purple/20 transition-all duration-300">
                <div className="flex items-start justify-between mb-8">
                   <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-brand-purple group-hover:text-white transition-all duration-500 border border-slate-50">
                     <PackageOpen size={20} />
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => handleEdit(rule)} className="p-2.5 bg-brand-purple/5 text-brand-purple rounded-xl hover:bg-brand-purple hover:text-white transition-all border border-brand-purple/10"><Edit3 size={15} /></button>
                     <button onClick={() => setDeleteConfirm(rule.id)} className="p-2.5 bg-slate-50 text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all border border-slate-50 rounded-xl"><Trash2 size={15} /></button>
                   </div>
                </div>
                
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Articulo de Incentivo</p>
                  <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic leading-tight decoration-brand-teal underline underline-offset-8 decoration-2">{rule.rewardName}</h4>
                  
                  <div className="pt-8 flex items-center justify-between">
                    {rule.type === 'BY_PRODUCTS' ? (
                      <div className="flex-1 pr-4">
                        <p className="text-[9px] font-black text-brand-purple uppercase mb-1 tracking-widest">Condición por Producto</p>
                        <p className="text-sm font-black text-slate-900 uppercase">{rule.productCriteria?.productName || 'Producto no especificado'}</p>
                        <p className="text-[10px] text-slate-500 font-bold mt-1">Rango: {rule.minPurchase} - {rule.maxPurchase}</p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="text-[9px] font-black text-brand-purple uppercase mb-1 tracking-widest">Desde</p>
                          <p className="text-lg font-black text-slate-900 tracking-tighter italic">
                            {project.config?.redemption_unit === 'units' ? '' : 'S/'} {rule.minPurchase} {project.config?.redemption_unit === 'units' ? 'U' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-brand-purple uppercase mb-1 tracking-widest">Hasta</p>
                          <p className="text-lg font-black text-slate-900 tracking-tighter italic">
                            {project.config?.redemption_unit === 'units' ? '' : 'S/'} {rule.maxPurchase} {project.config?.redemption_unit === 'units' ? 'U' : ''}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {rules.length === 0 && (
              <div className="col-span-full h-48 border-2 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center text-slate-300 gap-3 font-black uppercase italic text-xs tracking-widest bg-slate-50/30">
                <PackageOpen size={35} className="opacity-10" />
                No hay reglas configuradas aún
              </div>
            )}
          </div>
        )}

        {/* Modal Uniforme */}
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in fade-in zoom-in duration-200 relative z-10 border border-slate-100">
              <div className="flex items-center gap-5 mb-8">
                <div className="w-14 h-14 bg-brand-purple rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-purple/20">
                  <LayoutGrid size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none italic">{form.id ? 'Editar Regla' : 'Nueva Regla'}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Lógica de asignación</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Tipo de Regla</label>
                  <select 
                    className="form-input"
                    value={form.type} 
                    onChange={e => setForm({...form, type: e.target.value})}
                  >
                    <option value="BY_AMOUNT">Por Monto de Compra / Unidades</option>
                    <option value="BY_PRODUCTS">Por Producto Específico</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Vincular Producto</label>
                  <select 
                    required 
                    className="form-input"
                    value={form.rewardName} 
                    onChange={e => setForm({...form, rewardName: e.target.value})}
                  >
                    <option value="">Selecciona un producto...</option>
                    {inventoryItems.map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                
                {form.type === 'BY_AMOUNT' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">
                        {project.config?.redemption_unit === 'units' ? 'U. Mín.' : 'Consumo Mín.'}
                      </label>
                      <input required type="number" step={project.config?.redemption_unit === 'units' ? '1' : '0.01'} className="form-input" value={form.minPurchase} onChange={e => setForm({...form, minPurchase: parseFloat(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">
                        {project.config?.redemption_unit === 'units' ? 'U. Máx.' : 'Consumo Máx.'}
                      </label>
                      <input required type="number" step={project.config?.redemption_unit === 'units' ? '1' : '0.01'} className="form-input" value={form.maxPurchase} onChange={e => setForm({...form, maxPurchase: parseFloat(e.target.value)})} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-brand-purple/5 border border-brand-purple/10 rounded-2xl">
                       <p className="text-xs font-black text-brand-purple uppercase tracking-tight">Regla por Producto Específico</p>
                       <p className="text-[10px] text-slate-500 mt-1">Ingresa el nombre del producto que el cliente debe comprar, y el rango de cantidad requerida para ganar el premio.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Nombre del Producto Requerido</label>
                      <input 
                        required 
                        type="text" 
                        placeholder="Ej: Coca Cola 500ml" 
                        className="form-input" 
                        value={form.productCriteria?.productName || ''} 
                        onChange={e => setForm({...form, productCriteria: { ...form.productCriteria, productName: e.target.value }})} 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">
                          Cant. / Monto Mín.
                        </label>
                        <input required type="number" step="0.01" className="form-input" value={form.minPurchase} onChange={e => setForm({...form, minPurchase: parseFloat(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">
                          Cant. / Monto Máx.
                        </label>
                        <input required type="number" step="0.01" className="form-input" value={form.maxPurchase} onChange={e => setForm({...form, maxPurchase: parseFloat(e.target.value)})} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-8">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all leading-none">Cancelar</button>
                  <button type="submit" disabled={saving || inventoryItems.length === 0} className="flex-[2] bg-brand-teal text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-teal/20 flex items-center justify-center gap-3 hover:brightness-110 active:scale-95 transition-all">
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Guardar Lógica
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
        title="Eliminar Lineamiento"
        message="¿Seguro que deseas eliminar esta regla operativa?"
        confirmText="Confirmar Borrado"
        type="danger"
      />
    </AdminLayout>
  );
};

export default AdminRules;
