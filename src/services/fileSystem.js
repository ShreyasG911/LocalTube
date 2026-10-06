import { processVideoFile } from './thumbnailGenerator';

export async function requestFolderAccess() {
  if (!('showDirectoryPicker' in window)) {
    alert("Your browser doesn't support the File System Access API. Please use Chrome or Edge.");
    return null;
  }
  
  try {
    const directoryHandle = await window.showDirectoryPicker({
      mode: 'read'
    });
    return directoryHandle;
  } catch (error) {
    console.error('User cancelled or error:', error);
    return null;
  }
}

export async function verifyPermission(fileHandle, readWrite = false) {
  const options = { mode: readWrite ? 'readwrite' : 'read' };
  
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  
  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true;
  }
  
  return false;
}

export async function scanDirectory(dirHandle) {
  const files = [];
  try {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        const lowerName = file.name.toLowerCase();
        if (file.type.startsWith('video/') || lowerName.endsWith('.mp4') || lowerName.endsWith('.mkv') || lowerName.endsWith('.webm') || lowerName.endsWith('.mov') || lowerName.endsWith('.avi') || lowerName.endsWith('.m4v')) {
          
          const meta = await processVideoFile(file);
          
          files.push({
            id: entry.name + '-' + file.size, 
            handle: entry,
            name: file.name,
            size: file.size,
            type: file.type || 'video/mp4',
            lastModified: file.lastModified,
            folderId: dirHandle.name,
            duration: meta.duration,
            resolution: `${meta.width}x${meta.height}`,
            thumbnail: meta.thumbnail
          });
        }
      }
    }
  } catch(e) {
    console.error("Error scanning directory:", e);
  }
  return files;
}
