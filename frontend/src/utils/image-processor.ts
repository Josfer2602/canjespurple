/**
 * Utilidad unificada para procesar imágenes en el cliente (Frontend)
 * Permite redimensionar y comprimir imágenes antes de subirlas al backend/Drive.
 */

interface ProcessOptions {
  maxWidth?: number;
  quality?: number;
}

export const processImage = (
  file: File,
  options: ProcessOptions = { maxWidth: 1024, quality: 0.75 }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject('No se pudo obtener el contexto del Canvas');
          return;
        }

        // 1. Calcular Redimensión Proporcional
        let width = img.width;
        let height = img.height;
        const maxWidth = options.maxWidth || 1024;

        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // 2. Dibujar y Comprimir
        ctx.drawImage(img, 0, 0, width, height);
        
        // 3. Retornar como Base64 (JPEG para eficiencia exponencial)
        const processedDataUrl = canvas.toDataURL('image/jpeg', options.quality || 0.75);
        resolve(processedDataUrl);
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
};

// Alias para compatibilidad si fuera necesario en otros módulos
export const processImageWithMetadata = processImage;
