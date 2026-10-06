# LocalTube

**LocalTube** is a blazing-fast, privacy-first Progressive Web Application (PWA) that transforms your local video folders into a beautiful, YouTube-style streaming interface. 

The core philosophy of LocalTube is simple: **"Your videos. Your PC. Your interface. Nothing needs to be uploaded."** 

LocalTube reads video files directly from your hard drive securely through your browser. It never uploads a single byte of data to the internet, ensuring 100% absolute privacy.

## ✨ Features

- 🚫 **100% Offline & Private:** Everything stays on your local machine. No servers, no uploads, no tracking.
- 📱 **Installable PWA:** Install LocalTube as a standalone desktop application. It runs in its own sleek, borderless window just like a native app.
- 🎨 **Premium UI/UX:** A stunning, modern dark-mode interface featuring buttery-smooth Apple-style animations, responsive design, and glassmorphism elements.
- 👤 **Multiple User Profiles:** Share the app with family members. Each profile maintains its own completely separate watch history, playlists, and settings.
- 🎬 **Custom Video Player:**
  - **Theater Mode & Picture-in-Picture**
  - **Auto-Play Up Next Feed**
  - **Playback Speed Controls**
  - **Progress Tracking:** Always remember exactly where you left off.
  - **Time-stamped Notes:** Add personal, clickable notes to specific moments in a video.
- 📚 **Smart Library Management:**
  - **Auto-Sorting:** Videos over 1 hour are automatically categorized into your "Movies" playlist.
  - **Custom Playlists:** Create, rename, and manage custom playlists seamlessly.
  - **Magic Feed:** A deterministic, randomized shuffle feed to help you rediscover your library.
  - **Folders & Search:** Connect multiple local folders and search across your entire library instantly.
- 💾 **Persistent Data:** Uses `IndexedDB` and `localStorage` to securely save your history, favorites, settings, and library metadata across sessions.

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/LocalTube.git
cd LocalTube
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open `http://localhost:5173` in your browser.

### Building for Production
To build the application for deployment (such as GitHub Pages):
```bash
npm run build
```
This will output the optimized static files into the `dist` directory, fully configured with Service Workers for offline PWA capabilities.

## 🛠 Tech Stack
- **Framework:** React + Vite
- **Styling:** Vanilla CSS + TailwindCSS (for utility layout structure)
- **Icons:** Lucide React
- **Database:** IndexedDB (idb)
- **PWA:** vite-plugin-pwa

## 📄 License
This project is open-source and available under the MIT License.
