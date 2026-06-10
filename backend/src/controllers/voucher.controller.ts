import { Request, Response } from 'express';
import prisma from '../config/db';
import driveService from '../services/drive.service';

// Generador de códigos únicos (Ej. A4X-9B)
const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result.slice(0,3) + '-' + result.slice(3);
};

export const createVoucher = async (req: Request, res: Response) => {
  try {
    const { projectId, pointId, dni, phone, ticketNo, amount, photos, extraData } = req.body;

    if (!projectId || !pointId || !dni || !photos) {
      return res.status(400).json({ message: 'Faltan campos requeridos.' });
    }

    const point = await prisma.point.findUnique({
      where: { id: pointId },
      include: { project: true }
    });

    if (!point) return res.status(404).json({ message: 'Punto de Venta no encontrado.' });

    // Validar límite de DNI si existe
    const maxPerDni = (point.project.config as any)?.max_redemptions_per_dni;
    if (maxPerDni && maxPerDni > 0) {
      const existing = await prisma.redemption.count({ where: { dni, projectId } });
      if (existing >= maxPerDni) {
        return res.status(403).json({ message: 'Límite de canjes alcanzado para este DNI.' });
      }
    }

    // Subir a Drive
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
    const projectFolderName = point.project.name;
    const pointFolderName = point.name;
    const today = new Date().toISOString().split('T')[0];

    const uploadedPhotos: string[] = [];
    for (const [key, base64] of Object.entries(photos)) {
      const url = await driveService.uploadImage(
        base64 as string,
        `${key}_${Date.now()}.jpg`,
        [projectFolderName, pointFolderName, today, 'Vouchers', dni],
        folderId
      );
      uploadedPhotos.push(url);
    }

    // Asegurar código único
    let code = generateCode();
    while (await prisma.voucher.findUnique({ where: { code } })) {
      code = generateCode();
    }

    const voucher = await prisma.voucher.create({
      data: {
        code,
        projectId,
        pointId,
        dni,
        phone: phone || '',
        ticketNo: ticketNo || '',
        amount: amount || 0,
        extraData: extraData || {},
        photos: uploadedPhotos,
        status: 'PENDING'
      }
    });

    res.json({ success: true, voucher });
  } catch (err: any) {
    console.error('Error creating voucher:', err);
    res.status(500).json({ message: 'Error interno guardando la solicitud.', detail: err.message });
  }
};

export const getPointInfo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const point = await prisma.point.findUnique({
      where: { id },
      include: {
        project: {
          select: { name: true, logoUrl: true, config: true }
        }
      }
    });

    if (!point) return res.status(404).json({ message: 'Punto no encontrado.' });
    if (!(point.project.config as any)?.requires_qr_validation) {
      return res.status(403).json({ message: 'Este proyecto no tiene activa la validación por QR.' });
    }

    res.json(point);
  } catch (err: any) {
    res.status(500).json({ message: 'Error interno obteniendo punto.', detail: err.message });
  }
};

export const getPdvVouchers = async (req: Request, res: Response) => {
  try {
    const { pointId } = req.query;
    if (!pointId) return res.status(400).json({ message: 'Falta pointId.' });

    const vouchers = await prisma.voucher.findMany({
      where: { pointId: String(pointId), status: 'PENDING' },
      orderBy: { createdAt: 'asc' }
    });

    res.json(vouchers);
  } catch (err: any) {
    res.status(500).json({ message: 'Error listando solicitudes', detail: err.message });
  }
};

export const approveVoucher = async (req: Request, res: Response) => {
  try {
    const { voucherId, status } = req.body; // status: APPROVED or REJECTED
    
    if (!voucherId || !status) return res.status(400).json({ message: 'Falta voucherId o status.' });

    const voucher = await prisma.voucher.update({
      where: { id: voucherId },
      data: { status }
    });

    res.json({ success: true, voucher });
  } catch (err: any) {
    res.status(500).json({ message: 'Error actualizando estado', detail: err.message });
  }
};

export const verifyVoucherCode = async (req: Request, res: Response) => {
  try {
    const { code, projectId, mode } = req.query;
    if (!code) return res.status(400).json({ message: 'Falta el código de voucher.' });

    const voucher = await prisma.voucher.findFirst({
      where: { 
        code: String(code).toUpperCase(),
        projectId: projectId ? String(projectId) : undefined 
      },
      include: { point: true }
    });

    if (!voucher) return res.status(404).json({ message: 'Código no encontrado o inválido.' });
    
    if (mode !== 'b2b2c_mixed' && voucher.status === 'PENDING') {
      return res.status(400).json({ message: 'Este código aún no ha sido aprobado por el Punto de Venta.' });
    }
    
    if (voucher.status === 'REJECTED') return res.status(400).json({ message: 'Este código fue RECHAZADO por el Punto de Venta.' });
    if (voucher.status === 'REDEEMED') return res.status(400).json({ message: 'Este código YA FUE CANJEADO anteriormente.' });

    res.json(voucher);
  } catch (err: any) {
    res.status(500).json({ message: 'Error buscando código', detail: err.message });
  }
};

// Check for client polling
export const checkVoucherStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const voucher = await prisma.voucher.findUnique({ where: { id } });
    if (!voucher) return res.status(404).json({ message: 'Voucher no encontrado' });
    res.json({ status: voucher.status, code: voucher.status === 'APPROVED' ? voucher.code : null });
  } catch (err: any) {
    res.status(500).json({ message: 'Error interno' });
  }
};

export const getProxyPhoto = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    if (!fileId) return res.status(400).send('No fileId');
    const stream = await driveService.getFileStream(fileId);
    res.setHeader('Content-Type', 'image/jpeg');
    stream.pipe(res);
  } catch (err) {
    console.error('Error proxying photo:', err);
    res.status(500).send('Error loading image via proxy');
  }
};
