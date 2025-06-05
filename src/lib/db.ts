import Dexie, { type Table } from 'dexie';
import type { Label } from '@/lib/types';

export interface StoredFile {
  id?: number; // Auto-incremented primary key
  name: string;
  lastModified: number;
  size: number;
  type: string;
  data: Blob; // Store the actual file data as a Blob
}

export interface StoredLabel extends Label {
  fileId: number;
}

interface AudioLabelDB extends Dexie {
  files: Table<StoredFile, number>;
  labels: Table<StoredLabel, string>;
}

export const db = new Dexie('AudioLabelDB') as AudioLabelDB;

db.version(1).stores({
  files: '++id, name',
  labels: 'id, fileId, timestamp'
});

export const addFileToDB = async (file: File): Promise<StoredFile | null> => {
  try {
    // Check if a file with the same name already exists
    const existingFile = await db.files.where('name').equals(file.name).first();
    if (existingFile) {
      console.log(`File "${file.name}" already exists in the database. Skipping.`);
      return existingFile;
    }

    const storedFile: Omit<StoredFile, 'id'> = {
      name: file.name,
      lastModified: file.lastModified,
      size: file.size,
      type: file.type,
      data: file, // Dexie can store File objects directly as they are Blobs
    };
    const id = await db.files.add(storedFile as StoredFile);
    return { ...storedFile, id };
  } catch (error) {
    console.error("Failed to add file to DB:", error);
    return null;
  }
};

export const addFilesToDB = async (files: File[]): Promise<StoredFile[]> => {
  const addedFiles: StoredFile[] = [];
  for (const file of files) {
    const storedFile = await addFileToDB(file);
    if (storedFile) {
      addedFiles.push(storedFile);
    }
  }
  return addedFiles;
};

export const getAllFilesFromDB = async (): Promise<StoredFile[]> => {
  try {
    const storedFiles = await db.files.toArray();
    // No mapping needed if StoredFile directly contains the blob
    // The File object can be reconstructed in the app logic when needed for the player
    return storedFiles;
  } catch (error) {
    console.error("Failed to retrieve files from DB:", error);
    return [];
  }
};

export const getLabelsForFile = async (fileId: number): Promise<StoredLabel[]> => {
  try {
    return await db.labels.where('fileId').equals(fileId).sortBy('timestamp');
  } catch (error) {
    console.error(`Failed to retrieve labels for fileId ${fileId}:`, error);
    return [];
  }
};

export const addLabelToDB = async (label: StoredLabel): Promise<string | undefined> => {
  try {
    return await db.labels.add(label);
  } catch (error) {
    console.error("Failed to add label to DB:", error);
  }
};

export const deleteLabelFromDB = async (labelId: string): Promise<void> => {
  try {
    await db.labels.delete(labelId);
  } catch (error) {
    console.error(`Failed to delete label with id ${labelId}:`, error);
  }
}; 