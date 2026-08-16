import { Mail, User, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-[#800000] text-white flex items-center justify-between px-6 py-4 border-b-4 border-black">
      {/* --- Bal oldal: Ikonok és Menüpontok --- */}
      <div className="flex items-center space-x-10">
        <Link to="/" className="cursor-pointer">
          <span className="inline-flex items-center justify-center text-2xl font-bold border-2 border-white w-12 h-10 leading-none">
            ƎK
          </span>
        </Link>

        <div className="hidden md:flex space-x-6 text-lg font-medium">
          <Link to="/naptar" className="hover:text-gray-300 transition-colors">Naptár</Link>
          <Link to="/ai" className="hover:text-gray-300 transition-colors">AI Asszisztens</Link>
          <Link to="/kalkulator" className="hover:text-gray-300 transition-colors">Kalkulátorok</Link>
          <Link to="/ertekelo" className="hover:text-gray-300 transition-colors">Tárgyértékelés</Link>
          <Link to="/hivatkozas" className="hover:text-gray-300 transition-colors">Hivatkozás Generátor</Link>
        </div>
      </div>

      {/* --- Jobb oldal: Ikonok --- */}
      <div className="flex items-center space-x-4">
        <Mail className="w-6 h-6 cursor-pointer hover:text-gray-300" />
        <Link to="/login">
          <User className="w-6 h-6 cursor-pointer hover:text-gray-300 transition-colors" />
        </Link>
        <Menu className="w-7 h-7 cursor-pointer hover:text-gray-300" />
      </div>
    </nav>
  );
}