import { Mail, User, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-[#800000] text-white flex items-center justify-between px-6 py-4 border-b-4 border-black">
      <div className="flex items-center space-x-12">
        <Link to="/" className="cursor-pointer">
          <span className="text-2xl font-bold border-2 border-white px-2">ƎK</span>
        </Link>

        {/* --- Menüpontok --- */}
        <div className="hidden md:flex space-x-6 text-lg font-medium">
          <Link to="/kalendar" className="hover:text-gray-300">Kalendar</Link>
          <Link to="/ai" className="hover:text-gray-300">AI</Link>
          <Link to="/szamologep" className="hover:text-gray-300">Számológép</Link>
          <Link to="/review" className="hover:text-gray-300">Review</Link>
          <Link to="/hivatkozas" className="hover:text-gray-300">Hivatkozás gen</Link>
        </div>
      </div>

      {/* --- Jobb oldali ikonok --- */}
      <div className="flex items-center space-x-4">
        <Mail className="w-6 h-6 cursor-pointer hover:text-gray-300" />
        <User className="w-6 h-6 cursor-pointer hover:text-gray-300" />
        <Menu className="w-7 h-7 cursor-pointer hover:text-gray-300" />
      </div>
    </nav>
  );
}