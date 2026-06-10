import React, { useState, useRef } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { Printer, FileText, Settings, Download } from 'lucide-react';

const AdminTickets: React.FC = () => {
  const project = JSON.parse(localStorage.getItem('project') || '{}');
  
  const [config, setConfig] = useState({
    title: project.name || 'Campaña de Canjes',
    subtitle: 'Vale de Triangulación',
    fields: [
      { id: 1, label: 'DNI Cliente', show: true },
      { id: 2, label: 'Nombre Cliente', show: true },
      { id: 3, label: 'Monto de Compra (S/)', show: true },
      { id: 4, label: 'Producto Comprado', show: true },
      { id: 5, label: 'Fecha', show: true },
    ],
    terms: 'Válido solo para canjes en los puntos autorizados. Presentar este vale junto con el comprobante de compra.',
    showSignature: true,
    showStamp: true
  });

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Tickets de Canje</title>
          <style>
            @page { margin: 0; size: 58mm auto; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              margin: 0; 
              padding: 10px; 
              width: 58mm;
              font-size: 10px;
              color: #000;
              text-align: center;
            }
            .ticket {
              border-bottom: 2px dashed #000;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .title { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
            .subtitle { font-size: 12px; font-weight: bold; margin-bottom: 15px; }
            .field-row { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
            .field-label { font-weight: bold; text-align: left; }
            .field-value { flex-grow: 1; }
            .signature-box { margin-top: 30px; border-top: 1px solid #000; width: 80%; margin-left: auto; margin-right: auto; padding-top: 5px; }
            .terms { font-size: 8px; text-align: justify; margin-top: 15px; border-top: 1px dashed #000; padding-top: 5px; }
            .stamp { width: 50px; height: 50px; border: 1px solid #000; border-radius: 50%; margin: 10px auto; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #ccc;}
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="title">${config.title}</div>
            <div class="subtitle">${config.subtitle}</div>
            
            <div style="text-align: left; margin-top: 20px;">
              ${config.fields.filter(f => f.show).map(f => `
                <div class="field-row">
                  <span class="field-label">${f.label}:</span>
                  <span class="field-value"></span>
                </div>
              `).join('')}
            </div>

            ${config.showSignature ? `
              <div style="margin-top: 40px;">
                <div class="signature-box">Firma del PDV / Vendedor</div>
              </div>
            ` : ''}

            ${config.showStamp ? `
              <div class="stamp">SELLO<br/>AQUÍ</div>
            ` : ''}

            ${config.terms ? `
              <div class="terms">${config.terms}</div>
            ` : ''}
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const toggleField = (id: number) => {
    setConfig(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === id ? { ...f, show: !f.show } : f)
    }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Generador de Tickets</h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight">Crea vales físicos para triangulación en punto de venta.</p>
          </div>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-3 bg-brand-teal text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-teal/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <Printer size={16} />
            Imprimir Formato (58mm)
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuración */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <Settings className="text-brand-purple" size={20} />
                <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">Ajustes del Documento</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Título Principal</label>
                  <input type="text" className="form-input" value={config.title} onChange={e => setConfig({...config, title: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Subtítulo</label>
                  <input type="text" className="form-input" value={config.subtitle} onChange={e => setConfig({...config, subtitle: e.target.value})} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Campos a rellenar por el PDV</label>
                <div className="grid grid-cols-2 gap-3">
                  {config.fields.map(f => (
                    <label key={f.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                      <input type="checkbox" className="w-4 h-4 rounded text-brand-purple focus:ring-brand-purple" checked={f.show} onChange={() => toggleField(f.id)} />
                      <span className="text-xs font-bold text-slate-600">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded text-brand-purple focus:ring-brand-purple" checked={config.showSignature} onChange={e => setConfig({...config, showSignature: e.target.checked})} />
                  <span className="text-xs font-bold text-slate-600">Incluir espacio de Firma</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded text-brand-purple focus:ring-brand-purple" checked={config.showStamp} onChange={e => setConfig({...config, showStamp: e.target.checked})} />
                  <span className="text-xs font-bold text-slate-600">Incluir espacio de Sello</span>
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Términos y Condiciones (Letra Pequeña)</label>
                <textarea className="form-input min-h-[80px]" value={config.terms} onChange={e => setConfig({...config, terms: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-1">
            <div className="bg-slate-200 p-6 rounded-[2rem] flex flex-col items-center sticky top-28 shadow-inner">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Vista Previa (Formato Ticket 58mm)</p>
              
              <div className="bg-white w-[58mm] min-h-[100mm] shadow-2xl p-4 flex flex-col font-mono text-[10px] relative overflow-hidden" style={{ width: '220px' }}>
                <div className="absolute -top-2 left-0 right-0 h-4 bg-[radial-gradient(circle,transparent_4px,#fff_5px)] bg-[length:10px_10px]" />
                
                <div className="text-center mb-6 mt-2">
                  <h3 className="font-bold text-sm uppercase leading-tight">{config.title}</h3>
                  <p className="font-bold text-xs mt-1">{config.subtitle}</p>
                </div>

                <div className="flex-1 space-y-4">
                  {config.fields.filter(f => f.show).map(f => (
                    <div key={f.id} className="border-b border-dashed border-slate-300 pb-1 flex justify-between">
                      <span className="font-bold">{f.label}:</span>
                    </div>
                  ))}
                </div>

                {config.showSignature && (
                  <div className="mt-10 border-t border-black pt-1 text-center w-4/5 mx-auto">
                    <span className="text-[8px] font-bold">Firma del PDV / Vendedor</span>
                  </div>
                )}

                {config.showStamp && (
                  <div className="mt-4 border border-slate-300 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-slate-300">
                    <span className="text-[6px] text-center">SELLO<br/>AQUÍ</span>
                  </div>
                )}

                {config.terms && (
                  <div className="mt-6 pt-2 border-t border-dashed border-slate-300 text-[7px] text-justify text-slate-600 leading-tight">
                    {config.terms}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTickets;
