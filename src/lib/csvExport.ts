import { getAllLabelsWithFileNames, getLabelsWithFileNameForFile } from './db';

interface LabelData {
  fileName: string;
  timestamp: number;
}

const formatTimestamp = (timestamp: number): string => {
  const minutes = Math.floor(timestamp / 60);
  const seconds = timestamp % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toFixed(3).padStart(6, '0')}`;
};

const generateCSVContent = (data: LabelData[]): string => {
  const headers = ['File Name', 'Timestamp'];
  const rows = data.map(item => [
    `"${item.fileName.replace(/"/g, '""')}"`, // Escape quotes in filenames
    formatTimestamp(item.timestamp)
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

const downloadCSV = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

export const exportAllLabelsToCSV = async (): Promise<void> => {
  try {
    const data = await getAllLabelsWithFileNames();
    if (data.length === 0) {
      alert('No labels found to export.');
      return;
    }

    const csvContent = generateCSVContent(data);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `all-labels-${timestamp}.csv`;
    
    downloadCSV(csvContent, filename);
  } catch (error) {
    console.error('Failed to export all labels:', error);
    alert('Failed to export labels. Please try again.');
  }
};

export const exportClipLabelsToCSV = async (fileId: number): Promise<void> => {
  try {
    const data = await getLabelsWithFileNameForFile(fileId);
    if (data.length === 0) {
      alert('No labels found for this clip to export.');
      return;
    }

    const csvContent = generateCSVContent(data);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const clipName = data[0]?.fileName?.replace(/[^a-zA-Z0-9]/g, '-') || 'clip';
    const filename = `${clipName}-labels-${timestamp}.csv`;
    
    downloadCSV(csvContent, filename);
  } catch (error) {
    console.error('Failed to export clip labels:', error);
    alert('Failed to export clip labels. Please try again.');
  }
}; 