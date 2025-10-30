import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import { useNavigate } from 'react-router-dom';
import AppSidebar from '@/components/layout/AppSidebar';

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

export default function ClusteringProjects() {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
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
    navigate(`/clustering/${newProject.id}`);
    toast({ 
      title: '✅ Проект создан', 
      description: `Проект "${newProjectName}" успешно создан` 
    });
  };

  const handleOpenProject = (projectId: string) => {
    navigate(`/clustering/${projectId}`);
  };

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 ml-64">
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">AI Сбор семантики</h1>
                <p className="text-slate-600">
                  Управляйте проектами по кластеризации ключевых слов
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
                    <DialogTitle>Новый проект кластеризации</DialogTitle>
                    <DialogDescription>
                      Введите название для нового проекта
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
                <h3 className="text-xl font-semibold mb-2">Нет проектов</h3>
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
                    className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-emerald-300"
                    onClick={() => handleOpenProject(project.id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center">
                        <Icon name="Sparkles" size={24} className="text-white" />
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(project.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-3 text-slate-900">{project.name}</h3>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Icon name="Key" size={16} className="text-emerald-500" />
                        <span>{project.keywordsCount} ключей</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icon name="Grid" size={16} className="text-emerald-500" />
                        <span>{project.clustersCount} кластеров</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
