import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db } from '../services/database';
import { requestFolderAccess, verifyPermission, scanDirectory } from '../services/fileSystem';

const LibraryContext = createContext();

export function LibraryProvider({ children }) {
  const [folders, setFolders] = useState([]);
  const [videos, setVideos] = useState([]);
  const [videoMeta, setVideoMeta] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentViewRaw] = useState('Home');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [queue, setQueue] = useState([]);
  const [activeVideo, setActiveVideo] = useState(null);

  const setCurrentView = (view) => {
    setCurrentViewRaw(view);
    setActiveVideo(null); // Fix: clear video when navigating away
  };
  const [toastMessage, setToastMessage] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('localtube_theme') || 'system');
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('localtube_user') || 'Default');
  const [users, setUsers] = useState(JSON.parse(localStorage.getItem('localtube_users')) || ['Default']);
  const [autoSaveMovies, setAutoSaveMovies] = useState(localStorage.getItem('localtube_autosave_movies') !== 'false');
  const [sidebarPipEnabled, setSidebarPipEnabled] = useState(localStorage.getItem('localtube_sidebar_pip') !== 'false');
  
  useEffect(() => {
    localStorage.setItem('localtube_sidebar_pip', sidebarPipEnabled);
  }, [sidebarPipEnabled]);
  useEffect(() => {
    localStorage.setItem('localtube_autosave_movies', autoSaveMovies);
  }, [autoSaveMovies]);
  
  const defaultPlaylists = ['Watch Later', 'Videos', 'Movies', 'Series'];
  const [playlists, setPlaylists] = useState(() => {
    const saved = localStorage.getItem('localtube_playlists');
    if (saved) return JSON.parse(saved);
    return { 'Default': defaultPlaylists };
  });

  useEffect(() => {
    loadLibrary();
  }, []);

  useEffect(() => {
    localStorage.setItem('localtube_theme', theme);
    
    const applyTheme = () => {
      const isLight = theme === 'light' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches);
      if (isLight) {
        document.documentElement.classList.add('light-mode');
      } else {
        document.documentElement.classList.remove('light-mode');
      }
    };
    
    applyTheme();
    
    // Listen for system changes if set to system
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  const loadLibrary = async () => {
    setIsLoading(true);
    const dbFolders = await db.getFolders();
    const dbVideos = await db.getVideos();
    const dbMetaList = await db.getAllVideoMeta(currentUser);
    
    const metaMap = {};
    dbMetaList.forEach(m => {
      metaMap[m.videoId] = m;
    });

    setFolders(dbFolders);
    setVideos(dbVideos);
    setVideoMeta(metaMap);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isLoading) return;
    const refreshMeta = async () => {
      const dbMetaList = await db.getAllVideoMeta(currentUser);
      const metaMap = {};
      dbMetaList.forEach(m => {
        metaMap[m.videoId] = m;
      });
      setVideoMeta(metaMap);
    };
    refreshMeta();
  }, [currentUser]);

  const updateMeta = async (videoId, data) => {
    await db.updateVideoMeta(currentUser, videoId, data);
    setVideoMeta(prev => ({
      ...prev,
      [videoId]: { ...prev[videoId], ...data, videoId, userId: currentUser }
    }));
  };

  const switchUser = (username) => {
    setCurrentUser(username);
    localStorage.setItem('localtube_user', username);
  };

  const addUser = (username) => {
    if (!users.includes(username)) {
      const newUsers = [...users, username];
      setUsers(newUsers);
      localStorage.setItem('localtube_users', JSON.stringify(newUsers));
      
      const newPlaylists = { ...playlists, [username]: defaultPlaylists };
      setPlaylists(newPlaylists);
      localStorage.setItem('localtube_playlists', JSON.stringify(newPlaylists));
      
      switchUser(username);
    }
  };

  const removeUser = (username) => {
    if (users.length <= 1) {
      showToast("Cannot delete the last remaining user");
      return;
    }
    const newUsers = users.filter(u => u !== username);
    setUsers(newUsers);
    localStorage.setItem('localtube_users', JSON.stringify(newUsers));
    
    if (currentUser === username) {
      switchUser(newUsers[0]);
    }
    showToast(`User "${username}" deleted`);
  };

  const addPlaylist = (name) => {
    const userPlaylists = playlists[currentUser] || defaultPlaylists;
    if (!userPlaylists.includes(name)) {
      const newPlaylists = {
        ...playlists,
        [currentUser]: [...userPlaylists, name]
      };
      setPlaylists(newPlaylists);
      localStorage.setItem('localtube_playlists', JSON.stringify(newPlaylists));
    }
  };

  const removePlaylist = async (name) => {
    const userPlaylists = playlists[currentUser] || defaultPlaylists;
    const newPlaylists = {
      ...playlists,
      [currentUser]: userPlaylists.filter(p => p !== name)
    };
    setPlaylists(newPlaylists);
    localStorage.setItem('localtube_playlists', JSON.stringify(newPlaylists));
    
    const allMeta = Object.values(videoMeta);
    for (const meta of allMeta) {
      if (meta.playlists && meta.playlists.includes(name)) {
        await updateMeta(meta.videoId, {
          playlists: meta.playlists.filter(p => p !== name)
        });
      }
    }
  };

  const renamePlaylist = async (oldName, newName) => {
    const userPlaylists = playlists[currentUser] || defaultPlaylists;
    if (userPlaylists.includes(newName)) {
      showToast(`Playlist "${newName}" already exists`);
      return false;
    }
    
    const newPlaylists = {
      ...playlists,
      [currentUser]: userPlaylists.map(p => p === oldName ? newName : p)
    };
    setPlaylists(newPlaylists);
    localStorage.setItem('localtube_playlists', JSON.stringify(newPlaylists));
    
    const allMeta = Object.values(videoMeta);
    for (const meta of allMeta) {
      if (meta.playlists && meta.playlists.includes(oldName)) {
        await updateMeta(meta.videoId, {
          playlists: meta.playlists.map(p => p === oldName ? newName : p)
        });
      }
    }
    
    if (currentView === oldName) {
      setCurrentView(newName);
    }
    return true;
  };

  const addFolder = async () => {
    const dirHandle = await requestFolderAccess();
    if (!dirHandle) return;

    const folder = {
      id: dirHandle.name,
      name: dirHandle.name,
      handle: dirHandle
    };

    await db.addFolder(folder);
    await scanFolder(folder);
    await loadLibrary();
  };

  const addDroppedFolder = async (dirHandle) => {
    if (!dirHandle || dirHandle.kind !== 'directory') return;

    const folder = {
      id: dirHandle.name,
      name: dirHandle.name,
      handle: dirHandle
    };

    await db.addFolder(folder);
    await scanFolder(folder);
    await loadLibrary();
  };

  const scanFolder = async (folder) => {
    const hasPermission = await verifyPermission(folder.handle);
    if (!hasPermission) {
      console.warn("No permission to access folder:", folder.name);
      return;
    }

    const files = await scanDirectory(folder.handle);
    
    await db.clearVideosForFolder(folder.id);
    
    const shouldAutoSave = localStorage.getItem('localtube_autosave_movies') !== 'false';
    
    for (const file of files) {
      await db.addVideo(file);
      
      if (shouldAutoSave && file.duration && file.duration > 3600) {
        const meta = await db.getVideoMeta(currentUser, file.id);
        const currentPlaylists = meta?.playlists || [];
        if (!currentPlaylists.includes('Movies')) {
          await db.updateVideoMeta(currentUser, file.id, { ...meta, playlists: [...currentPlaylists, 'Movies'] });
        }
      }
    }
  };

  const scanAllFolders = async () => {
    for (const folder of folders) {
      await scanFolder(folder);
    }
    await loadLibrary();
  };

  const removeFolder = async (folderId) => {
    await db.removeFolder(folderId);
    await loadLibrary();
  };

  const toastTimeoutRef = useRef(null);

  const showToast = (message) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  return (
    <LibraryContext.Provider value={{ folders, videos, videoMeta, isLoading, addFolder, addDroppedFolder, removeFolder, scanAllFolders, updateMeta, currentView, setCurrentView, searchQuery, setSearchQuery, currentUser, users, switchUser, addUser, removeUser, playlists, addPlaylist, removePlaylist, renamePlaylist, isSidebarCollapsed, setIsSidebarCollapsed, theme, setTheme, queue, setQueue, activeVideo, setActiveVideo, toastMessage, showToast, autoSaveMovies, setAutoSaveMovies, sidebarPipEnabled, setSidebarPipEnabled }}>
      {children}
      
      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#202020] border border-[#303030] shadow-2xl rounded-lg px-6 py-3 text-sm font-medium animate-in slide-in-from-bottom-5 z-[9999] flex items-center gap-3">
          {toastMessage}
        </div>
      )}
    </LibraryContext.Provider>
  );
}

export const useLibrary = () => useContext(LibraryContext);
