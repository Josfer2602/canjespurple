import { Request, Response } from 'express';
import prisma from '../config/db';
import driveService from '../services/drive.service';

export const getActiveVisit = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    const activeVisit = await prisma.visit.findFirst({
      where: { 
        userId: userId as string, 
        endTime: null,
        isActive: true
      },
      include: { point: true }
    });

    res.json(activeVisit);
  } catch (error: any) {
    res.status(500).json({ message: 'Error checking active visit', detail: error.message });
  }
};

export const endVisit = async (req: Request, res: Response) => {
  try {
    const { visitId } = req.body;
    
    const visit = await prisma.visit.update({
      where: { id: visitId },
      data: { 
        endTime: new Date(),
        isActive: false
      }
    });

    res.json({ success: true, visit });
  } catch (error: any) {
    res.status(500).json({ message: 'Error ending visit', detail: error.message });
  }
};

export const startVisit = async (req: Request, res: Response) => {
  try {
    const { userId, pointId, facadePhoto, coords } = req.body;

    console.log(`[START_VISIT] Intentando iniciar para User:${userId} en Point:${pointId}`);

    // Check for active visit
    const activeVisit = await prisma.visit.findFirst({
      where: { userId, endTime: null, isActive: true }
    });

    if (activeVisit) {
      return res.status(400).json({ message: 'Ya tienes una visita activa. Ciérrala antes de abrir una nueva.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { project: true } });
    const point = await prisma.point.findUnique({ where: { id: pointId } });

    if (!user) {
      console.warn('⚠️ Usuario no encontrado en la DB');
      return res.status(404).json({ message: 'Usuario no válido. ¿Hiciste login real?' });
    }
    if (!point) {
      console.warn('⚠️ Punto no encontrado en la DB');
      return res.status(404).json({ message: 'Punto de venta no válido.' });
    }

    // Subir foto de fachada a Drive con nueva estructura
    console.log('🔄 Subiendo foto a Google Drive...');
    const driveRootId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
    const today = new Date().toISOString().split('T')[0];
    const altaFolder = 'Alta';
    
    let photoUrl = '';
    try {
      photoUrl = await driveService.uploadImage(
        facadePhoto,
        `${today}_Alta.jpg`,
        [user.project!.name, point.name, today, altaFolder],
        driveRootId
      );
      console.log('✅ Foto subida con éxito:', photoUrl);
    } catch (driveErr: any) {
      console.error('❌ Error fatal en Google Drive:', driveErr.message);
      return res.status(500).json({ 
        message: 'Error en Google Drive. Verifica que compartiste la carpeta con el email de la Service Account como EDITOR.',
        detail: driveErr.message 
      });
    }

    // Crear la Visita
    const visit = await prisma.visit.create({
      data: {
        userId,
        pointId,
        facadePhoto: photoUrl,
        isActive: true
      }
    });

    // Actualizar ubicación PostGIS
    if (coords) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Visit" SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326) WHERE id = $3`,
        coords.lng, coords.lat, visit.id
      );
    }

    res.json({ success: true, visitId: visit.id });
  } catch (error: any) {
    console.error('❌ Error interno en startVisit:', error);
    res.status(500).json({ message: 'Error interno del servidor', detail: error.message });
  }
};
