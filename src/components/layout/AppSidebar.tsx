import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

export default function AppSidebar() {
  const [menuOpen, setMenuOpen] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const phone = localStorage.getItem('directkit_phone') || '';

  const handleLogout = () => {
    localStorage.removeItem('directkit_auth');
    localStorage.removeItem('directkit_phone');
    navigate('/auth');
    toast({ title: '👋 До встречи!', description: 'Вы вышли из системы' });
  };

  return (
    <>
      <aside className={`fixed top-0 left-0 h-full bg-white border-r border-slate-200 transition-all duration-300 z-50 ${
        menuOpen ? 'w-64' : 'w-20'
      }`}>
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon name="Zap" size={20} className="text-white" />
            </div>
            {menuOpen && (
              <div className="overflow-hidden">
                <h2 className="font-bold text-lg bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  DirectKit
                </h2>
              </div>
            )}
          </div>
        </div>

        <nav className="p-4 space-y-2">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => navigate('/projects')}
          >
            <Icon name="FolderOpen" size={20} />
            {menuOpen && <span>Мои проекты</span>}
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => navigate('/clustering-projects')}
          >
            <Icon name="Search" size={20} />
            {menuOpen && <span>AI Сбор семантики</span>}
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => navigate('/rsya-projects')}
          >
            <Icon name="ShieldOff" size={20} />
            {menuOpen && <span>Чистка РСЯ</span>}
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name="Settings" size={20} />
            {menuOpen && <span>Настройки</span>}
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
          <div className={`flex items-center gap-3 mb-3 ${!menuOpen && 'justify-center'}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
              {phone.slice(3, 4)}
            </div>
            {menuOpen && (
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{phone}</p>
              </div>
            )}
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size={menuOpen ? 'default' : 'icon'}
            className="w-full"
          >
            <Icon name="LogOut" size={18} />
            {menuOpen && <span className="ml-2">Выйти</span>}
          </Button>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50"
        >
          <Icon name={menuOpen ? 'ChevronLeft' : 'ChevronRight'} size={14} />
        </button>
      </aside>
      
      <div className={`transition-all duration-300 ${menuOpen ? 'ml-64' : 'ml-20'}`}>
      </div>
    </>
  );
}
