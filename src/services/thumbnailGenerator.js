export async function extractVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        url: url,
        videoElement: video
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video metadata"));
    };
  });
}

export async function generateThumbnail(videoElement, seekTimeInSeconds = 5) {
  return new Promise((resolve) => {
    videoElement.currentTime = seekTimeInSeconds;

    videoElement.onseeked = () => {
      const canvas = document.createElement('canvas');
      // Resize thumbnail to save space in IndexedDB (e.g. 480p width)
      const scale = Math.min(640 / videoElement.videoWidth, 1);
      canvas.width = videoElement.videoWidth * scale;
      canvas.height = videoElement.videoHeight * scale;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      
      resolve(dataUrl);
    };

    videoElement.onerror = () => {
      resolve(null); 
    };
  });
}

export async function processVideoFile(file) {
  try {
    const metadata = await extractVideoMetadata(file);
    // Seek to 15% of the video to avoid black intro screens
    const seekTime = Math.min(metadata.duration * 0.15, 120); 
    const thumbnail = await generateThumbnail(metadata.videoElement, seekTime);
    
    URL.revokeObjectURL(metadata.url); // Memory cleanup
    
    return {
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      thumbnail: thumbnail
    };
  } catch (error) {
    console.error("Error processing video:", error);
    return {
      duration: 0,
      width: 0,
      height: 0,
      thumbnail: null
    };
  }
}
