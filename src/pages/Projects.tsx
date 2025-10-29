import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import { useNavigate } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  createdAt: string;
  keywordsCount: number;
  clustersCount: number;
}

const mockProjects: Project[] = [
  { id: '1', name: 'Недвижимость Москва', createdAt: '2024-10-28', keywordsCount: 1250, clustersCount: 18 },
  { id: '2', name: 'Клининг СПб', createdAt: '2024-10-25', keywordsCount: 840, clustersCount: 12 },
  { id: '3', name: 'Ремонт квартир', createdAt: '2024-10-20', keywordsCount: 620, clustersCount: 9 }
];

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();


  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      toast({ title: 'Введите название проекта', variant: 'destructive' });
      return;
    }

    const newProject: Project = {
      id: Date.now().toString(),
      name: newProjectName,
      createdAt: new Date().toISOString().split('T')[0],
      keywordsCount: 0,
      clustersCount: 0
    };

    setProjects([newProject, ...projects]);
    setNewProjectName('');
    setIsDialogOpen(false);
    toast({ 
      title: '✅ Проект создан', 
      description: `Проект "${newProjectName}" успешно создан` 
    });
  };

  const handleOpenProject = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('directkit_auth');
    localStorage.removeItem('directkit_phone');
    navigate('/auth');
    toast({ title: '👋 До встречи!', description: 'Вы вышли из системы' });
  };

  const phone = localStorage.getItem('directkit_phone') || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50">
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
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-50 text-emerald-700 font-medium hover:bg-emerald-100 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name="FolderOpen" size={20} />
            {menuOpen && <span>Мои проекты</span>}
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => navigate('/wordstat')}
          >
            <Icon name="Search" size={20} />
            {menuOpen && <span>Сбор семантики</span>}
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => navigate('/rsya-cleaner')}
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

      <main className={`transition-all duration-300 ${menuOpen ? 'ml-64' : 'ml-20'}`}>
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Мои проекты</h1>
                <p className="text-slate-600">
                  Управляйте проектами по сбору семантики
                </p>
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="lg"
                    className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
                  >
                    <Icon name="Plus" size={20} className="mr-2" />
                    Создать проект
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Новый проект</DialogTitle>
                    <DialogDescription>
                      Введите название для нового проекта по сбору семантики
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="projectName">Название проекта</Label>
                      <Input
                        id="projectName"
                        placeholder="Например: Недвижимость Москва"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                        autoFocus
                      />
                    </div>
                    <Button 
                      onClick={handleCreateProject}
                      className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
                    >
                      Создать проект
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {projects.length === 0 ? (
              <Card className="p-12 text-center">
                <Icon name="FolderOpen" size={64} className="mx-auto mb-4 text-slate-300" />
                <h3 className="text-xl font-semibold mb-2 text-slate-700">Нет проектов</h3>
                <p className="text-slate-500 mb-6">Создайте первый проект для начала работы</p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
                >
                  <Icon name="Plus" size={20} className="mr-2" />
                  Создать проект
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <Card 
                    key={project.id}
                    className="hover:shadow-lg transition-all cursor-pointer group border hover:border-green-200 bg-white"
                    onClick={() => handleOpenProject(project.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Icon name="FolderOpen" size={24} className="text-green-600" />
                        </div>
                        <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Icon name="MoreVertical" size={18} />
                        </Button>
                      </div>
                      <CardTitle className="text-xl">
                        {project.name}
                      </CardTitle>
                      <CardDescription>
                        Создан {new Date(project.createdAt).toLocaleDateString('ru-RU')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Icon name="Key" size={16} className="text-green-500" />
                          <span>{project.keywordsCount} ключей</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Icon name="Layers" size={16} className="text-teal-500" />
                          <span>{project.clustersCount} кластеров</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}