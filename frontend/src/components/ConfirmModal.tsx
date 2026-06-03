import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading?: boolean;
  confirmText?: string;
  type?: 'danger' | 'info';
  verifyText?: string; // If provided, user must type this exactly
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  loading = false,
  confirmText = 'Confirmar',
  type = 'danger',
  verifyText
}) => {
  const [inputValue, setInputValue] = React.useState('');

  React.useEffect(() => {
    if (isOpen) setInputValue('');
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmDisabled = loading || (verifyText ? inputValue.trim().toLowerCase() !== verifyText.trim().toLowerCase() : false);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative z-10 border border-slate-100 animate-in zoom-in duration-200">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
            <AlertTriangle size={28} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">{title}</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-relaxed px-2">
              {message}
            </p>
          </div>
          
          {verifyText && (
            <div className="w-full mt-4 space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Escribe "{verifyText}" para confirmar:
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-500 outline-none transition-all text-center"
                placeholder={verifyText}
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          <button 
            onClick={onClose}
            className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all ${
              isConfirmDisabled ? 'bg-slate-100 text-slate-300' : 
              type === 'danger' ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
            }`}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
