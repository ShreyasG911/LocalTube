import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useLibrary } from '../context/LibraryContext';

export default function Layout({ children, isVideoPlaying }) {
  const { isSidebarCollapsed } = useLibrary();

  const marginLeft = isSidebarCollapsed ? 'ml-[72px]' : 'ml-64';

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex font-sans">
      <Sidebar isVideoPlaying={isVideoPlaying} />
      <div className={`flex-1 ${marginLeft} flex flex-col transition-all duration-200 min-w-0`}>
        <Navbar />
        <main className={`mt-14 ${isVideoPlaying ? 'p-0' : 'p-6'} transition-all duration-200`}>
          {children}
        </main>
      </div>
    </div>
  );
}
