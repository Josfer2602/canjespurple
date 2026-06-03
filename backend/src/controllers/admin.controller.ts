import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/db';

// 1. Reset System Data ( transactional cleanup )
export const resetData = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    // Wiping transactional data for the project
    // Note: We don't delete Users or the Project itself to maintain auth access
    await prisma.redemption.deleteMany({ where: { projectId } });
    await prisma.visit.deleteMany({ where: { point: { projectId } } });
    await prisma.dniHistory.deleteMany({ where: { projectId } });
    await prisma.inventory.deleteMany({ where: { projectId } });
    // Optional: Delete points if starting a completely new physical layout
    // await prisma.point.deleteMany({ where: { projectId } });

    res.json({ success: true, message: 'Data cleared successfully. Transactional history wiped.' });
  } catch (error: any) {
    console.error('Reset error:', error);
    res.status(500).json({ message: 'Error performing system reset', detail: error.message });
  }
};

// 2. Manage Staff (Field Workers)
export const getStaff = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const staff = await prisma.user.findMany({
      where: { 
        projectId: projectId as string
      },
      select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true }
    });
    res.json(staff);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching staff', detail: error.message });
  }
};

// 2.1 Assign Stock to Staff
export const assignStock = async (req: Request, res: Response) => {
  try {
    const { userId, projectId, itemName, stockToAdd, threshold } = req.body;
    
    if (!userId || !projectId || !itemName) {
      return res.status(400).json({ message: 'UserId, ProjectId e ItemName son obligatorios' });
    }

    const inventory = await prisma.$transaction(async (tx) => {
      // Buscamos si ya existe el registro (activo o inactivo) para este canjista y producto
      const existing = await tx.inventory.findFirst({
        where: { userId, projectId, itemName }
      });

      const updated = await tx.inventory.upsert({
        where: { 
          id: existing?.id || '00000000-0000-0000-0000-000000000000'
        },
        update: {
          stock: { increment: stockToAdd },
          threshold: threshold || 5,
          isActive: true // Reactivamos si estaba desactivado
        },
        create: {
          userId,
          projectId,
          itemName,
          stock: stockToAdd,
          threshold: threshold || 5,
          isActive: true
        }
      });

      // Crear el registro audit de stock
      await tx.inventoryLog.create({
        data: {
          inventoryId: updated.id,
          addedStock: stockToAdd,
          previousStock: existing ? existing.stock : 0,
          newStock: existing ? existing.stock + stockToAdd : stockToAdd,
          projectId
        }
      });

      return updated;
    });

    res.json({ success: true, inventory });
  } catch (error: any) {
    console.error('Error assigning stock:', error);
    res.status(500).json({ message: 'Error assigning stock', detail: error.message });
  }
};

export const getInventoryLogs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // inventoryId
    const logs = await prisma.inventoryLog.findMany({
      where: { inventoryId: id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching inventory logs', detail: error.message });
  }
};

// 2.2 Redemption Rules (Lineamientos)
export const getRules = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const rules = await prisma.redemptionRule.findMany({
      where: { projectId: projectId as string },
      orderBy: { minPurchase: 'asc' }
    });
    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching rules', detail: error.message });
  }
};

export const saveRule = async (req: Request, res: Response) => {
  try {
    const { id, projectId, minPurchase, maxPurchase, rewardName, type, productCriteria } = req.body;
    
    if (id) {
      const rule = await prisma.redemptionRule.update({
        where: { id },
        data: { minPurchase, maxPurchase, rewardName, type: type || 'BY_AMOUNT', productCriteria: productCriteria || {} }
      });
      return res.json({ success: true, rule });
    }

    const rule = await prisma.redemptionRule.create({
      data: { projectId, minPurchase, maxPurchase, rewardName, type: type || 'BY_AMOUNT', productCriteria: productCriteria || {} }
    });
    res.json({ success: true, rule });
  } catch (error: any) {
    res.status(500).json({ message: 'Error saving rule', detail: error.message });
  }
};

export const createStaff = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, projectId, role } = req.body;
    
    // Validate project existence
    if (projectId) {
      const projectExists = await prisma.project.findUnique({ where: { id: projectId } });
      if (!projectExists) {
        return res.status(400).json({ message: 'El proyecto seleccionado no existe. Por favor, selecciona un proyecto válido.' });
      }
    }

    const passwordHash = await bcrypt.hash(password || 'staff123', 10);
    
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        projectId: projectId || null,
        role: role || 'STAFF'
      }
    });

    res.json({ success: true, user: { id: user.id, email: user.email, fullName: user.fullName } });
  } catch (error: any) {
    console.error('Error creating staff:', error);
    res.status(500).json({ message: 'Error creando staff', detail: error.message });
  }
};

// 3. Manage Points
export const getPoints = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const points = await prisma.point.findMany({
      where: { projectId: projectId as string },
      orderBy: { name: 'asc' }
    });
    res.json(points);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching points', detail: error.message });
  }
};

export const createPoint = async (req: Request, res: Response) => {
  try {
    const { name, address, projectId, ownerName, phone, marketId } = req.body;
    const point = await prisma.point.create({
      data: { name, address, projectId, ownerName, phone, marketId: marketId || null }
    });
    res.json({ success: true, point });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating point', detail: error.message });
  }
};

