import { Home, PlaySquare, Film, Tv, Folder, Heart, History, Clock, Settings, HardDrive, Plus, Trash2, ListVideo, MoreVertical, Edit2 } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { useState, useEffect, cloneElement } from 'react';
import { formatBytes } from '../utils/format';

export default function Sidebar({ isVideoPlaying }) {
  const { folders, addFolder, removeFolder, currentView, setCurrentView, playlists, currentUser, isSidebarCollapsed, removePlaylist, renamePlaylist, showToast, activeVideo, setActiveVideo, setQueue, sidebarPipEnabled } = useLibrary();
  const userPlaylists = playlists[currentUser] || ['Watch Later', 'Videos', 'Movies', 'Series'];
  
  const [storageInfo, setStorageInfo] = useState({ usage: 0, quota: 0, percent: 0 });
  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => {
    const handleClick = () => setOpenMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleNavigate = (view) => {
    if (activeVideo) {
      if (sidebarPipEnabled) {
        setQueue(prev => {
          const newQueue = prev.filter(v => v.id !== activeVideo.id);
          return [activeVideo, ...newQueue];
        });
      }
      setActiveVideo(null);
    }
    setCurrentView(view);
  };

  useEffect(() => {
    async function checkStorage() {
      if (navigator.storage && navigator.storage.estimate) {
        try {
          const estimate = await navigator.storage.estimate();
          setStorageInfo({
            usage: estimate.usage || 0,
            quota: estimate.quota || 0,
            percent: estimate.quota ? (estimate.usage / estimate.quota) * 100 : 0
          });
        } catch (e) {
          console.error("Storage estimation failed", e);
        }
      }
    }
    checkStorage();
    const interval = setInterval(checkStorage, 60000);
    return () => clearInterval(interval);
  }, []);

  let sidebarClasses = "h-[calc(100vh-3.5rem)] bg-[#0f0f0f] border-r border-[#272727] flex flex-col fixed top-14 overflow-y-auto hidden md:flex transition-all duration-300 custom-scrollbar ";
  
  sidebarClasses += "z-40 left-0 " + (isSidebarCollapsed ? "w-[72px]" : "w-64");

  const isMini = isSidebarCollapsed;

  return (
    <aside className={sidebarClasses}>
      <div className={`flex-1 py-3 ${isMini ? 'px-2' : 'px-3'} flex flex-col gap-6`}>
        {/* Main Links */}
        <div className="flex flex-col gap-1">
          <NavItem icon={<Home size={20} />} label="Home" active={currentView === 'Home'} onClick={() => handleNavigate('Home')} isCollapsed={isMini} />
          
          {!isMini && <div className="px-3 py-1 mt-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Playlists</div>}
          {userPlaylists.includes('Movies') && <NavItem icon={<Film size={20} />} label="Movies" active={currentView === 'Movies'} onClick={() => handleNavigate('Movies')} isCollapsed={isMini} />}
          {userPlaylists.includes('Watch Later') && <NavItem icon={<Clock size={20} />} label="Watch Later" active={currentView === 'Watch Later'} onClick={() => handleNavigate('Watch Later')} isCollapsed={isMini} />}
          
          {['Videos', 'Series', ...userPlaylists.filter(pl => !['Watch Later', 'Videos', 'Movies', 'Series'].includes(pl))].map(pl => {
            if (!userPlaylists.includes(pl)) return null;

            const icon = pl === 'Videos' ? <PlaySquare size={20} /> :
                         pl === 'Series' ? <Tv size={20} /> :
                         <ListVideo size={20} />;

            return (
              <div key={pl} className="relative group">
                <NavItem icon={icon} label={pl} active={currentView === pl} onClick={() => handleNavigate(pl)} isCollapsed={isMini} />
                {!isMini && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(openMenu === pl ? null : pl);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white hover:bg-[#303030] rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenu === pl && (
                      <div className="absolute right-2 top-full mt-1 w-48 bg-[#202020] border border-[#303030] rounded-xl shadow-2xl overflow-hidden z-[100]" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={async () => {
                            const newName = window.prompt("Enter new playlist name:", pl);
                            if (newName && newName.trim() !== "" && newName !== pl) {
                              const success = await renamePlaylist(pl, newName.trim());
                              if (success) {
                                showToast(`Playlist renamed to "${newName.trim()}"`);
                              }
                            }
                            setOpenMenu(null);
                          }}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-[#303030] flex items-center gap-3 transition-colors text-gray-200"
                        >
                          <Edit2 size={16} />
                          Rename Playlist
                        </button>
                        <div className="h-px bg-[#303030] w-full" />
                        <button 
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete the playlist "${pl}"?`)) {
                              removePlaylist(pl);
                              showToast(`Playlist "${pl}" deleted`);
                              if (currentView === pl) handleNavigate('Home');
                              setOpenMenu(null);
                            }
                          }}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-[#303030] flex items-center gap-3 transition-colors text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={16} />
                          Delete Playlist
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="h-px bg-[#272727] w-full" />

        {/* Library Links */}
        <div className="flex flex-col gap-1">
          <NavItem icon={<Heart size={20} />} label="Favorites" active={currentView === 'Favorites'} onClick={() => handleNavigate('Favorites')} isCollapsed={isMini} />
          <NavItem icon={<History size={20} />} label="History" active={currentView === 'History'} onClick={() => handleNavigate('History')} isCollapsed={isMini} />
          <NavItem icon={<Clock size={20} />} label="Continue Watching" active={currentView === 'Continue Watching'} onClick={() => handleNavigate('Continue Watching')} isCollapsed={isMini} />
        </div>

        <div className="h-px bg-[#272727] w-full" />
        
        {/* Settings */}
        <div className="flex flex-col gap-1">
          <NavItem icon={<Settings size={20} />} label="Settings" active={currentView === 'Settings'} onClick={() => setCurrentView('Settings')} isCollapsed={isMini} />
        </div>

        <div className="h-px bg-[#272727] w-full" />

        {/* Folders List */}
        {!isMini && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-3 py-2 text-gray-400 text-sm font-semibold group cursor-pointer hover:text-white" onClick={addFolder}>
            <span>My Folders</span>
            <Plus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {folders.map(folder => (
            <div key={folder.id} className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-gray-300 hover:bg-[#272727] hover:text-white transition-colors group" title={folder.name}>
              <div className="flex items-center gap-4 flex-1 overflow-hidden">
                <Folder size={18} className="fill-gray-400 text-gray-400 shrink-0" />
                <span className="text-sm truncate">{folder.name}</span>
              </div>
              <Trash2 size={16} className="text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all shrink-0 ml-2" onClick={(e) => { 
                e.stopPropagation(); 
                if (window.confirm(`Are you sure you want to remove the folder "${folder.name}" from LocalTube? (This will not delete the actual files from your PC)`)) {
                  removeFolder(folder.id); 
                }
              }} />
            </div>
          ))}
          {folders.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-500">No folders added</div>
          )}
        </div>
        )}
      </div>

      {/* Storage Widget */}
      {!isMini && (
        <div className="p-4 mt-auto">
          <div className="bg-[#272727] rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <HardDrive size={16} />
              <span>Storage</span>
            </div>
            <div className="h-1.5 w-full bg-[#3f3f3f] rounded-full overflow-hidden">
              <div className="h-full bg-[#3ea6ff] transition-all duration-1000" style={{ width: `${Math.max(storageInfo.percent, 1)}%` }} />
            </div>
            <div className="text-xs text-gray-400 flex justify-between">
              <div><span className="text-[#3ea6ff]">{formatBytes(storageInfo.usage)}</span> / {formatBytes(storageInfo.quota)}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function NavItem({ icon, label, active, onClick, isCollapsed }) {
  if (isCollapsed) {
    return (
      <div onClick={onClick} className={`flex items-center justify-center py-4 rounded-lg cursor-pointer active:scale-95 transition-all duration-200 ${active ? 'bg-[#272727] text-white font-medium' : 'text-gray-300 hover:bg-[#272727] hover:text-white'}`} title={label}>
        {cloneElement(icon, { size: 26 })}
      </div>
    );
  }
  
  return (
    <div onClick={onClick} className={`flex items-center gap-4 px-3 py-2.5 rounded-lg cursor-pointer active:scale-95 transition-all duration-200 ${active ? 'bg-[#272727] text-white font-medium' : 'text-gray-300 hover:bg-[#272727] hover:text-white'}`}>
      {icon}
      <span className="text-sm">{label}</span>
    </div>
  );
}

function FolderItem({ label }) {
  return (
    <div className="flex items-center gap-4 px-3 py-2 rounded-lg cursor-pointer text-gray-300 hover:bg-[#272727] hover:text-white transition-colors">
      <Folder size={18} className="fill-gray-400 text-gray-400" />
      <span className="text-sm truncate">{label}</span>
    </div>
  );
}
