import { useState, useEffect, useRef, useMemo } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  Folder,
  Copy,
  Info,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  ArrowLeft,
  Heart,
  SkipBack,
  SkipForward,
  RectangleHorizontal,
  ListPlus,
  Plus,
  X,
  MessageSquare,
  Trash2,
  PictureInPicture2,
  FolderPlus,
} from "lucide-react";
import { formatDuration, formatBytes, formatTitle } from "../utils/format";
import { useLibrary } from "../context/LibraryContext";
import { verifyPermission } from "../services/fileSystem";

export default function CustomVideoPlayer({ video, onBack, onSelectVideo }) {
  const {
    videos,
    videoMeta,
    updateMeta,
    playlists,
    addPlaylist,
    currentUser,
    queue,
    setQueue,
    showToast,
    autoSaveMovies,
  } = useLibrary();

  const hiddenIdsStr = useMemo(() => {
    return Object.keys(videoMeta)
      .filter((id) => videoMeta[id]?.isHidden)
      .sort()
      .join(",");
  }, [videoMeta]);

  const { activeQueue, upNextVideos } = useMemo(() => {
    const hiddenSet = new Set(hiddenIdsStr ? hiddenIdsStr.split(",") : []);
    const queueIds = new Set(queue.map((q) => q.id));
    const nonQueueVideos = videos.filter(
      (v) => v.id !== video.id && !queueIds.has(v.id) && !hiddenSet.has(v.id),
    );

    const sameFolderVideos = nonQueueVideos.filter(
      (v) => v.folderId === video.folderId,
    );
    sameFolderVideos.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );

    const after = [];
    const before = [];
    for (const v of sameFolderVideos) {
      if (
        v.name.localeCompare(video.name, undefined, {
          numeric: true,
          sensitivity: "base",
        }) > 0
      ) {
        after.push(v);
      } else {
        before.push(v);
      }
    }

    const otherFolderVideos = nonQueueVideos.filter(
      (v) => v.folderId !== video.folderId,
    );
    otherFolderVideos.sort((a, b) => b.lastModified - a.lastModified);

    const activeQueueList = queue.filter((v) => v.id !== video.id);

    return {
      activeQueue: activeQueueList,
      upNextVideos: [...after, ...before, ...otherFolderVideos],
    };
  }, [videos, video.id, video.folderId, video.name, queue, hiddenIdsStr]);

  const meta = videoMeta[video.id] || { progress: 0, isFavorite: false };
  const userPlaylists = playlists[currentUser] || [];

  const [videoUrl, setVideoUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showFileInfo, setShowFileInfo] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [isTheater, setIsTheater] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const settingsRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
      if (!event.target.closest('.upnext-menu-dropdown')) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddToQueue = (e, targetVideo) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setQueue((prev) => [
      ...prev.filter((q) => q.id !== targetVideo.id),
      targetVideo,
    ]);
    showToast(`Added "${formatTitle(targetVideo.name)}" to queue`);
  };

  const handleWatchLater = (e, targetVideo) => {
    e.stopPropagation();
    setOpenMenuId(null);
    const userPlaylists = videoMeta[targetVideo.id]?.playlists || [];
    if (!userPlaylists.includes("Watch Later")) {
      updateMeta(targetVideo.id, {
        playlists: [...userPlaylists, "Watch Later"],
      });
      showToast("Saved to Watch Later");
    } else {
      showToast("Already in Watch Later");
    }
  };
  const controlsTimeoutRef = useRef(null);

  // Load video file
  useEffect(() => {
    let url;
    const loadFile = async () => {
      try {
        const hasPermission = await verifyPermission(video.handle);
        if (!hasPermission) {
          console.error("Permission not granted to access file");
          alert("Permission to read video file was denied.");
          onBack();
          return;
        }

        const file = await video.handle.getFile();
        url = URL.createObjectURL(file);
        setVideoUrl(url);
      } catch (err) {
        console.error("Failed to load video file", err);
      }
    };
    loadFile();
    updateMeta(video.id, { lastWatched: Date.now() });

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [video]);

  // Save progress occasionally and on unmount
  useEffect(() => {
    const saveProgress = () => {
      if (videoRef.current && videoRef.current.currentTime > 0) {
        updateMeta(video.id, {
          progress: videoRef.current.currentTime,
          lastWatched: Date.now(),
        });
      }
    };

    const interval = setInterval(saveProgress, 5000);
    window.addEventListener("beforeunload", saveProgress);

    return () => {
      clearInterval(interval);
      saveProgress();
      window.removeEventListener("beforeunload", saveProgress);
    };
  }, [video.id]);

  // Restore progress on first load
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      
      // Auto-save to Movies if longer than 1 hour and feature is enabled
      if (autoSaveMovies && dur > 3600) {
        const userPlaylists = meta.playlists || [];
        if (!userPlaylists.includes('Movies')) {
          updateMeta(video.id, { playlists: [...userPlaylists, 'Movies'] });
        }
      }

      if (meta.progress > 0 && meta.progress < dur - 5) {
        videoRef.current.currentTime = meta.progress;
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;
      if (!videoRef.current) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "arrowright":
          e.preventDefault();
          videoRef.current.currentTime += 10;
          break;
        case "arrowleft":
          e.preventDefault();
          videoRef.current.currentTime -= 10;
          break;
        case "arrowup":
          e.preventDefault();
          handleVolumeChange(Math.min(volume + 0.1, 1));
          break;
        case "arrowdown":
          e.preventDefault();
          handleVolumeChange(Math.max(volume - 0.1, 0));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [volume, isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPip = () => setIsPip(true);
    const handleLeavePip = () => setIsPip(false);

    video.addEventListener("enterpictureinpicture", handleEnterPip);
    video.addEventListener("leavepictureinpicture", handleLeavePip);
    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnterPip);
      video.removeEventListener("leavepictureinpicture", handleLeavePip);
    };
  }, [videoUrl]);

  useEffect(() => {
    if (videoUrl && videoRef.current && autoplay) {
      videoRef.current.play().catch(e => console.log("Autoplay blocked", e));
      setIsPlaying(true);
    }
  }, [videoUrl, autoplay]);

  const togglePip = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current && document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error("Failed to toggle PiP", error);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    setProgress(
      (videoRef.current.currentTime / videoRef.current.duration) * 100,
    );
  };

  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e) => {
    const seekTime = (e.target.value / 100) * duration;
    videoRef.current.currentTime = seekTime;
    setProgress(e.target.value);
  };

  const toggleMute = () => {
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
    if (!isMuted) {
      videoRef.current.volume = 0;
    } else {
      videoRef.current.volume = volume;
    }
  };

  const handleVolumeChange = (newVolume) => {
    const val = parseFloat(newVolume);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current
        .requestFullscreen()
        .catch((err) => console.log(err));
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettings) setShowControls(false);
    }, 2500);
  };

  const nextVideo =
    activeQueue.length > 0
      ? activeQueue[0]
      : upNextVideos.length > 0
        ? upNextVideos[0]
        : null;

  const handleNext = () => {
    if (nextVideo) onSelectVideo(nextVideo);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (autoplay && nextVideo) {
      setTimeout(() => {
        onSelectVideo(nextVideo);
      }, 500); // Small deliberate delay like YouTube
    }
  };

  const handlePrev = () => {
    if (videoRef.current && videoRef.current.currentTime > 5) {
      videoRef.current.currentTime = 0;
    } else {
      // Logic for previous video if history exists, for now just restart
      if (videoRef.current) videoRef.current.currentTime = 0;
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackRate(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    setShowSettings(false);
  };

  const handleTogglePlaylist = (playlistName) => {
    const currentPlaylists = meta.playlists || [];
    let updatedPlaylists;
    let actionMsg = "";
    if (currentPlaylists.includes(playlistName)) {
      updatedPlaylists = currentPlaylists.filter((p) => p !== playlistName);
      actionMsg = `Removed from ${playlistName}`;
    } else {
      updatedPlaylists = [...currentPlaylists, playlistName];
      actionMsg = `Saved to ${playlistName}`;
    }
    updateMeta(video.id, { playlists: updatedPlaylists });
    showToast(actionMsg);
  };

  const handleCreatePlaylist = (e) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      addPlaylist(newPlaylistName.trim());
      handleTogglePlaylist(newPlaylistName.trim());
      setNewPlaylistName("");
    }
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const notes = meta.notes || [];
    const note = {
      id: Date.now(),
      text: newNote.trim(),
      timestamp: currentTime,
    };

    updateMeta(video.id, { notes: [...notes, note] });
    setNewNote("");
  };

  const handleDeleteNote = (noteId) => {
    const notes = meta.notes || [];
    updateMeta(video.id, { notes: notes.filter((n) => n.id !== noteId) });
  };

  if (!videoUrl) {
    return (
      <div className="w-full aspect-video bg-[#0f0f0f] flex items-center justify-center text-gray-400">
        Loading stream...
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 gap-x-6 gap-y-0 pt-2 px-1 sm:px-2 lg:px-0 ${isTheater ? "lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_400px]" : "lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_25%]"}`}
    >
      {/* Video Section */}
      <div
        className={`flex flex-col ${isTheater ? "lg:col-span-2 mb-6" : "lg:col-start-1 lg:col-end-2 mb-4"}`}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 self-start text-sm text-gray-400 hover:text-white mb-4 font-medium transition-colors"
        >
          <ArrowLeft size={16} /> Back to Library
        </button>

        {/* Video Container */}
        <div
          ref={containerRef}
          className={`relative w-full bg-black group overflow-hidden shadow-2xl border border-[#272727] ${isTheater && !isFullscreen ? "max-h-[75vh]" : "aspect-video rounded-xl"}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            if (isPlaying && !showSettings) setShowControls(false);
          }}
          onDoubleClick={toggleFullscreen}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleVideoEnded}
            autoPlay
          />

          {/* Controls Overlay */}
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-24 transition-opacity duration-300 flex flex-col gap-2 ${showControls || !isPlaying ? "opacity-100" : "opacity-0"}`}
          >
            {/* Progress Bar */}
            <div className="w-full group/progress relative flex items-center h-4 cursor-pointer">
              <div className="absolute left-0 right-0 h-1 bg-white/30 rounded-full group-hover/progress:h-1.5 transition-all">
                <div
                  className="h-full bg-red-600 rounded-full relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover/progress:opacity-100 transition-all shadow-[0_0_5px_rgba(220,38,38,0.8)]" />
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={progress}
                onChange={handleSeek}
                className="absolute w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePrev}
                  className="text-white hover:text-gray-300 transition-colors"
                  title="Previous"
                >
                  <SkipBack size={20} fill="currentColor" />
                </button>
                <button
                  onClick={togglePlay}
                  className="text-white hover:text-red-500 transition-colors mx-1"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause size={28} fill="currentColor" />
                  ) : (
                    <Play size={28} fill="currentColor" />
                  )}
                </button>
                <button
                  onClick={handleNext}
                  className="text-white hover:text-gray-300 transition-colors"
                  title="Next"
                >
                  <SkipForward size={20} fill="currentColor" />
                </button>

                <div className="flex items-center gap-2 group/volume ml-2">
                  <button
                    onClick={toggleMute}
                    className="text-white hover:text-red-500 transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX size={20} />
                    ) : (
                      <Volume2 size={20} />
                    )}
                  </button>
                  <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-300 ease-out flex items-center">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(e.target.value)}
                      className="w-full h-1 cursor-pointer accent-white"
                    />
                  </div>
                </div>

                <div className="text-white text-sm font-medium tracking-wide">
                  {formatDuration(currentTime)}{" "}
                  <span className="text-gray-400 mx-1">/</span>{" "}
                  {formatDuration(duration)}
                </div>
              </div>

              <div
                className="flex items-center gap-5 relative"
                ref={settingsRef}
              >
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`text-white hover:text-red-500 active:scale-95 transition-all duration-200 ${showSettings ? "text-red-500" : ""}`}
                  title="Settings"
                >
                  <Settings size={20} />
                </button>

                {/* Settings Popover */}
                {showSettings && (
                  <div className="absolute bottom-10 right-10 w-48 bg-[#202020]/95 backdrop-blur-md border border-[#303030] rounded-xl shadow-xl py-2 flex flex-col z-50">
                    <div className="px-4 py-2 border-b border-[#303030] mb-1">
                      <span className="text-xs text-gray-400 font-medium">
                        Playback Speed
                      </span>
                    </div>
                    {[0.25, 0.5, 1, 1.25, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        className={`px-4 py-2 text-left text-sm hover:bg-[#303030] flex items-center justify-between ${playbackRate === speed ? "text-red-500 font-medium" : "text-white"}`}
                      >
                        {speed === 1 ? "Normal" : `${speed}x`}
                        {playbackRate === speed && (
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {document.pictureInPictureEnabled && (
                  <button
                    onClick={togglePip}
                    className={`text-white hover:text-red-500 transition-colors ${isPip ? "text-red-500" : ""}`}
                    title="Picture in Picture"
                  >
                    <PictureInPicture2 size={20} />
                  </button>
                )}

                <button
                  onClick={() => setIsTheater(!isTheater)}
                  className={`text-white hover:text-red-500 transition-colors ${isTheater ? "text-red-500" : ""}`}
                  title="Theater mode"
                >
                  <RectangleHorizontal size={20} />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="text-white hover:text-red-500 transition-colors"
                  title="Fullscreen"
                >
                  <Maximize size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="lg:col-start-1 lg:col-end-2 flex flex-col pb-10">
        {/* Title and Base Stats */}
        <div className="px-1 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{formatTitle(video.name)}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-400 mt-2 font-medium">
              <span>{formatDuration(video.duration)}</span>
              <span>•</span>
              <span>{video.resolution}</span>
              <span>•</span>
              <span>{video.type.toUpperCase().replace("VIDEO/", "")}</span>
              <span>•</span>
              <span>{formatBytes(video.size)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => setShowSaveMenu(true)}
              className="p-2.5 rounded-full bg-[#272727] text-gray-400 hover:bg-[#3f3f3f] hover:text-white active:scale-95 transition-all duration-200 flex items-center justify-center"
              title="Save to Playlist"
            >
              <ListPlus size={20} />
            </button>
            <button
              onClick={() => {
                const newValue = !meta.isFavorite;
                updateMeta(video.id, { isFavorite: newValue });
                showToast(
                  newValue ? "Saved to Favorites" : "Removed from Favorites",
                );
              }}
              className={`p-2.5 rounded-full active:scale-95 transition-all duration-200 flex items-center justify-center ${meta.isFavorite ? "bg-red-500/20 text-red-500" : "bg-[#272727] text-gray-400 hover:bg-[#3f3f3f] hover:text-white"}`}
              title={
                meta.isFavorite ? "Remove from Favorites" : "Add to Favorites"
              }
            >
              <Heart
                size={20}
                className={meta.isFavorite ? "fill-red-500" : ""}
              />
            </button>
          </div>
        </div>

        {/* Detailed File Information Box */}
        <div className="mt-6 bg-[#181818] rounded-xl overflow-hidden shadow-sm">
          {/* Location Bar */}
          <div className="flex items-center justify-between p-4 bg-[#202020]">
            <div className="flex items-center gap-3 overflow-hidden">
              <Folder size={20} className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-400 shrink-0 font-medium">
                Location
              </span>
              <span className="text-sm font-medium truncate text-gray-200">
                {/* Browsers don't give the full native path due to security, so we show what we can */}
                {video.folderId} \ {video.name}
              </span>
            </div>
            <button
              className="p-2 hover:bg-[#3f3f3f] rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Copy Path"
            >
              <Copy size={18} />
            </button>
          </div>

          {/* Detailed Info Toggle */}
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#202020] transition-colors border-t border-[#272727]"
            onClick={() => setShowFileInfo(!showFileInfo)}
          >
            <div className="flex items-center gap-2 font-medium">
              <Info size={20} />
              <span>File Information</span>
            </div>
            {showFileInfo ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {/* Detailed Info Content */}
          {showFileInfo && (
            <div className="p-4 pt-1 text-sm bg-[#181818]">
              <div className="grid grid-cols-[140px_1fr] gap-y-3 mt-2">
                <div className="text-gray-400">File Name</div>
                <div className="truncate font-medium">{video.name}</div>

                <div className="text-gray-400">Size</div>
                <div>
                  {formatBytes(video.size)}{" "}
                  <span className="text-gray-500 text-xs ml-1 font-mono">
                    ({video.size.toLocaleString()} bytes)
                  </span>
                </div>

                <div className="text-gray-400">Type</div>
                <div>{video.type} Video</div>

                <div className="text-gray-400">Duration</div>
                <div>{formatDuration(video.duration)}</div>

                <div className="text-gray-400">Resolution</div>
                <div>{video.resolution}</div>

                <div className="text-gray-400">Date Modified</div>
                <div>{new Date(video.lastModified).toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>

        {/* Notes / Comments Section */}
        <div className="mt-8 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-bold">Notes</h2>
            <span className="text-gray-400 text-sm font-medium">
              {(meta.notes || []).length}
            </span>
          </div>

          <form onSubmit={handleAddNote} className="flex gap-4 mb-8">
            <div className="w-10 h-10 rounded-full bg-[#3ea6ff] text-black font-bold flex items-center justify-center shrink-0">
              {currentUser.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 flex flex-col">
              <input
                type="text"
                placeholder="Add a note to this video..."
                className="bg-transparent border-b border-gray-600 focus:border-[#3ea6ff] pb-2 focus:outline-none text-sm placeholder:text-gray-400 transition-colors w-full"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              {newNote.trim() && (
                <div className="flex justify-end gap-2 mt-3 animate-in fade-in duration-200">
                  <button
                    type="button"
                    onClick={() => setNewNote("")}
                    className="px-4 py-2 hover:bg-[#272727] rounded-full text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#3ea6ff] text-black hover:bg-[#65b8ff] rounded-full text-sm font-bold transition-colors"
                  >
                    Create Note
                  </button>
                </div>
              )}
            </div>
          </form>

          <div className="flex flex-col gap-6">
            {(meta.notes || [])
              .sort((a, b) => b.id - a.id)
              .map((note) => (
                <div key={note.id} className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-[#272727] flex items-center justify-center shrink-0">
                    <MessageSquare size={18} className="text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">
                        {currentUser}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(note.id).toLocaleDateString()}
                      </span>
                      {note.timestamp > 0 && (
                        <button
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = note.timestamp;
                              if (videoRef.current.paused)
                                videoRef.current.play();
                              setIsPlaying(true);
                            }
                          }}
                          className="text-[#3ea6ff] hover:underline text-xs font-medium ml-2 bg-[#3ea6ff]/10 px-2 py-0.5 rounded"
                        >
                          {formatDuration(note.timestamp)}
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">
                      {note.text}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-2 text-gray-500 hover:text-red-500 hover:bg-[#272727] rounded-full transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Right Column: Up Next */}
      <div
        className={`flex flex-col ${isTheater ? "lg:col-start-2 lg:col-end-3" : "lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-span-2 pt-9 lg:pt-0"}`}
      >
        {/* Header moved inside the scrollable area */}

        <div
          className="flex flex-col gap-3 overflow-y-auto pr-2 pb-10 custom-scrollbar"
          style={{ maxHeight: "calc(100vh - 120px)" }}
        >
          {(() => {
            const renderVideoCard = (v, isQueued = false) => {
              const metaV = videoMeta[v.id];
              const progressPercent =
                metaV && metaV.progress && v.duration
                  ? (metaV.progress / v.duration) * 100
                  : 0;
              return (
                <div
                  key={v.id}
                  className={`flex gap-3 group cursor-pointer hover:bg-[#202020] p-1 -ml-1 rounded-lg transition-colors ${openMenuId === v.id ? "z-[100] relative" : "relative"}`}
                  onClick={() => onSelectVideo(v)}
                >
                  <div className="w-40 aspect-video bg-[#121212] rounded-lg overflow-hidden shrink-0 relative">
                    {v.thumbnail ? (
                      <img
                        src={v.thumbnail}
                        alt={v.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <span className="text-gray-600 text-[10px] flex items-center justify-center h-full w-full">
                        No Thumbnail
                      </span>
                    )}
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1 rounded text-xs font-medium">
                      {formatDuration(v.duration)}
                    </div>
                    {progressPercent > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600/50">
                        <div
                          className="h-full bg-red-600"
                          style={{
                            width: `${Math.min(progressPercent, 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden py-0.5">
                    <h4
                      className="text-sm font-semibold truncate leading-tight group-hover:text-[#3ea6ff] transition-colors"
                      title={v.name}
                    >
                      {formatTitle(v.name)}
                    </h4>
                    {isQueued && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-[#3ea6ff]/20 text-[#3ea6ff] text-[10px] uppercase font-bold rounded">
                        Queued
                      </span>
                    )}
                    <p className={`text-xs text-gray-400 truncate ${isQueued ? 'mt-0.5' : 'mt-1'}`}>
                      {v.folderId}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatBytes(v.size)}
                    </p>
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === v.id ? null : v.id);
                      }}
                      className="p-1 text-gray-400 hover:text-white hover:bg-[#303030] rounded-full transition-colors opacity-0 group-hover:opacity-100 py-1"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {openMenuId === v.id && (
                      <div
                        className="upnext-menu-dropdown absolute right-4 top-full mt-1 w-48 bg-[#202020] border border-[#303030] rounded-xl shadow-2xl overflow-hidden z-[100]"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => handleAddToQueue(e, v)}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-[#303030] flex items-center gap-3 transition-colors"
                        >
                          <ListPlus size={16} className="text-gray-400" />
                          Add to queue
                        </button>
                        <button
                          onClick={(e) => handleWatchLater(e, v)}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-[#303030] flex items-center gap-3 transition-colors"
                        >
                          <Play size={16} className="text-gray-400" />
                          Save to Watch Later
                        </button>
                        <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 border-t border-[#303030] mt-1">
                          Options
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateMeta(v.id, { isHidden: true });
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
              );
            };

            return (
              <div className="relative">
                <div className="flex items-center justify-between mb-4 sticky top-0 bg-[#0f0f0f] z-10 py-2">
                  <h3 className="font-bold text-lg">Up Next</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 font-medium">Autoplay</span>
                    <button
                      onClick={() => setAutoplay(!autoplay)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${autoplay ? "bg-red-600" : "bg-[#3f3f3f]"}`}
                    >
                      <div
                        className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all shadow-sm ${autoplay ? "left-[22px]" : "left-[3px]"}`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {[...activeQueue, ...upNextVideos].slice(0, 15).map((v) => renderVideoCard(v, activeQueue.some(q => q.id === v.id)))}
                  {upNextVideos.length === 0 && activeQueue.length === 0 && (
                    <div className="text-sm text-gray-500 mt-4">
                      No other videos in your library.
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Modern Save to Playlist Modal */}
      {showSaveMenu && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowSaveMenu(false)}
        >
          <div
            className="w-[400px] max-w-[90vw] bg-[#202020] border border-[#303030] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#303030]">
              <h2 className="text-xl font-semibold">Save video to...</h2>
              <button
                onClick={() => setShowSaveMenu(false)}
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-[#303030] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Playlists List */}
            <div className="flex flex-col max-h-[350px] overflow-y-auto p-4 gap-1 custom-scrollbar">
              {userPlaylists.map((pl) => {
                const isChecked = (meta.playlists || []).includes(pl);
                return (
                  <div
                    key={pl}
                    onClick={() => handleTogglePlaylist(pl)}
                    className="flex items-center gap-4 cursor-pointer hover:bg-[#303030] p-3 rounded-xl transition-colors group"
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${isChecked ? "bg-[#3ea6ff] border-[#3ea6ff]" : "border-gray-500 group-hover:border-gray-400"}`}
                    >
                      {isChecked && (
                        <svg
                          className="w-3.5 h-3.5 text-black stroke-black"
                          viewBox="0 0 14 14"
                          fill="none"
                        >
                          <path
                            d="M3 7.5L6 10.5L11 3.5"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-base text-gray-200">{pl}</span>
                  </div>
                );
              })}
              {userPlaylists.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No playlists available
                </div>
              )}
            </div>

            {/* Create New Footer */}
            <div className="p-5 border-t border-[#303030] bg-[#1a1a1a]">
              <form
                onSubmit={handleCreatePlaylist}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <Plus size={20} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Create new playlist..."
                    className="bg-transparent border-b border-gray-600 focus:border-[#3ea6ff] pb-1 focus:outline-none text-base w-full placeholder:text-gray-500 transition-colors"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                  />
                </div>
                {newPlaylistName.trim() && (
                  <button
                    type="submit"
                    className="self-end text-[#3ea6ff] hover:text-[#5eb5ff] hover:bg-[#3ea6ff]/10 px-4 py-1.5 rounded-full font-medium transition-colors text-sm"
                  >
                    Create
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
