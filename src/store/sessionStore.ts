import { create } from 'zustand';
import { db, getLabelsForFile, addLabelToDB, deleteLabelFromDB, addFilesToDB, deleteFileFromDB, resetAllData, addTagToFile, removeTagFromFile, getFileById, type StoredFile, type StoredLabel } from '@/lib/db';

interface SessionState {
  files: StoredFile[];
  activeFileId: number | null;
  labels: StoredLabel[];
  currentFileTags: string[];
  isLoading: boolean;
  
  loadFilesFromDB: () => Promise<void>;
  addFiles: (newFiles: File[]) => Promise<void>;
  setActiveFileId: (fileId: number | null) => Promise<void>;
  
  addLabel: (timestamp: number) => Promise<void>;
  deleteLabel: (labelId: string) => Promise<void>;
  
  addTag: (tag: string) => Promise<void>;
  removeTag: (tag: string) => Promise<void>;
  
  removeFile: (fileId: number) => Promise<void>;
  resetAllData: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  files: [],
  activeFileId: null,
  labels: [],
  currentFileTags: [],
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

      // Always switch to the first newly uploaded file
      get().setActiveFileId(trulyNewFiles[0].id!);
    }
  },

  setActiveFileId: async (fileId) => {
    if (fileId === get().activeFileId) return;

    if (fileId === null) {
      set({ activeFileId: null, labels: [], currentFileTags: [] });
      return;
    }
    
    set({ activeFileId: fileId, isLoading: true });
    const [labels, file] = await Promise.all([
      getLabelsForFile(fileId),
      getFileById(fileId)
    ]);
    set({ labels, currentFileTags: file?.tags || [], isLoading: false });
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

  addTag: async (tag: string) => {
    const { activeFileId } = get();
    if (!activeFileId) return;

    await addTagToFile(activeFileId, tag);
    set(state => ({ currentFileTags: [...state.currentFileTags, tag] }));
  },

  removeTag: async (tag: string) => {
    const { activeFileId } = get();
    if (!activeFileId) return;
    
    await removeTagFromFile(activeFileId, tag);
    set(state => ({ currentFileTags: state.currentFileTags.filter(t => t !== tag) }));
  },

  removeFile: async (fileId) => {
    const { files, activeFileId } = get();
    
    try {
      await deleteFileFromDB(fileId);
      
      const updatedFiles = files.filter(file => file.id !== fileId);
      set({ files: updatedFiles });
      
      // If the deleted file was the active file, switch to another file or clear
      if (activeFileId === fileId) {
        if (updatedFiles.length > 0) {
          // Set the first available file as active
          get().setActiveFileId(updatedFiles[0].id!);
        } else {
          // No files left, clear everything
          set({ activeFileId: null, labels: [], currentFileTags: [] });
        }
      }
    } catch (error) {
      console.error('Failed to remove file:', error);
      throw error;
    }
  },

  resetAllData: async () => {
    try {
      await resetAllData();
      set({ files: [], activeFileId: null, labels: [], currentFileTags: [], isLoading: false });
    } catch (error) {
      console.error('Failed to reset all data:', error);
      throw error;
    }
  },
})); 