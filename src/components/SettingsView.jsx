import { useState, useEffect } from 'react';
import { useLibrary } from '../context/LibraryContext';
import { db } from '../services/database';
import { formatTitle } from '../utils/format';
import { Play, MoreVertical, Eye, CheckSquare, X, Trash2 } from 'lucide-react'; 

export default function SettingsView() {
  const { currentUser, switchUser, users, removeUser, updateMeta, videos, videoMeta, theme, setTheme, showToast, setCurrentView, autoSaveMovies, setAutoSaveMovies, sidebarPipEnabled, setSidebarPipEnabled } = useLibrary();
  const [selectedHidden, setSelectedHidden] = useState([]);
  const [showHiddenContent, setShowHiddenContent] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setCurrentView('Home');
    }, 280);
  };

  useEffect(() => {
    function handleClickOutside() {
      setOpenMenuId(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hiddenVideos = videos.filter(v => videoMeta[v.id]?.isHidden);

  const toggleSelectHidden = (id) => {
    setSelectedHidden(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleUnhideSelected = () => {
    selectedHidden.forEach(id => updateMeta(id, { isHidden: false }));
    setSelectedHidden([]);
    showToast('Selected videos unhidden');
  };

  const handleFactoryReset = async () => {
    if (window.confirm("Are you sure you want to completely reset LocalTube? All your metadata, playlists, history, and folders will be deleted permanently. This cannot be undone.")) {
      await db.clearAllData();
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm("Clear all your watch history?")) {
      const dbMetaList = await db.getAllVideoMeta(currentUser);
      for (const m of dbMetaList) {
        if (m.lastWatched > 0 || m.progress > 0) {
          await updateMeta(m.videoId, { lastWatched: 0, progress: 0 });
        }
      }
      alert("History cleared!");
    }
  };

  return (
    <div className={`p-6 max-w-4xl mx-auto w-full pt-4 ${isClosing ? 'animate-scale-out' : 'animate-slide-up'}`}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <button 
          onClick={handleClose}
          className="p-2 text-gray-400 hover:text-white hover:bg-[#272727] rounded-full transition-colors"
        >
          <X size={24} />
        </button>
      </div>
      
      <div className="flex flex-col gap-8">
        {/* Profile Settings */}
        <section>
          <h2 className="text-lg font-semibold border-b border-[#272727] pb-2 mb-4">Profile Settings</h2>
          <div className="bg-[#181818] p-4 rounded-xl border border-[#272727] flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-white">Current Profile</h3>
                <p className="text-sm text-gray-400">Manage your active user profile data</p>
              </div>
              <select 
                className="bg-[#272727] text-white px-3 py-1.5 rounded-lg border border-[#3f3f3f] outline-none"
                value={currentUser}
                onChange={(e) => switchUser(e.target.value)}
              >
                {users.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            
            {users.length > 1 && currentUser !== 'Default' && (
              <>
                <div className="w-full h-px bg-[#272727]"></div>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-white">Delete Profile</h3>
                    <p className="text-sm text-gray-400">Permanently remove the current user profile</p>
                  </div>
                  <button 
                    onClick={() => {
                      if(confirm(`Are you sure you want to completely delete the profile "${currentUser}"?`)) {
                        removeUser(currentUser);
                      }
                    }}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                  >
                    <Trash2 size={16} /> Delete User
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Playback Settings */}
        <section>
          <h2 className="text-lg font-semibold border-b border-[#272727] pb-2 mb-4">Playback & UI</h2>
          <div className="bg-[#181818] p-4 rounded-xl border border-[#272727] flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-white">App Theme</h3>
                <p className="text-sm text-gray-400">Choose between dark, light, or system default</p>
              </div>
              <select 
                className="bg-[#272727] text-white px-3 py-1.5 rounded-lg border border-[#3f3f3f] outline-none"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="system">System Default</option>
                <option value="dark">Dark Mode</option>
                <option value="light">Light Mode</option>
              </select>
            </div>
            
            <div className="h-px bg-[#272727] w-full" />
            
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setSidebarPipEnabled(!sidebarPipEnabled)}>
              <div>
                <h3 className="font-medium text-white">Sidebar Picture-in-Picture</h3>
                <p className="text-sm text-gray-400">Continue playing in MiniPlayer when you click a playlist</p>
              </div>
              <div className={`w-11 h-6 rounded-full relative transition-colors ${sidebarPipEnabled ? 'bg-[#3ea6ff]' : 'bg-[#3f3f3f]'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-[2px] transition-all shadow-sm ${sidebarPipEnabled ? 'left-[22px]' : 'left-[2px]'}`} />
              </div>
            </div>
          </div>
        </section>

        {/* Playlist Settings */}
        <section>
          <h2 className="text-lg font-semibold border-b border-[#272727] pb-2 mb-4">Playlist Settings</h2>
          <div className="bg-[#181818] p-4 rounded-xl border border-[#272727]">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setAutoSaveMovies(!autoSaveMovies)}>
              <div>
                <h3 className="font-medium text-white">Auto-Save Movies</h3>
                <p className="text-sm text-gray-400">Automatically save videos longer than 1 hour to the "Movies" playlist</p>
              </div>
              <div className={`w-11 h-6 rounded-full relative transition-colors ${autoSaveMovies ? 'bg-[#3ea6ff]' : 'bg-[#3f3f3f]'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-[2px] transition-all shadow-sm ${autoSaveMovies ? 'left-[22px]' : 'left-[2px]'}`} />
              </div>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section>
          <h2 className="text-lg font-semibold border-b border-[#272727] pb-2 mb-4">Data & Privacy</h2>
          <div className="bg-[#181818] p-4 rounded-xl border border-[#272727] flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-white">Clear Watch History</h3>
                <p className="text-sm text-gray-400">Reset your video progress and watched status</p>
              </div>
              <button 
                onClick={handleClearHistory}
                className="px-4 py-1.5 bg-red-600/20 text-red-500 font-medium rounded-lg hover:bg-red-600/30 transition-colors"
              >
                Clear History
              </button>
            </div>
            <div className="h-px bg-[#272727] w-full" />
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-white">Reset Local Database</h3>
                <p className="text-sm text-gray-400">Wipe all metadata (favorites, playlists, history)</p>
              </div>
              <button 
                onClick={handleFactoryReset}
                className="px-4 py-1.5 bg-red-600/20 text-red-500 font-medium rounded-lg hover:bg-red-600/30 transition-colors"
              >
                Factory Reset
              </button>
            </div>
          </div>
        </section>

        {/* Hidden Videos Section */}
        <section>
          <h2 className="text-lg font-semibold border-b border-[#272727] pb-2 mb-4">Hidden Content</h2>
          <div className="bg-[#181818] p-4 rounded-xl border border-[#272727] flex flex-col gap-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="font-medium text-white">Hidden Videos</h3>
                <p className="text-sm text-gray-400">Videos you have hidden from the platform</p>
              </div>
              <div className="flex gap-2 items-center">
                {showHiddenContent && hiddenVideos.length > 0 && (
                  <button 
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      if (isSelectionMode) setSelectedHidden([]);
                    }}
                    className={`px-3 py-1.5 font-medium rounded-lg transition-colors flex items-center gap-2 text-sm ${isSelectionMode ? 'bg-blue-600/20 text-blue-500 hover:bg-blue-600/30' : 'bg-[#272727] text-gray-300 hover:bg-[#3f3f3f]'}`}
                  >
                    <CheckSquare size={16} />
                    {isSelectionMode ? 'Cancel Selection' : 'Select Videos'}
                  </button>
                )}
                {isSelectionMode && selectedHidden.length > 0 && (
                  <button 
                    onClick={handleUnhideSelected}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors text-sm"
                  >
                    Unhide Selected ({selectedHidden.length})
                  </button>
                )}
              </div>
            </div>
            
            {!showHiddenContent ? (
              <button 
                onClick={() => setShowHiddenContent(true)}
                className="w-full py-3 mt-2 border border-dashed border-[#3f3f3f] rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-colors flex items-center justify-center gap-2"
              >
                <Eye size={18} />
                View Content
              </button>
            ) : hiddenVideos.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No hidden videos</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mt-2">
                {hiddenVideos.map(v => (
                  <div key={v.id} className={`flex gap-3 items-center p-2 rounded-lg border transition-colors relative ${selectedHidden.includes(v.id) ? 'bg-blue-900/20 border-blue-500/50' : 'bg-[#202020] border-[#303030]'} ${openMenuId === v.id ? 'z-[100]' : ''}`}>
                    {isSelectionMode && (
                      <input 
                        type="checkbox"
                        checked={selectedHidden.includes(v.id)}
                        onChange={() => toggleSelectHidden(v.id)}
                        className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-[#303030] ml-1"
                      />
                    )}
                    <div className="w-20 aspect-video bg-black rounded overflow-hidden shrink-0">
                      {v.thumbnail ? (
                        <img src={v.thumbnail} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-500">No Thumb</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <p className="text-sm font-medium truncate" title={v.name}>{formatTitle(v.name)}</p>
                    </div>
                    
                    {!isSelectionMode && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === v.id ? null : v.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-[#303030] rounded-full transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {openMenuId === v.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-[#202020] border border-[#303030] rounded-xl shadow-2xl overflow-hidden z-[100]" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                updateMeta(v.id, { isHidden: false });
                                showToast(`Unhidden ${formatTitle(v.name)}`);
                                setSelectedHidden(prev => prev.filter(id => id !== v.id));
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-[#303030] flex items-center gap-3 transition-colors text-white"
                            >
                              <Eye size={16} className="text-gray-400" />
                              Unhide
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
