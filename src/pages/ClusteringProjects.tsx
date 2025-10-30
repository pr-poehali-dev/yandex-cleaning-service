import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { useNavigate } from 'react-router-dom';
import AppSidebar from '@/components/layout/AppSidebar';

const API_URL = 'https://functions.poehali.dev/06df3397-13af-46f0-946a-f5d38aa6f60f';

interface Project {
  id: number;
  name: string;
  domain?: string;
  createdAt: string;
  updatedAt: string;
  keywordsCount: number;
  clustersCount: number;
  minusWordsCount: number;
  status: string;
}

const PROJECT_COLORS = [
  'from-emerald-500 to-teal-500',
  'from-green-500 to-emerald-500',
  'from-teal-500 to-cyan-500',
  'from-cyan-500 to-blue-500',
  'from-lime-500 to-green-500',
];

export default function ClusteringProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
  const navigate = useNavigate();

  const userId = localStorage.getItem('userId');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    if (!userId) {
      navigate('/login');
      return;
    }

    const cacheKey = `clustering_projects_${userId}`;
    const cachedData = localStorage.getItem(cacheKey);
    const cacheTime = localStorage.getItem(`${cacheKey}_time`);
    const now = Date.now();
    
    if (cachedData && cacheTime && (now - parseInt(cacheTime)) < 60000) {
      setProjects(JSON.parse(cachedData));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?endpoint=projects`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        }
      });

      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        localStorage.setItem(cacheKey, JSON.stringify(data.projects || []));
        localStorage.setItem(`${cacheKey}_time`, now.toString());
      } else {
        toast.error('Ошибка загрузки проектов');
      }
    } catch (error) {
      toast.error('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Введите название проекта');
      return;
    }

    if (!userId) {
      navigate('/login');
      return;
    }

    try {
      const res = await fetch(`${API_URL}?endpoint=projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({
          name: newProjectName,
          domain: '',
          intentFilter: 'all'
        })
      });

      if (res.ok) {
        const newProject = await res.json();
        setProjects([newProject, ...projects]);
        setNewProjectName('');
        setIsDialogOpen(false);
        navigate(`/clustering/${newProject.id}`);
        toast.success(`Проект "${newProjectName}" создан`);
      } else {
        toast.error('Ошибка создания проекта');
      }
    } catch (error) {
      toast.error('Ошибка соединения');
    }
  };

  const handleOpenProject = (projectId: number) => {
    navigate(`/clustering/${projectId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, projectId: number) => {
    e.stopPropagation();
    setProjectToDelete(projectId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete || !userId) return;

    try {
      const res = await fetch(`${API_URL}?endpoint=projects&id=${projectToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        }
      });

      if (res.ok) {
        const project = projects.find(p => p.id === projectToDelete);
        const updatedProjects = projects.filter(p => p.id !== projectToDelete);
        setProjects(updatedProjects);
        setDeleteDialogOpen(false);
        setProjectToDelete(null);
        toast.success(`Проект "${project?.name}" удалён из базы данных`);
      } else {
        toast.error('Ошибка удаления проекта');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Ошибка соединения');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Неизвестно';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <>
        <AppSidebar />
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 flex items-center justify-center ml-64">
          <div className="text-center">
            <Icon name="Loader2" size={48} className="animate-spin text-emerald-600 mx-auto mb-4" />
            <p className="text-slate-600">Загрузка проектов...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 p-4 md:p-8 ml-64">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-semibold text-slate-800 mb-2 tracking-tight">
                Кластеризация ключей
              </h1>
              <p className="text-slate-500">Управление проектами кластеризации</p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2 shadow-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                  <Icon name="Plus" size={20} />
                  Создать проект
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создать новый проект</DialogTitle>
                  <DialogDescription>Введите название проекта для кластеризации</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="projectName">Название проекта</Label>
                    <Input
                      id="projectName"
                      placeholder="Например: Недвижимость Москва"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                    />
                  </div>
                  <Button onClick={handleCreateProject} className="w-full">
                    Создать
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Icon name="Search" size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Поиск по проектам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                <Icon name="FolderOpen" size={32} className="text-slate-400" />
              </div>
              <h3 className="text-xl font-medium text-slate-700 mb-2">Нет проектов</h3>
              <p className="text-slate-500 mb-6">Создайте первый проект для начала работы</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project, index) => (
                <Card
                  key={project.id}
                  className="group relative overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-emerald-300"
                  onClick={() => handleOpenProject(project.id)}
                >
                  <div className={`h-2 bg-gradient-to-r ${PROJECT_COLORS[index % PROJECT_COLORS.length]}`} />
                  
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">
                        {project.name}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity -mt-2 -mr-2 hover:bg-red-50 hover:text-red-600"
                        onClick={(e) => handleDeleteClick(e, project.id)}
                      >
                        <Icon name="Trash2" size={18} />
                      </Button>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Icon name="Calendar" size={16} className="text-slate-400" />
                        <span>Создан: {formatDate(project.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Icon name="Key" size={16} className="text-emerald-500" />
                        <span><strong>{project.keywordsCount}</strong> ключевых слов</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Icon name="Layers" size={16} className="text-teal-500" />
                        <span><strong>{project.clustersCount}</strong> кластеров</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full group-hover:bg-emerald-50 group-hover:border-emerald-300 group-hover:text-emerald-700 transition-all"
                    >
                      Открыть проект
                      <Icon name="ArrowRight" size={16} className="ml-2" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить проект?</DialogTitle>
            <DialogDescription>
              Это действие нельзя отменить. Проект и все его данные будут удалены.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="flex-1">
              Отмена
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className="flex-1">
              Удалить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}