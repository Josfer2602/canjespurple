import React, { useRef } from 'react';
import { Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

interface Props {
  onDataParsed: (data: any[]) => void;
  expectedHeaders: string[];
  templateName: string;
  templateData: any[];
}

const ExcelImportButton: React.FC<Props> = ({ onDataParsed, expectedHeaders, templateName, templateData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, `${templateName}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast.error('El archivo está vacío');
          return;
        }

        // Validación básica de cabeceras
        const firstRow: any = data[0];
        const missingHeaders = expectedHeaders.filter(h => !(h in firstRow));
        
        if (missingHeaders.length > 0) {
          toast.error(`Faltan columnas requeridas: ${missingHeaders.join(', ')}`);
          return;
        }

        onDataParsed(data);
      } catch (err) {
        toast.error('Error al leer el archivo Excel');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
    // Resetear input para permitir subir el mismo archivo dos veces seguidas si hubo error
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleDownloadTemplate}
        className="px-4 py-3 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
        title="Descargar Plantilla"
      >
        <Download size={14} /> Plantilla
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-4 py-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
      >
        <Upload size={14} /> Importar Excel
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />
    </div>
  );
};

export default ExcelImportButton;
