"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importRules = exports.importInventory = exports.importPoints = void 0;
const db_1 = __importDefault(require("../config/db"));
// 1. Importar Mercados y PDVs
const importPoints = async (req, res) => {
    try {
        const { projectId, data } = req.body;
        if (!projectId || !data || !Array.isArray(data)) {
            return res.status(400).json({ message: 'Se requiere projectId y un array de datos (data)' });
        }
        let createdMarkets = 0;
        let createdPoints = 0;
        await db_1.default.$transaction(async (tx) => {
            for (const row of data) {
                const { Mercado, Direccion_Mercado, PDV, Direccion_PDV, Nombre_Dueno, Telefono } = row;
                if (!Mercado)
                    continue; // Mercado es obligatorio para la agrupación
                // Buscar o crear mercado
                let market = await tx.market.findFirst({
                    where: { name: String(Mercado), projectId }
                });
                if (!market) {
                    const generatedNumber = `MK-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                    market = await tx.market.create({
                        data: {
                            name: String(Mercado),
                            address: Direccion_Mercado ? String(Direccion_Mercado) : null,
                            number: generatedNumber,
                            projectId
                        }
                    });
                    createdMarkets++;
                }
                // Crear PDV si viene definido
                if (PDV) {
                    // Verificar si ya existe en este mercado
                    let point = await tx.point.findFirst({
                        where: { name: String(PDV), marketId: market.id, projectId }
                    });
                    if (!point) {
                        await tx.point.create({
                            data: {
                                name: String(PDV),
                                address: Direccion_PDV ? String(Direccion_PDV) : null,
                                ownerName: Nombre_Dueno ? String(Nombre_Dueno) : null,
                                phone: Telefono ? String(Telefono) : null,
                                marketId: market.id,
                                projectId
                            }
                        });
                        createdPoints++;
                    }
                }
            }
        });
        res.json({ success: true, message: `Se importaron ${createdMarkets} mercados y ${createdPoints} PDVs.` });
    }
    catch (error) {
        console.error('Error en importPoints:', error);
        res.status(500).json({ message: 'Error importando mercados y PDVs', detail: error.message });
    }
};
exports.importPoints = importPoints;
// 2. Importar Inventario
const importInventory = async (req, res) => {
    try {
        const { projectId, data } = req.body;
        if (!projectId || !data || !Array.isArray(data)) {
            return res.status(400).json({ message: 'Se requiere projectId y un array de datos (data)' });
        }
        let importedItems = 0;
        let errors = [];
        await db_1.default.$transaction(async (tx) => {
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                const { Producto, Cantidad, Alerta_Minima, Mercado_Destino, PDV_Destino } = row;
                if (!Producto || !Cantidad) {
                    errors.push(`Fila ${i + 2}: Faltan datos (Producto o Cantidad)`);
                    continue;
                }
                let marketId = null;
                let pointId = null;
                if (PDV_Destino) {
                    const point = await tx.point.findFirst({
                        where: { name: String(PDV_Destino), projectId }
                    });
                    if (point)
                        pointId = point.id;
                    else {
                        errors.push(`Fila ${i + 2}: PDV '${PDV_Destino}' no encontrado.`);
                        continue;
                    }
                }
                else if (Mercado_Destino) {
                    const market = await tx.market.findFirst({
                        where: { name: String(Mercado_Destino), projectId }
                    });
                    if (market)
                        marketId = market.id;
                    else {
                        errors.push(`Fila ${i + 2}: Mercado '${Mercado_Destino}' no encontrado.`);
                        continue;
                    }
                }
                else {
                    errors.push(`Fila ${i + 2}: Debes especificar un Mercado o PDV de destino.`);
                    continue;
                }
                const stockToAdd = parseInt(Cantidad, 10);
                const threshold = Alerta_Minima ? parseInt(Alerta_Minima, 10) : 5;
                const whereExisting = { projectId, itemName: String(Producto) };
                if (marketId)
                    whereExisting.marketId = marketId;
                if (pointId)
                    whereExisting.pointId = pointId;
                const existing = await tx.inventory.findFirst({ where: whereExisting });
                const updated = await tx.inventory.upsert({
                    where: { id: existing?.id || '00000000-0000-0000-0000-000000000000' },
                    update: {
                        stock: { increment: stockToAdd },
                        threshold: threshold,
                        isActive: true
                    },
                    create: {
                        marketId,
                        pointId,
                        projectId,
                        itemName: String(Producto),
                        stock: stockToAdd,
                        threshold: threshold,
                        isActive: true
                    }
                });
                await tx.inventoryLog.create({
                    data: {
                        inventoryId: updated.id,
                        addedStock: stockToAdd,
                        previousStock: existing ? existing.stock : 0,
                        newStock: existing ? existing.stock + stockToAdd : stockToAdd,
                        projectId
                    }
                });
                importedItems++;
            }
        });
        res.json({ success: true, message: `Se cargaron ${importedItems} registros de inventario.`, errors });
    }
    catch (error) {
        console.error('Error en importInventory:', error);
        res.status(500).json({ message: 'Error importando inventario', detail: error.message });
    }
};
exports.importInventory = importInventory;
// 3. Importar Lineamientos (Reglas)
const importRules = async (req, res) => {
    try {
        const { projectId, data } = req.body;
        if (!projectId || !data || !Array.isArray(data)) {
            return res.status(400).json({ message: 'Se requiere projectId y un array de datos (data)' });
        }
        let createdRules = 0;
        await db_1.default.$transaction(async (tx) => {
            for (const row of data) {
                const { Premio, Monto_Minimo, Monto_Maximo, Tipo_Regla } = row;
                if (!Premio || Monto_Minimo === undefined || Monto_Maximo === undefined)
                    continue;
                await tx.redemptionRule.create({
                    data: {
                        projectId,
                        rewardName: String(Premio),
                        minPurchase: parseFloat(Monto_Minimo),
                        maxPurchase: parseFloat(Monto_Maximo),
                        type: Tipo_Regla === 'Producto' ? 'BY_PRODUCTS' : 'BY_AMOUNT'
                    }
                });
                createdRules++;
            }
        });
        res.json({ success: true, message: `Se importaron ${createdRules} lineamientos.` });
    }
    catch (error) {
        console.error('Error en importRules:', error);
        res.status(500).json({ message: 'Error importando lineamientos', detail: error.message });
    }
};
exports.importRules = importRules;
