import { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, SkipForward, Maximize2 } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { verifyPermission } from '../services/fileSystem';

export default function MiniPlayer({ video, onExpand, onClose, onNext }) {
  const [videoUrl, setVideoUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);

  useEffect(() => {
    let url;
    const loadFile = async () => {
      try {
        const hasPermission = await verifyPermission(video.handle);
        if (!hasPermission) return;
        const file = await video.handle.getFile();
        url = URL.createObjectURL(file);
        setVideoUrl(url);
      } catch (err) {
        console.error("Failed to load video in mini player", err);
      }
    };
    loadFile();
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [video]);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (onNext) {
      setTimeout(onNext, 500);
    }
  };

  if (!videoUrl) return null;

  return (
    <div 
      onClick={onExpand}
      className="fixed bottom-6 right-6 w-80 bg-[#181818] border border-[#303030] rounded-xl shadow-2xl overflow-hidden z-[90] cursor-pointer group hover:border-[#4f4f4f] transition-all"
    >
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleEnded}
          autoPlay
          
        />
        
        {/* Controls Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
          <button 
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 hover:scale-110 transition-all"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 hover:scale-110 transition-all"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>
        </div>

        {/* Top Right Controls */}
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            className="p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
          >
            <Maximize2 size={14} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full bg-red-600" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="p-3 bg-[#181818]">
        <h4 className="text-sm font-semibold truncate text-white">{video.name}</h4>
        <p className="text-xs text-gray-400 mt-0.5">Playing from Queue</p>
      </div>
    </div>
  );
}
