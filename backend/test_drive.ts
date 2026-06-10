import driveService from './src/services/drive.service';

async function testDrive() {
  const fileId = await driveService.uploadImage(
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCABQAFADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAaEAACAwEBAAAAAAAAAAAAAAAAAwECBAUG/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL8AABqAAAAAAAANQAAAAAAAAAAAAAAAAA//2Q==',
    'test_image.jpg',
    ['Test'],
    process.env.GOOGLE_DRIVE_FOLDER_ID!
  );
  
  console.log("Uploaded File URL:", fileId);
  const idMatch = fileId.match(/id=([^&]+)/);
  if (idMatch) {
    const id = idMatch[1];
    console.log("Extracted ID:", id);
    try {
      const stream = await driveService.getFileStream(id);
      console.log("Stream successfully retrieved!");
    } catch (err: any) {
      console.error("Failed to get stream:", err.message);
    }
  }
}

import dotenv from 'dotenv';
dotenv.config();

testDrive().catch(console.error);
