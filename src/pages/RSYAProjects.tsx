import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import AppSidebar from '@/components/layout/AppSidebar';
import { useNavigate } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export default function RSYAProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    const project: Project = {
      id: Date.now().toString(),
      name: newProjectName.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setProjects([project, ...projects]);
    setNewProjectName('');
    setIsCreating(false);
    navigate('/rsya-cleaner');
  };

  if (projects.length === 0 && !isCreating) {
    return (
      <>
        <AppSidebar />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8 ml-64">
          <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Чистка РСЯ</h1>
            <p className="text-lg text-slate-600">Создайте проект для чистки площадок РСЯ</p>
          </div>

          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto">
                <Icon name="FolderPlus" className="h-12 w-12 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Нет проектов</h2>
                <p className="text-slate-600">Создайте первый проект для начала работы</p>
              </div>
              <Button
                onClick={() => setIsCreating(true)}
                size="lg"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                <Icon name="Plus" className="mr-2 h-5 w-5" />
                Создать проект
              </Button>
            </div>
          </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8 ml-64">
        <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Чистка РСЯ</h1>
            <p className="text-lg text-slate-600">{projects.length} проектов</p>
          </div>
          <Button
            onClick={() => setIsCreating(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
          >
            <Icon name="Plus" className="mr-2 h-5 w-5" />
            Новый проект
          </Button>
        </div>

        {isCreating && (
          <Card className="p-6 mb-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <h3 className="font-semibold text-lg text-slate-900 mb-4">Создание нового проекта</h3>
            <div className="flex gap-3">
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Название проекта"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateProject();
                  if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewProjectName('');
                  }
                }}
                autoFocus
              />
              <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                Создать
              </Button>
              <Button
                onClick={() => {
                  setIsCreating(false);
                  setNewProjectName('');
                }}
                variant="outline"
              >
                Отмена
              </Button>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="p-6 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate('/rsya-cleaner')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center">
                    <Icon name="Folder" className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">{project.name}</h3>
                    <p className="text-sm text-slate-500">
                      Обновлён: {new Date(project.updatedAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
                <Icon name="ChevronRight" className="h-5 w-5 text-slate-400" />
              </div>
            </Card>
          ))}
        </div>
        </div>
      </div>
    </>
  );
}