import { create } from 'zustand';
import { db, getLabelsForFile, addLabelToDB, deleteLabelFromDB, addFilesToDB, type StoredFile, type StoredLabel } from '@/lib/db';

interface SessionState {
  files: StoredFile[];
  activeFileId: number | null;
  labels: StoredLabel[];
  isLoading: boolean;
  
  loadFilesFromDB: () => Promise<void>;
  addFiles: (newFiles: File[]) => Promise<void>;
  setActiveFileId: (fileId: number | null) => Promise<void>;
  
  addLabel: (timestamp: number) => Promise<void>;
  deleteLabel: (labelId: string) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  files: [],
  activeFileId: null,
  labels: [],
  isLoading: true,

  loadFilesFromDB: async () => {
    set({ isLoading: true });
    const files = await db.files.toArray();
    set({ files, isLoading: false });
    if (files.length > 0 && get().activeFileId === null) {
      get().setActiveFileId(files[0].id!);
    }
  },

  addFiles: async (newFiles: File[]) => {
    const { files: existingFiles } = get();
    const uniqueNewFiles = newFiles.filter(nf => !existingFiles.some(pf => pf.name === nf.name));

    if (uniqueNewFiles.length === 0) return;

    const addedFiles = await addFilesToDB(uniqueNewFiles);
    
    // We only take the genuinely new files from the DB result, in case some were duplicates
    const trulyNewFiles = addedFiles.filter(af => !existingFiles.some(ef => ef.id === af.id));

    if (trulyNewFiles.length > 0) {
      set(state => ({ files: [...state.files, ...trulyNewFiles] }));

      // If no file was previously active, or to focus the new uploads, set active file.
      if (get().activeFileId === null || existingFiles.length === 0) {
        get().setActiveFileId(trulyNewFiles[0].id!);
      }
    }
  },

  setActiveFileId: async (fileId) => {
    if (fileId === get().activeFileId) return;

    if (fileId === null) {
      set({ activeFileId: null, labels: [] });
      return;
    }
    
    set({ activeFileId: fileId, isLoading: true });
    const labels = await getLabelsForFile(fileId);
    set({ labels, isLoading: false });
  },

  addLabel: async (timestamp) => {
    const { activeFileId, labels } = get();
    if (!activeFileId) return;

    const newLabel: StoredLabel = {
      id: `${Date.now()}-${Math.random()}`, // Still need a unique string ID for the frontend
      fileId: activeFileId,
      timestamp,
    };

    await addLabelToDB(newLabel);
    
    const newLabels = [...labels, newLabel].sort((a, b) => a.timestamp - b.timestamp);
    set({ labels: newLabels });
  },

  deleteLabel: async (labelId) => {
    const { labels } = get();
    await deleteLabelFromDB(labelId);
    set({ labels: labels.filter(label => label.id !== labelId) });
  },
})); 