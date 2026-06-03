import { Request, Response } from 'express';
import prisma from '../config/db';
import driveService from '../services/drive.service';

export const createRedemption = async (req: Request, res: Response) => {
  try {
    const { 
      projectId, 
      visitId, 
      ticketNumber,
      purchaseAmount,
      consumerDni, 
      photos, 
      extraData,
      coords,
      voucherId,
      items // { presentationId, quantity }[]
    } = req.body;

    console.log(`[REDEMPTION] Intentando para Visit:${visitId} - DNI:${consumerDni}`);

    // 1. Validar campos requeridos
    if (!visitId || !consumerDni || !projectId) {
      return res.status(400).json({ message: 'Faltan campos requeridos: visitId, consumerDni, projectId' });
    }

    let voucher: any = null;
    let uploadedPhotos: string[] = [];

    // 3. Validar Visita
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: { 
        point: true,
        user: { include: { project: true } }
      }
    });

    if (!visit) {
      return res.status(404).json({ message: 'Sesión de visita no encontrada. Reinicia el punto.' });
    }

    if (voucherId) {
      // Flujo B2B2C: El ticket ya fue subido a drive y aprobado por PDV
      voucher = await prisma.voucher.findUnique({ where: { id: voucherId } });
      if (!voucher || voucher.status !== 'APPROVED') {
        return res.status(400).json({ message: 'Voucher inválido o no está en estado APROBADO.' });
      }
      uploadedPhotos = Array.isArray(voucher.photos) ? voucher.photos : [];
      console.log(`✅ Usando fotos desde Voucher: ${voucher.code}`);
    } else {
      // Flujo Directo de Staff
      // 2. Validar que haya fotos
      if (!photos || Object.keys(photos).length === 0) {
        return res.status(400).json({ message: 'Debes adjuntar al menos una foto como evidencia.' });
      }

      // 5. Subir fotos a Drive OBLIGATORIAMENTE
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
      const projectFolderName = visit.user.project?.name || 'Varios';
      const pointFolderName = visit.point.name;
      const today = new Date().toISOString().split('T')[0];

      console.log(`[DRIVE] Subiendo ${Object.keys(photos).length} foto(s) para DNI:${consumerDni}...`);

      for (const [key, base64] of Object.entries(photos)) {
        const url = await driveService.uploadImage(
          base64 as string,
          `${key}_${Date.now()}.jpg`,
          [projectFolderName, pointFolderName, today, consumerDni],
          folderId
        );
        uploadedPhotos.push(url);
        console.log(`✅ Foto subida: ${url}`);
      }

      console.log(`✅ Todas las fotos subidas a Drive (${uploadedPhotos.length})`);
    }

    // 5. Guardar canje en DB con URLs de Drive
    const redemption = await prisma.redemption.create({
      data: {
        visitId,
        projectId,
        dni: consumerDni,
        amount: purchaseAmount || 0,
        ticketNo: ticketNumber || '',
        reward: extraData?.reward || 'Promocional',
        photos: uploadedPhotos,
        extraData: extraData || {},
        voucherId: voucherId || null,
        ...(items && items.length > 0 && {
          items: {
            create: items.map((item: any) => ({
              presentationId: item.presentationId,
              quantity: item.quantity
            }))
          }
        })
      }
    });

    if (voucherId) {
      await prisma.voucher.update({ where: { id: voucherId }, data: { status: 'REDEEMED' } });
    }

    console.log(`✅ Canje guardado en DB: ${redemption.id}`);

    // 6. Descontar Inventario
    const rewardItem = extraData?.reward;
    if (rewardItem) {
      try {
        await prisma.inventory.updateMany({
          where: { userId: visit.userId, projectId, itemName: rewardItem },
          data: { stock: { decrement: 1 } }
        });
        console.log(`✅ Stock descontado para: ${rewardItem}`);
      } catch (invErr) {
        console.error('⚠️ Error descontando inventario:', invErr);
      }
    }

    // 7. Marcar Ubicación del Canje (PostGIS)
    if (coords && coords.lat && coords.lng) {
      try {
        const lat = parseFloat(coords.lat);
        const lng = parseFloat(coords.lng);
        await prisma.$executeRaw`
          UPDATE "Redemption" 
          SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326) 
          WHERE id = ${redemption.id}
        `;
        console.log(`✅ Coordenadas guardadas para canje: ${redemption.id}`);
      } catch (geoErr) {
        console.error('⚠️ Error guardando coordenadas:', geoErr);
      }
    }

    res.json({ success: true, redemptionId: redemption.id });
  } catch (error: any) {
    console.error('❌ Error en Canje:', error);
    // Si el error es de Drive, dar un mensaje claro al usuario
    if (error.message?.includes('drive') || error.message?.includes('googleapis') || error.code === 403) {
      return res.status(503).json({ 
        message: 'No se pudo subir la evidencia fotográfica a Google Drive. Verifica tu conexión a internet e inténtalo de nuevo.',
        detail: error.message 
      });
    }
    res.status(500).json({ message: 'Error interno al registrar el canje', detail: error.message });
  }
};

export const getHistory = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'Se requiere userId' });
    }

    const redemptions = await prisma.redemption.findMany({
      where: {
        visit: {
          userId: String(userId),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        visit: {
          include: {
            point: true,
          },
        },
      },
      take: 50, // Limit to recent 50 for mobile
    });

    res.json(redemptions);
  } catch (error: any) {
    console.error('❌ Error obteniendo historial:', error);
    res.status(500).json({ message: 'Error interno obteniendo historial', detail: error.message });
  }
};

export const checkDniLimit = async (req: Request, res: Response) => {
  try {
    const { dni, projectId } = req.query;
    if (!dni || !projectId) return res.status(400).json({ message: 'Faltan parámetros' });

    const project = await prisma.project.findUnique({ where: { id: projectId as string } });
    if (!project) return res.status(404).json({ message: 'Proyecto no encontrado' });

    const maxPerDni = (project.config as any)?.max_redemptions_per_dni;
    
    if (maxPerDni && maxPerDni > 0) {
      const redemptionCount = await prisma.redemption.count({
        where: { dni: dni as string, projectId: projectId as string }
      });
      if (redemptionCount >= maxPerDni) {
        return res.json({ 
          allowed: false, 
          message: `Límite alcanzado: Este DNI ya cuenta con ${redemptionCount} canjes en esta campaña y el máximo permitido es ${maxPerDni}.` 
        });
      }
    }
    
    return res.json({ allowed: true });
  } catch (err: any) {
    res.status(500).json({ message: 'Error validando DNI', detail: err.message });
  }
};
