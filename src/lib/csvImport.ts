import { db, addLabelToDB, addTagToFile, type StoredLabel } from './db';

interface ImportedLabelData {
  fileName: string;
  timestamp: number;
  tags: string[];
}

export interface ImportResult {
  processedRows: number;
  skippedFiles: string[];
  addedLabels: number;
  addedTags: number;
  errors: string[];
}

const parseTimestamp = (timeStr: string): number => {
  const [minutes, seconds] = timeStr.split(':');
  return parseInt(minutes) * 60 + parseFloat(seconds);
};

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"' && nextChar === '"') {
      // Escaped quote
      current += '"';
      i++; // Skip next quote
    } else if (char === '"') {
      // Toggle quote state
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  return result;
};

const parseCSVContent = (content: string): ImportedLabelData[] => {
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }
  
  // Skip header line
  const dataLines = lines.slice(1);
  const data: ImportedLabelData[] = [];
  
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;
    
    try {
      const fields = parseCSVLine(line);
      
      if (fields.length !== 3) {
        throw new Error(`Invalid number of fields (expected 3, got ${fields.length})`);
      }
      
      const [fileNameRaw, timestampStr, tagsRaw] = fields;
      
      // Remove quotes from fileName
      const fileName = fileNameRaw.replace(/^"(.*)"$/, '$1');
      
      // Parse timestamp
      const timestamp = parseTimestamp(timestampStr);
      
      // Parse tags - remove quotes and split by comma
      const tagsStr = tagsRaw.replace(/^"(.*)"$/, '$1');
      const tags = tagsStr ? tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
      
      data.push({
        fileName,
        timestamp,
        tags
      });
    } catch (error) {
      throw new Error(`Error parsing line ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return data;
};

export const importLabelsFromCSV = async (csvContent: string): Promise<ImportResult> => {
  const result: ImportResult = {
    processedRows: 0,
    skippedFiles: [],
    addedLabels: 0,
    addedTags: 0,
    errors: []
  };
  
  try {
    const importData = parseCSVContent(csvContent);
    result.processedRows = importData.length;
    
    // Get all files from database
    const allFiles = await db.files.toArray();
    const fileMap = new Map(allFiles.map(file => [file.name, file]));
    
    // Group data by fileName to process efficiently
    const dataByFile = new Map<string, ImportedLabelData[]>();
    for (const item of importData) {
      if (!dataByFile.has(item.fileName)) {
        dataByFile.set(item.fileName, []);
      }
      dataByFile.get(item.fileName)!.push(item);
    }
    
    // Process each file
    for (const [fileName, fileData] of dataByFile) {
      const file = fileMap.get(fileName);
      
      if (!file || !file.id) {
        result.skippedFiles.push(fileName);
        continue;
      }
      
      // Add tags to file (collect unique tags from all entries for this file)
      const allTags = new Set<string>();
      fileData.forEach(item => item.tags.forEach(tag => allTags.add(tag)));
      
      for (const tag of allTags) {
        try {
          await addTagToFile(file.id, tag);
          result.addedTags++;
        } catch (error) {
          // Tag might already exist, that's okay
        }
      }
      
      // Add labels for this file
      for (const item of fileData) {
        try {
          const newLabel: StoredLabel = {
            id: `imported-${Date.now()}-${Math.random()}`,
            fileId: file.id,
            timestamp: item.timestamp
          };
          
          await addLabelToDB(newLabel);
          result.addedLabels++;
        } catch (error) {
          result.errors.push(`Failed to add label at ${item.timestamp}s for ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
  } catch (error) {
    result.errors.push(`CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return result;
};

export const loadCSVFile = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };
    
    input.click();
  });
}; 