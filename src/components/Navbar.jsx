import { Search, FolderPlus, Plus, Menu, PlaySquare } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const { addFolder, searchQuery, setSearchQuery, currentUser, users, switchUser, addUser, setCurrentView, isSidebarCollapsed, setIsSidebarCollapsed } = useLibrary();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search Debounce Effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [localSearch, setSearchQuery]);

  // Sync external search clears
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleAddUser = () => {
    const name = prompt("Enter new user name:");
    if (name && name.trim()) {
      addUser(name.trim());
      setShowUserMenu(false);
    }
  };

  return (
    <nav className="h-14 fixed top-0 right-0 left-0 bg-[#0f0f0f]/95 backdrop-blur-sm z-50 flex items-center justify-between px-4 border-b border-[#272727]">
      {/* Left side: Menu and Logo */}
      <div className="flex items-center gap-4 min-w-[200px]">
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
          className="p-2 hover:bg-[#272727] rounded-full active:scale-95 transition-all duration-200 text-white"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2 text-xl font-bold cursor-pointer active:scale-95 transition-all duration-200" onClick={() => {
          setCurrentView('Home');
          window.dispatchEvent(new CustomEvent('go-home'));
        }}>
          <div className="bg-red-600 p-1.5 rounded-lg">
            <PlaySquare className="fill-white w-5 h-5 text-transparent" />
          </div>
          <span>Local<span className="font-light">Tube</span></span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-2xl flex items-center">
        <div className="w-full bg-[#121212] border border-[#303030] rounded-full flex items-center px-4 py-2 focus-within:border-[#3ea6ff] focus-within:ml-[-1px] transition-all shadow-inner">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input 
            type="text" 
            placeholder="Search your videos..." 
            className="bg-transparent border-none outline-none text-white w-full px-3 text-sm placeholder-gray-500"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4 ml-4">
        <button onClick={addFolder} className="flex items-center gap-2 bg-[#272727] hover:bg-[#3f3f3f] active:scale-95 transition-all duration-200 text-sm font-medium py-2 px-4 rounded-full border border-transparent hover:border-[#4f4f4f]">
          <FolderPlus size={18} />
          <span>Add Folder</span>
        </button>
        {/* User Profile */}
        <div className="relative" ref={dropdownRef}>
          <div 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-8 h-8 rounded-full bg-[#3ea6ff] text-white flex items-center justify-center text-sm font-semibold cursor-pointer select-none active:scale-95 transition-all duration-200 hover:ring-2 hover:ring-[#3ea6ff]/50"
          >
            {currentUser.charAt(0).toUpperCase()}
          </div>
          
          {showUserMenu && (
            <div className="absolute right-0 top-10 w-48 bg-[#202020] border border-[#303030] rounded-xl shadow-xl py-2 flex flex-col z-50 animate-pop-in">
              <div className="px-4 py-2 border-b border-[#303030] mb-2">
                <span className="text-xs text-gray-400">Current User</span>
                <div className="font-semibold truncate">{currentUser}</div>
              </div>
              
              {users.map(u => (
                <button 
                  key={u}
                  onClick={() => { switchUser(u); setShowUserMenu(false); }}
                  className={`px-4 py-2 text-left text-sm hover:bg-[#303030] truncate ${u === currentUser ? 'text-[#3ea6ff]' : 'text-white'}`}
                >
                  {u}
                </button>
              ))}
              
              <div className="h-px bg-[#303030] my-1" />
              
              <button 
                onClick={handleAddUser}
                className="px-4 py-2 text-left text-sm hover:bg-[#303030] text-gray-300 flex items-center gap-2"
              >
                <Plus size={14} /> Add User
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
