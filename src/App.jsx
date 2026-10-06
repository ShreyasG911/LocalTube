import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ListFilter, MoreVertical, Play, ListPlus, FolderPlus, Trash2, Minus } from 'lucide-react';
import Layout from './components/Layout';
import { useLibrary } from './context/LibraryContext';
import { formatDuration, formatBytes, formatTitle } from './utils/format';
import CustomVideoPlayer from './components/CustomVideoPlayer';
import SettingsView from './components/SettingsView';
import MiniPlayer from './components/MiniPlayer';
import { VirtuosoGrid } from 'react-virtuoso';

function App() {
  const { folders, videos, videoMeta, isLoading, currentView, setCurrentView, searchQuery, updateMeta, setIsSidebarCollapsed, queue, setQueue, activeVideo, setActiveVideo, playlists, currentUser, showToast, removePlaylist } = useLibrary();
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');
  const [magicSeed, setMagicSeed] = useState(0);
  const [showAllFolders, setShowAllFolders] = useState(false);

  useEffect(() => {
    setActiveVideo(null);
    setSelectedCategory('All');
  }, [currentView, searchQuery]);

  // Responsive sidebar: only auto-collapse if screen is too small to fit both sidebars comfortably
  useEffect(() => {
    if (activeVideo && window.innerWidth < 1350) {
      setIsSidebarCollapsed(true);
    }
  }, [activeVideo, setIsSidebarCollapsed]);

  useEffect(() => {
    const handleGoHome = () => {
      setActiveVideo(null);
      setSelectedCategory('All');
    };
    window.addEventListener('go-home', handleGoHome);

    const handleGlobalClick = (event) => {
      if (!event.target.closest('.app-menu-dropdown')) {
        setOpenMenuId(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);

    return () => {
      window.removeEventListener('go-home', handleGoHome);
      window.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  const handleSelectVideo = (video) => {
    setActiveVideo(video);
    setQueue(prev => prev.filter(v => v.id !== video.id));
  };

  const handleAddToQueue = (e, video) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setQueue(prev => [...prev.filter(q => q.id !== video.id), video]);
    showToast(`Added "${formatTitle(video.name)}" to queue`);
  };

  const handleWatchLater = (e, video) => {
    e.stopPropagation();
    setOpenMenuId(null);
    const userPlaylists = videoMeta[video.id]?.playlists || [];
    if (!userPlaylists.includes('Watch Later')) {
      updateMeta(video.id, { playlists: [...userPlaylists, 'Watch Later'] });
      showToast('Saved to Watch Later');
    } else {
      showToast('Already in Watch Later');
    }
  };

  let filteredVideos = videos.filter(v =>
    !videoMeta[v.id]?.isHidden &&
    (v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.folderId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (selectedCategory !== 'All' && selectedCategory !== 'Magic Feed') {
    filteredVideos = filteredVideos.filter(v => v.folderId === selectedCategory);
  }

  if (currentView === 'Favorites') {
    filteredVideos = filteredVideos.filter(v => videoMeta[v.id]?.isFavorite);
  } else if (currentView === 'History') {
    filteredVideos = filteredVideos.filter(v => videoMeta[v.id]?.lastWatched > 0)
      .sort((a, b) => (videoMeta[b.id]?.lastWatched || 0) - (videoMeta[a.id]?.lastWatched || 0));
  } else if (currentView === 'Continue Watching') {
    filteredVideos = filteredVideos.filter(v => {
      const meta = videoMeta[v.id];
      return meta && meta.progress > 5 && meta.progress < v.duration - 10;
    }).sort((a, b) => (videoMeta[b.id]?.lastWatched || 0) - (videoMeta[a.id]?.lastWatched || 0));
  } else if (currentView !== 'Home' && currentView !== 'Settings') {
    filteredVideos = filteredVideos.filter(v => videoMeta[v.id]?.playlists?.includes(currentView));
  }

  // Sorting
  if (selectedCategory === 'Magic Feed') {
    // Deterministic random sort based on seed and video id
    const hash = (str) => {
      let h = 0;
      for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
      return h;
    };
    filteredVideos.sort((a, b) => hash(a.id + magicSeed) - hash(b.id + magicSeed));
  } else if (currentView !== 'History' && currentView !== 'Continue Watching') {
    filteredVideos.sort((a, b) => {
      if (sortBy === 'Newest') return b.lastModified - a.lastModified;
      if (sortBy === 'Oldest') return a.lastModified - b.lastModified;
      if (sortBy === 'Name (A-Z)') return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      if (sortBy === 'Name (Z-A)') return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
      if (sortBy === 'Size (Largest)') return b.size - a.size;
      if (sortBy === 'Size (Smallest)') return a.size - b.size;
      return 0;
    });
  }

  return (
    <Layout isVideoPlaying={!!activeVideo}>
      <div className="max-w-7xl mx-auto">
        {activeVideo ? (
          <CustomVideoPlayer video={activeVideo} onBack={() => setActiveVideo(null)} onSelectVideo={handleSelectVideo} />
        ) : currentView === 'Settings' ? (
          <SettingsView />
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold">{currentView === 'Home' ? 'All Videos' : currentView}</h1>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white transition-colors">
                <span>{filteredVideos.length} videos</span>
              </div>
            </div>

            {/* Categories and Sort */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
              <div className={`flex items-center gap-3 ${showAllFolders ? 'flex-wrap' : 'overflow-x-auto pb-2 sm:pb-0 custom-scrollbar'} flex-1`}>
                {['All', ...folders.map(f => f.name)].slice(0, showAllFolders ? undefined : 6).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap active:scale-95 transition-all duration-200 ${selectedCategory === cat
                      ? 'bg-white text-black hover:bg-gray-200'
                      : 'bg-[#272727] text-gray-200 hover:bg-[#3f3f3f]'
                      }`}
                  >
                    {cat}
                  </button>
                ))}

                <button
                  onClick={() => {
                    setSelectedCategory('Magic Feed');
                    setMagicSeed(Math.random());
                  }}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap active:scale-95 transition-all duration-200 magic-feed-btn ${selectedCategory === 'Magic Feed'
                    ? 'text-white shadow-lg'
                    : 'text-gray-300'
                    }`}
                >
                  ✨ Magic Feed
                </button>

                {folders.length + 1 > 6 && (
                  <button 
                    onClick={() => setShowAllFolders(!showAllFolders)}
                    className="text-[#3ea6ff] hover:text-[#65b6ff] text-sm font-medium whitespace-nowrap px-2 transition-colors hover:underline active:scale-95"
                  >
                    {showAllFolders ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>

              {(currentView !== 'History' && currentView !== 'Continue Watching') && (
                <div className="relative group shrink-0">
                  <div className="flex items-center gap-2 bg-[#272727] px-3 py-1.5 rounded-lg cursor-pointer hover:bg-[#3f3f3f] transition-colors border border-transparent hover:border-[#4f4f4f]">
                    <ListFilter size={16} className="text-gray-300" />
                    <span className="text-sm text-gray-200 font-medium">Sort by: {sortBy}</span>
                    <ChevronDown size={16} className="text-gray-400" />
                  </div>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#202020] border border-[#303030] rounded-xl shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 origin-top-right transform scale-95 group-hover:scale-100">
                    {['Newest', 'Oldest', 'Name (A-Z)', 'Name (Z-A)', 'Size (Largest)', 'Size (Smallest)'].map(option => (
                      <div
                        key={option}
                        onClick={() => setSortBy(option)}
                        className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-[#303030] transition-colors ${sortBy === option ? 'text-[#3ea6ff] bg-[#3ea6ff]/10' : 'text-gray-200'}`}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Video Grid */}
            {isLoading ? (
              <div className="text-gray-500 text-sm py-16 flex justify-center w-full">Loading videos...</div>
            ) : filteredVideos.length > 0 ? (
              <VirtuosoGrid
                useWindowScroll
                data={filteredVideos}
                listClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6"
                itemContent={(index, video) => {
                  const meta = videoMeta[video.id];
                  const progressPercent = meta && meta.progress && video.duration ? (meta.progress / video.duration) * 100 : 0;

                  return (
                    <div onClick={() => handleSelectVideo(video)} className={`bg-[#181818] rounded-xl cursor-pointer hover:bg-[#202020] transition-all duration-200 pb-3 group w-full h-full ${openMenuId === video.id ? 'z-[100] relative' : 'overflow-hidden active:scale-[0.98]'}`}>
                      <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden rounded-t-xl">
                        {video.thumbnail ? (
                          <img src={video.thumbnail} alt={video.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <span className="text-gray-600 text-xs">No Thumbnail</span>
                        )}
                        <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded-md text-xs font-medium">
                          {formatDuration(video.duration)}
                        </div>
                        {progressPercent > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600/50">
                            <div className="h-full bg-red-600" style={{ width: `${Math.min(progressPercent, 100)}%` }} />
                          </div>
                        )}
                        {currentView === 'History' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateMeta(video.id, { lastWatched: 0, progress: 0 });
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 rounded-full z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove from History"
                          >
                            <X size={16} className="text-white" />
                          </button>
                        )}
                      </div>
                      <div className="px-3 pt-3 flex gap-3">
                        <div className="flex-1 overflow-hidden">
                          <h3 className="font-semibold text-sm truncate" title={video.name}>{formatTitle(video.name)}</h3>
                          <p className="text-xs text-gray-400 truncate mt-1">{video.folderId} • {formatBytes(video.size)}</p>
                        </div>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === video.id ? null : video.id);
                            }}
                            className="p-1 text-gray-400 hover:text-white hover:bg-[#303030] rounded-full transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openMenuId === video.id && (
                            <div className="app-menu-dropdown absolute right-0 top-full mt-1 w-48 bg-[#202020] border border-[#303030] rounded-xl shadow-2xl overflow-hidden z-[100]" onClick={e => e.stopPropagation()}>
                              <button onClick={(e) => handleAddToQueue(e, video)} className="w-full px-4 py-2 text-sm text-left hover:bg-[#303030] flex items-center gap-3 transition-colors">
                                <ListPlus size={16} className="text-gray-400" />
                                Add to queue
                              </button>
                              <button onClick={(e) => handleWatchLater(e, video)} className="w-full px-4 py-2 text-sm text-left hover:bg-[#303030] flex items-center gap-3 transition-colors">
                                <Play size={16} className="text-gray-400" />
                                Save to Watch Later
                              </button>
                              {currentView !== 'Home' && currentView !== 'History' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const meta = videoMeta[video.id] || {};
                                    const userPlaylists = meta.playlists || [];
                                    updateMeta(video.id, { playlists: userPlaylists.filter(p => p !== currentView) });
                                    showToast(`Removed from ${currentView}`);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-sm text-left hover:bg-[#303030] flex items-center gap-3 transition-colors text-red-400 hover:text-red-300"
                                >
                                  <Minus size={16} />
                                  Remove from {currentView}
                                </button>
                              )}
                              <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 border-t border-[#303030] mt-1">Options</div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateMeta(video.id, { isHidden: true });
                                  showToast(`Hidden from platform`);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-sm text-left hover:bg-[#303030] flex items-center gap-3 transition-colors"
                              >
                                <X size={16} className="text-gray-400" />
                                Hide from platform
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
            ) : (
              <div className="text-gray-500 text-sm py-16 w-full flex flex-col items-center justify-center border-2 border-dashed border-[#272727] rounded-xl bg-[#121212]">
                {currentView !== 'Home' ? (
                  <>
                    <span className="mb-2">Your Playlist is empty.</span>
                    <span className="text-xs text-gray-600">Click "Save to '{currentView}'" to add videos in playlist</span>
                  </>
                ) : (
                  <>
                    <span className="mb-2">Your video library is empty.</span>
                    <span className="text-xs text-gray-600">Click "Add Folder" to scan for local videos.</span>
                  </>
                )}
              </div>
            )}
          </>
        )}
        {!activeVideo && queue.length > 0 && (
          <MiniPlayer
            video={queue[0]}
            onExpand={() => {
              handleSelectVideo(queue[0]);
            }}
            onClose={() => setQueue([])}
            onNext={() => setQueue(prev => prev.slice(1))}
          />
        )}
      </div>
    </Layout>
  );
}

export default App;
