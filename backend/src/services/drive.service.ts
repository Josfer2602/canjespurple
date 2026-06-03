import { google, drive_v3 } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';

class DriveService {
  private drive!: drive_v3.Drive;

  constructor() {
    this.init();
  }

  private init() {
    try {
      const KEY_FILE_PATH = path.join(process.cwd(), 'service-account.json');
      
      if (!fs.existsSync(KEY_FILE_PATH)) {
        console.error('❌ service-account.json no encontrado');
        return;
      }

      const credentials = JSON.parse(fs.readFileSync(KEY_FILE_PATH, 'utf8'));
      
      let pk = credentials.private_key;
      if (pk) {
        pk = pk.replace(/\\n/gm, '\n');
        pk = pk.trim();
      }

      const auth = new google.auth.JWT(
        credentials.client_email,
        undefined,
        pk,
        ['https://www.googleapis.com/auth/drive']
      );

      this.drive = google.drive({ version: 'v3', auth });
      console.log('✅ Drive Service (JWT Mode) Inicializado para:', credentials.client_email);
    } catch (err) {
      console.error('❌ Error fatal inicializando Drive Service:', err);
    }
  }

  async uploadImage(
    base64Image: string,
    fileName: string,
    folders: string[], // [Project, Point, Redemption]
    parentFolderId: string
  ): Promise<string> {
    try {
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const stream = new Readable();
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
        fields: 'id, webViewLink, webContentLink',
        ...driveFlags
      });

      const fileId = response.data.id;
      return fileId ? `https://drive.google.com/uc?export=view&id=${fileId}` : '';
    } catch (error: any) {
      console.error('Error en uploadImage Drive:', error.message);
      throw error;
    }
  }

  private async findFolder(name: string, parentId: string): Promise<string | null> {
    const res = await this.drive.files.list({
      q: `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    return res.data.files && res.data.files.length > 0 ? res.data.files[0].id! : null;
  }

  private async createFolder(name: string, parentId: string): Promise<string> {
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
    return res.data.id!;
  }

  async getFileStream(fileId: string): Promise<Readable> {
    try {
      const res = await this.drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream' }
      );
      return res.data as any;
    } catch (error: any) {
      console.error('Error obteniendo stream de Drive:', error.message);
      throw error;
    }
  }
}

export default new DriveService();
