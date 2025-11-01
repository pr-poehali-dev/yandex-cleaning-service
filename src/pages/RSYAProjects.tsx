import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import AppSidebar from '@/components/layout/AppSidebar';
import func2url from '../../backend/func2url.json';

interface Project {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  has_token: boolean;
}

const RSYA_PROJECTS_URL = func2url['rsya-projects'] || 'https://functions.poehali.dev/08f68ba6-cbbb-4ca1-841f-185671e0757d';

export default function RSYAProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id') || '1';
    setUserId(storedUserId);
    loadProjects(storedUserId);
  }, []);

  const loadProjects = async (uid: string) => {
    setLoading(true);
    try {
      const response = await fetch(RSYA_PROJECTS_URL, {
        method: 'GET',
        headers: {
          'X-User-Id': uid
        }
      });

      if (!response.ok) throw new Error('Ошибка загрузки проектов');

      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить проекты', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    setLoading(true);
    try {
      const response = await fetch(RSYA_PROJECTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({
          name: `Проект ${new Date().toLocaleDateString()}`
        })
      });

      if (!response.ok) throw new Error('Ошибка создания проекта');

      const data = await response.json();
      setProjects([data.project, ...projects]);
      
      toast({ title: '✅ Проект создан!', description: 'Переходим к настройке...' });
      
      navigate(`/rsya/${data.project.id}`);
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось создать проект', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Удалить проект?')) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${RSYA_PROJECTS_URL}?project_id=${projectId}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': userId
        }
      });

      if (!response.ok) throw new Error('Ошибка удаления');

      setProjects(projects.filter(p => p.id !== projectId));
      toast({ title: '✅ Проект удалён' });
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось удалить проект', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 p-8 ml-64">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Проекты РСЯ</h1>
              <p className="text-lg text-slate-600">Управление проектами чистки Рекламной сети Яндекса</p>
            </div>
            <Button
              onClick={createProject}
              disabled={loading}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
            >
              {loading ? (
                <>
                  <Icon name="Loader2" className="mr-2 h-5 w-5 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <Icon name="Plus" className="mr-2 h-5 w-5" />
                  Создать проект
                </>
              )}
            </Button>
          </div>

          {projects.length === 0 && !loading && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <Icon name="Folder" className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-blue-900 mb-2">Проектов пока нет</h3>
                  <p className="text-blue-700 mb-4">Создайте первый проект для начала работы с РСЯ</p>
                  <Button
                    onClick={createProject}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Icon name="Plus" className="mr-2 h-5 w-5" />
                    Создать первый проект
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {projects.map(project => (
              <Card 
                key={project.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/rsya/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <Icon name="Folder" className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{project.name}</CardTitle>
                        <p className="text-sm text-slate-500 mt-1">
                          Создан: {new Date(project.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {project.has_token && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          <Icon name="CheckCircle" className="h-4 w-4" />
                          Подключён
                        </div>
                      )}
                      {!project.has_token && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                          <Icon name="AlertCircle" className="h-4 w-4" />
                          Требуется авторизация
                        </div>
                      )}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/rsya/${project.id}`);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Icon name="ArrowRight" className="mr-2 h-4 w-4" />
                        Открыть
                      </Button>
                      <Button
                        onClick={(e) => deleteProject(project.id, e)}
                        variant="outline"
                        size="icon"
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Icon name="Trash2" className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
