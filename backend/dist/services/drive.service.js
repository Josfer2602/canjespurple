"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const googleapis_1 = require("googleapis");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const stream_1 = require("stream");
class DriveService {
    drive;
    constructor() {
        this.init();
    }
    init() {
        try {
            const KEY_FILE_PATH = path_1.default.join(process.cwd(), 'service-account.json');
            if (!fs_1.default.existsSync(KEY_FILE_PATH)) {
                console.error('❌ service-account.json no encontrado');
                return;
            }
            const credentials = JSON.parse(fs_1.default.readFileSync(KEY_FILE_PATH, 'utf8'));
            let pk = credentials.private_key;
            if (pk) {
                pk = pk.replace(/\\n/gm, '\n');
                pk = pk.trim();
            }
            const auth = new googleapis_1.google.auth.JWT(credentials.client_email, undefined, pk, ['https://www.googleapis.com/auth/drive']);
            this.drive = googleapis_1.google.drive({ version: 'v3', auth });
            console.log('✅ Drive Service (JWT Mode) Inicializado para:', credentials.client_email);
        }
        catch (err) {
            console.error('❌ Error fatal inicializando Drive Service:', err);
        }
    }
    async uploadImage(base64Image, fileName, folders, // [Project, Point, Redemption]
    parentFolderId) {
        try {
            const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const stream = new stream_1.Readable();
            stream.push(buffer);
            stream.push(null);
            // Usamos flags globales para Workspace/Drives Compartidos
            const driveFlags = {
                supportsAllDrives: true,
                supportsTeamDrives: true
            };
            // 1. Navegar/Crear Jerarquía (Iterativo sobre array de folders)
            let currentParentId = parentFolderId;
            for (const folderName of folders) {
                let folderId = await this.findFolder(folderName, currentParentId);
                if (!folderId) {
                    folderId = await this.createFolder(folderName, currentParentId);
                }
                currentParentId = folderId;
            }
            // 2. Subir archivo en el último nivel alcanzado
            const response = await this.drive.files.create({
                requestBody: {
                    name: fileName,
                    parents: [currentParentId],
                    mimeType: 'image/jpeg'
                },
                media: {
                    mimeType: 'image/jpeg',
                    body: stream
                },
                fields: 'id, webViewLink',
                ...driveFlags
            });
            return response.data.webViewLink || '';
        }
        catch (error) {
            console.error('Error en uploadImage Drive:', error.message);
            throw error;
        }
    }
    async findFolder(name, parentId) {
        const res = await this.drive.files.list({
            q: `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id)',
            spaces: 'drive',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        });
        return res.data.files && res.data.files.length > 0 ? res.data.files[0].id : null;
    }
    async createFolder(name, parentId) {
        const res = await this.drive.files.create({
            requestBody: {
                name: name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId]
            },
            fields: 'id',
            supportsAllDrives: true,
            supportsTeamDrives: true
        });
        return res.data.id;
    }
}
exports.default = new DriveService();
