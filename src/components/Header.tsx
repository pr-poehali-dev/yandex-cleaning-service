import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            onClick={() => navigate('/clustering')}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Icon name="Sparkles" className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-slate-800">AI сбор ключей</span>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/how-to-use')}
                className="text-slate-600 hover:text-slate-800"
              >
                <Icon name="HelpCircle" className="h-4 w-4 mr-2" />
                Как пользоваться
              </Button>
              <div className="text-sm text-slate-600">
                {user.phone}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                <Icon name="User" size={14} className="text-slate-500" />
                <span className="text-xs font-mono text-slate-700">
                  {user.userId}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-600 hover:text-slate-800"
              >
                <Icon name="LogOut" className="h-4 w-4 mr-2" />
                Выйти
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}