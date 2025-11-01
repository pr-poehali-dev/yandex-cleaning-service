import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import AppSidebar from '@/components/layout/AppSidebar';
import RSYAConnectionCard from '@/components/rsya/RSYAConnectionCard';
import { useAuth } from '@/contexts/AuthContext';
import func2url from '../../backend/func2url.json';

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface Goal {
  id: string;
  name: string;
  type: string;
}

const YANDEX_DIRECT_URL = 'https://functions.poehali.dev/6b18ca7b-7f12-4758-a9db-4f774aaf2d23';
const RSYA_PROJECTS_URL = func2url['rsya-projects'] || 'https://functions.poehali.dev/08f68ba6-cbbb-4ca1-841f-185671e0757d';

export default function RSYASettings() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [projectName, setProjectName] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [clientLogin, setClientLoginState] = useState('');
  
  const setClientLogin = (value: string) => {
    setClientLoginState(value);
    if (value.trim()) {
      localStorage.setItem('yandex_client_login', value.trim());
    } else {
      localStorage.removeItem('yandex_client_login');
    }
  };

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id || !projectId) {
      navigate('/rsya');
      return;
    }
    
    loadProject(user.id.toString(), projectId);
  }, [projectId, user, navigate]);

  const loadProject = async (uid: string, pid: string) => {
    try {
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      
      if (accessToken) {
        console.log('🔑 OAuth токен получен, сохраняем в БД...', { uid, pid, tokenLength: accessToken.length });
        await saveTokenToProject(uid, pid, accessToken);
        toast({ 
          title: '✅ Токен сохранён в базу', 
          description: 'Переход к настройке кампаний...' 
        });
        window.location.hash = '';
        window.location.href = `/rsya/${pid}/setup`;
        return;
      }
      
      const response = await fetch(`${RSYA_PROJECTS_URL}?project_id=${pid}`, {
        method: 'GET',
        headers: { 'X-User-Id': uid }
      });
      
      if (!response.ok) {
        toast({ title: 'Проект не найден', variant: 'destructive' });
        navigate('/rsya');
        return;
      }
      
      const data = await response.json();
      const project = data.project;
      
      setProjectName(project.name);
      
      if (project.yandex_token) {
        setIsConnected(true);
        loadCampaignsAndGoals(project.yandex_token);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки проекта:', error);
      toast({ title: 'Ошибка загрузки проекта', variant: 'destructive' });
    }
  };

  const saveTokenToProject = async (uid: string, pid: string, token: string) => {
    try {
      await fetch(RSYA_PROJECTS_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': uid
        },
        body: JSON.stringify({
          project_id: parseInt(pid),
          yandex_token: token
        })
      });
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  };

  const loadCampaignsAndGoals = async (token: string) => {
    setLoading(true);
    try {
      const actualLogin = localStorage.getItem('yandex_client_login');
      
      const headers: Record<string, string> = { 'X-Auth-Token': token };
      if (actualLogin) {
        headers['X-Client-Login'] = actualLogin;
      }
      
      // Загружаем кампании
      const campaignsResponse = await fetch(YANDEX_DIRECT_URL, {
        method: 'GET',
        headers
      });

      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json();
        setCampaigns(campaignsData.campaigns || []);
      }

      // Загружаем цели
      const goalsUrl = `${YANDEX_DIRECT_URL}?action=goals${actualLogin ? `&client_login=${actualLogin}` : ''}`;
      const goalsResponse = await fetch(goalsUrl, {
        method: 'GET',
        headers
      });

      if (goalsResponse.ok) {
        const goalsData = await goalsResponse.json();
        setGoals(goalsData.goals || []);
      }

      toast({ title: '✅ Данные загружены', description: 'Кампании и цели успешно получены' });
    } catch (error) {
      toast({ title: 'Ошибка загрузки', description: 'Не удалось загрузить данные', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    const clientId = 'f4ef70ab0c334d5fbf3be3a1d21e8e52';
    const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
    const authUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${clientId}&redirect_uri=${redirectUri}`;
    
    window.location.href = authUrl;
    
    toast({ 
      title: '🔄 Переход на авторизацию...', 
      description: 'После авторизации скопируйте токен из URL (#access_token=...) и вставьте в поле ниже',
      duration: 15000
    });
  };

  const handleCodeSubmit = async () => {
    if (!authCode.trim()) {
      toast({ title: 'Введите код или токен', description: 'Вставьте код OAuth или готовый токен доступа', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    try {
      const token = authCode.trim();
      
      if (clientLogin.trim()) {
        localStorage.setItem('yandex_client_login', clientLogin.trim());
      } else {
        localStorage.removeItem('yandex_client_login');
      }
      
      if (token.length > 10 && user?.id) {
        localStorage.setItem('yandex_direct_token', token);
        localStorage.setItem('rsya_yandex_token', token);
        await saveTokenToProject(user.id.toString(), projectId!, token);
        toast({ 
          title: '✅ Токен сохранён', 
          description: 'Переход к настройке кампаний...' 
        });
        navigate(`/rsya/${projectId}/setup`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('yandex_direct_token');
    localStorage.removeItem('yandex_client_login');
    setIsConnected(false);
    setCampaigns([]);
    setGoals([]);
    setClientLoginState('');
    toast({ title: 'Яндекс.Директ отключён' });
  };

  return (
    <div className="flex">
      <AppSidebar />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 ml-64 flex-1 p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={() => navigate(`/rsya/${projectId}`)}
              variant="outline"
              size="icon"
            >
              <Icon name="ArrowLeft" className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Настройки проекта</h1>
              <p className="text-lg text-slate-600">{projectName}</p>
            </div>
          </div>

          <RSYAConnectionCard
            isConnected={isConnected}
            showCodeInput={showCodeInput}
            authCode={authCode}
            clientLogin={clientLogin}
            setAuthCode={setAuthCode}
            setClientLogin={setClientLogin}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onToggleCodeInput={() => setShowCodeInput(!showCodeInput)}
            onSubmitCode={handleCodeSubmit}
          />

          {isConnected && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Icon name="Target" className="h-5 w-5 text-blue-600" />
                      Кампании ({campaigns.length})
                    </CardTitle>
                    <Button
                      onClick={() => {
                        const token = localStorage.getItem('yandex_direct_token');
                        if (token) loadCampaignsAndGoals(token);
                      }}
                      disabled={loading}
                      size="sm"
                      variant="outline"
                    >
                      {loading ? (
                        <>
                          <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
                          Загрузка...
                        </>
                      ) : (
                        <>
                          <Icon name="RefreshCw" className="mr-2 h-4 w-4" />
                          Обновить
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {campaigns.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Icon name="Inbox" className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Нет кампаний. Нажмите "Обновить" для загрузки.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {campaigns.map((campaign) => (
                        <div
                          key={campaign.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Icon name="Megaphone" className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="font-medium text-slate-900">{campaign.name}</p>
                              <p className="text-xs text-slate-500">ID: {campaign.id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              campaign.status === 'ACTIVE' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-slate-200 text-slate-600'
                            }`}>
                              {campaign.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="Goal" className="h-5 w-5 text-green-600" />
                    Цели Метрики ({goals.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {goals.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Icon name="Inbox" className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Нет целей. Нажмите "Обновить" для загрузки.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {goals.map((goal) => (
                        <div
                          key={goal.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Icon name="Target" className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="font-medium text-slate-900">{goal.name}</p>
                              <p className="text-xs text-slate-500">ID: {goal.id}</p>
                            </div>
                          </div>
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                            {goal.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}