// 3.5 Markets CRUD
export const getMarkets = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const markets = await prisma.market.findMany({
      where: { projectId: projectId as string },
      include: { points: { select: { id: true, name: true, ownerName: true, phone: true, userId: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(markets);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching markets', detail: error.message });
  }
};

export const createMarket = async (req: Request, res: Response) => {
  try {
    const { name, number, address, projectId } = req.body;
    
    // Generar código automático si no se envía
    const generatedNumber = number || `MK-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const market = await prisma.market.create({
      data: { name, number: generatedNumber, address, projectId }
    });
    res.json({ success: true, market });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating market', detail: error.message });
  }
};

export const deleteMarket = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Primero desligar PDVs del mercado
    await prisma.point.updateMany({ where: { marketId: id }, data: { marketId: null } });
    await prisma.market.delete({ where: { id } });
    res.json({ success: true, message: 'Mercado eliminado' });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar mercado', detail: err.message });
  }
};

export const generatePdvAccess = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Point ID
    const point = await prisma.point.findUnique({ where: { id } });
    if (!point) return res.status(404).json({ message: 'Punto no encontrado' });

    // Si ya tiene usuario asignado, no hacemos nada o lo retornamos
    if (point.userId) {
      return res.status(400).json({ message: 'Este punto ya tiene un acceso generado. No se puede crear múltiples cuentas para el mismo punto.' });
    }

    // Generar credenciales: El email será un DNI ficticio o el telefono@pdv.com, o pdv_[id]@domain.com.
    // Usaremos pdv_[shortid]@btl.com
    const shortId = point.id.substring(0, 6);
    const email = `pdv_${shortId}@canjes.com`;
    const plainPassword = Math.random().toString(36).substring(2, 8).toUpperCase();
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const pdvUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: point.ownerName || point.name,
        projectId: point.projectId,
        role: 'PDV'
      }
    });

    const updatedPoint = await prisma.point.update({
      where: { id: point.id },
      data: { userId: pdvUser.id }
    });

    res.json({ 
      success: true, 
      point: updatedPoint, 
      credentials: { email, password: plainPassword } 
    });
  } catch (err: any) {
    console.error('Error generando acceso PDV', err);
    res.status(500).json({ message: 'Error generando credenciales', detail: err.message });
  }
};

// 4. Update Project Config
export const updateProjectConfig = async (req: Request, res: Response) => {
  try {
    const { projectId, name, clientName, logoUrl, config } = req.body;
    
    const project = await prisma.project.update({
      where: { id: projectId },
      data: { 
        name, 
        clientName,
        logoUrl: logoUrl || null,
        config: config || {} 
      }
    });

    res.json({ success: true, project });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating project config', detail: error.message });
  }
};

export const getProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id }
    });
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching project', detail: error.message });
  }
};

// 5. Master Project List & Creation
export const getProjects = async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching projects', detail: error.message });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const { name, clientName } = req.body;
    
    const project = await prisma.project.create({
      data: {
        name,
        clientName,
        config: {
          photo_slots: [
            { label: 'Foto Boleta', key: 'ticket', required: true },
            { label: 'Foto Producto', key: 'product', required: true }
          ],
          extra_fields: []
        }
      }
    });

    res.json({ success: true, project });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating project', detail: error.message });
  }
};

export const getInventory = async (req: Request, res: Response) => {
  try {
    const { projectId, userId } = req.query;
    const whereClause: any = { 
      projectId: projectId as string,
      isActive: true 
    };
    
    if (userId) {
      whereClause.userId = userId as string;
    }

    const inventory = await prisma.inventory.findMany({
      where: whereClause,
      include: {
        user: {
          select: { fullName: true, email: true }
        }
      },
      orderBy: { itemName: 'asc' }
    });
    res.json(inventory);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching inventory', detail: error.message });
  }
};

// 11. Delete Project & Data
export const deleteProject = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.$transaction(async (tx) => {
      // Deletion order matters for FK constraints
      // 1. Vouchers primero (nueva tabla B2B2C)
      await tx.voucher.deleteMany({ where: { projectId: id } });
      // 2. Redemptions
      await tx.redemption.deleteMany({ where: { projectId: id } });
      // 3. Visits
      await tx.visit.deleteMany({ 
        where: { 
          OR: [
            { user: { projectId: id } },
            { point: { projectId: id } }
          ]
        } 
      });
      // 4. Resto
      await tx.dniHistory.deleteMany({ where: { projectId: id } });
      await tx.inventoryLog.deleteMany({ where: { inventory: { projectId: id } } });
      await tx.inventory.deleteMany({ where: { projectId: id } });
      await tx.redemptionRule.deleteMany({ where: { projectId: id } });
      // 5. Desligar userId de Points y limpiar marketId
      await tx.point.updateMany({ where: { projectId: id }, data: { userId: null, marketId: null } });
      await tx.user.deleteMany({ where: { projectId: id, role: { not: 'ADMIN' } } });
      await tx.point.deleteMany({ where: { projectId: id } });
      // 6. Mercados
      await tx.market.deleteMany({ where: { projectId: id } });
      // 7. Proyecto
      await tx.project.delete({ where: { id } });
    });
    res.json({ success: true, message: 'Proyecto y toda su data eliminados con éxito' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar proyecto', detail: err.message });
  }
};

// 12. Management Deletions
export const deleteStaff = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: 'Personal eliminado' });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar personal', detail: err.message });
  }
};

export const deletePoint = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // 1. Borrar vouchers del punto (B2B2C)
    await prisma.voucher.deleteMany({ where: { pointId: id } });
    // 2. Borrar redemptions de las visitas de este punto
    const visits = await prisma.visit.findMany({ where: { pointId: id }, select: { id: true } });
    const visitIds = visits.map((v: any) => v.id);
    if (visitIds.length) {
      await prisma.redemption.deleteMany({ where: { visitId: { in: visitIds } } });
    }
    // 3. Borrar visitas
    await prisma.visit.deleteMany({ where: { pointId: id } });
    // 4. Desligar usuario y mercado
    await prisma.point.update({ where: { id }, data: { userId: null, marketId: null } });
    // 5. Borrar el punto
    await prisma.point.delete({ where: { id } });
    res.json({ success: true, message: 'Punto eliminado' });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar punto', detail: err.message });
  }
};

export const updatePoint = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { marketId } = req.body;
  try {
    const point = await prisma.point.update({
      where: { id },
      data: { marketId: marketId || null }
    });
    res.json({ success: true, point });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al actualizar punto', detail: err.message });
  }
};

export const deleteRule = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.redemptionRule.delete({ where: { id } });
    res.json({ success: true, message: 'Regla eliminada' });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar regla', detail: err.message });
  }
};

export const deactivateInventory = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.inventory.update({
      where: { id },
      data: { isActive: false }
    });
    res.json({ success: true, message: 'Producto desactivado con éxito' });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al desactivar producto', detail: err.message });
  }
};

// 13. Redemptions (Admin)
export const getAdminRedemptions = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const redemptions = await prisma.redemption.findMany({
      where: { projectId: projectId as string },
      orderBy: { createdAt: 'desc' },
      include: {
        visit: {
          include: {
            user: { select: { fullName: true, email: true } },
            point: { select: { name: true } }
          }
        }
      }
    });
    res.json(redemptions);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching redemptions', detail: error.message });
  }
};

export const updateRedemption = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, ticketNo, reward, extraData } = req.body;
  try {
    // Si quisieras cambiar el stock al editar el 'reward', la lógica iría aquí. 
    // Por simplicidad, este editor permite corregir errores de tipeo.
    const updated = await prisma.redemption.update({
      where: { id },
      data: {
        amount,
        ticketNo,
        reward,
        extraData
      }
    });
    res.json({ success: true, redemption: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al editar canje', detail: error.message });
  }
};

export const deleteRedemption = async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log(`[DELETE] Request for ID: ${id}`);
  try {
    const redemption = await prisma.redemption.findUnique({
      where: { id },
      include: { visit: true }
    });

    if (!redemption) {
      console.warn(`[DELETE] Item not found: ${id}`);
      return res.status(404).json({ message: 'Canje no encontrado' });
    }

    console.log(`[DELETE] Found redemption for DNI: ${redemption.dni}`);

    // Devolver stock si era un premio y no uno "Promocional" estático
    if (redemption.reward && redemption.reward !== 'Promocional' && redemption.projectId) {
       console.log(`[DELETE] Restoring stock for: ${redemption.reward}`);
       await prisma.inventory.updateMany({
         where: {
           userId: redemption.visit.userId,
           projectId: redemption.projectId,
           itemName: redemption.reward
         },
         data: {
           stock: { increment: 1 }
         }
       });
       console.log(`[DELETE] Stock restored successfully.`);
    }

    console.log(`[DELETE] Removing record from database...`);
    await prisma.redemption.delete({ where: { id } });
    console.log(`[DELETE] Database record removed.`);

    res.json({ success: true, message: 'Canje eliminado y stock restaurado' });
  } catch (error: any) {
    console.error('[DELETE ERROR]:', error);
    res.status(500).json({ error: 'Error al borrar canje', detail: error.message });
  }
};

// 14. Visits (Admin Check-Ins)
export const getAdminVisits = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    
    // We only fetch visits where the user making the visit belongs to the projectId 
    // or the point belongs to it. Since user.projectId maps mostly, let's filter by user project
    // or point project. The safest is getting by point.projectId or user.projectId.
    // In our schema, point has projectId.
    const visits = await prisma.visit.findMany({
      where: {
        point: {
          projectId: projectId as string
        }
      },
      include: {
        user: { select: { fullName: true } },
        point: { select: { name: true } },
        redemptions: { select: { reward: true } }
      },
      orderBy: { startTime: 'desc' }
    });

    res.json(visits);
  } catch (error: any) {
    console.error('Error fetching admin visits:', error);
    res.status(500).json({ message: 'Error fetching visits', detail: error.message });
  }
};
