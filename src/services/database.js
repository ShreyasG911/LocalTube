import { openDB } from 'idb';

const DB_NAME = 'LocalTubeDB';
const DB_VERSION = 2;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains('folders')) {
        db.createObjectStore('folders', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('videos')) {
        const videoStore = db.createObjectStore('videos', { keyPath: 'id' });
        videoStore.createIndex('folderId', 'folderId');
      }
      if (!db.objectStoreNames.contains('videoMeta')) {
        db.createObjectStore('videoMeta', { keyPath: 'id' });
      }
    },
  });
};

export const db = {
  async addFolder(folder) {
    const database = await initDB();
    await database.put('folders', folder);
  },
  async getFolders() {
    const database = await initDB();
    return database.getAll('folders');
  },
  async removeFolder(id) {
    const database = await initDB();
    await database.delete('folders', id);
    
    const tx = database.transaction(['videos', 'videoMeta'], 'readwrite');
    const index = tx.objectStore('videos').index('folderId');
    let cursor = await index.openCursor(IDBKeyRange.only(id));
    
    const deletedVideoIds = new Set();
    while (cursor) {
      deletedVideoIds.add(cursor.value.id);
      await cursor.delete();
      cursor = await cursor.continue();
    }
    
    const metaStore = tx.objectStore('videoMeta');
    let metaCursor = await metaStore.openCursor();
    while (metaCursor) {
      if (deletedVideoIds.has(metaCursor.value.videoId)) {
        await metaCursor.delete();
      }
      metaCursor = await metaCursor.continue();
    }
    
    await tx.done;
  },
  async addVideo(video) {
    const database = await initDB();
    await database.put('videos', video);
  },
  async getVideos() {
    const database = await initDB();
    return database.getAll('videos');
  },
  async clearVideosForFolder(folderId) {
    const database = await initDB();
    const tx = database.transaction('videos', 'readwrite');
    const index = tx.store.index('folderId');
    let cursor = await index.openCursor(IDBKeyRange.only(folderId));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
  },
  async getVideoMeta(userId, videoId) {
    const database = await initDB();
    const id = `${userId}_${videoId}`;
    return (await database.get('videoMeta', id)) || { id, videoId, userId, progress: 0, lastWatched: 0, isFavorite: false };
  },
  async updateVideoMeta(userId, videoId, data) {
    const database = await initDB();
    const meta = await this.getVideoMeta(userId, videoId);
    await database.put('videoMeta', { ...meta, ...data });
  },
  async getAllVideoMeta(userId) {
    const database = await initDB();
    const all = await database.getAll('videoMeta');
    return all.filter(m => m.userId === userId);
  },
  async clearAllData() {
    const database = await initDB();
    await database.clear('folders');
    await database.clear('videos');
    await database.clear('videoMeta');
  }
};
