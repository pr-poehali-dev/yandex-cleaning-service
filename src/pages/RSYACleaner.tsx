import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import AppSidebar from '@/components/layout/AppSidebar';
import RSYAConnectionCard from '@/components/rsya/RSYAConnectionCard';
import RSYAFiltersManager from '@/components/rsya/RSYAFiltersManager';
import RSYACampaignSelector from '@/components/rsya/RSYACampaignSelector';
import RSYAPlatformsTable from '@/components/rsya/RSYAPlatformsTable';
import RSYAAutomationRules from '@/components/rsya/RSYAAutomationRules';
import func2url from '../../backend/func2url.json';

interface Filter {
  id: string;
  pattern: string;
}

interface GoalStats {
  conversions: number;
  conversion_rate: number;
  cost_per_goal: number;
}

interface PlatformStats {
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  cpc: number;
  conversions: number;
  conversion_rate: number;
  avg_position: number;
  goals?: Record<string, GoalStats>;
}

interface Platform {
  adgroup_id: string;
  adgroup_name: string;
  status: string;
  network_enabled: boolean;
  stats?: PlatformStats;
}

interface Goal {
  id: string;
  name: string;
  type: string;
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  platforms?: Platform[];
  goals?: Goal[];
}

const DEFAULT_FILTERS: Filter[] = [
  { id: '1', pattern: 'com.' },
  { id: '2', pattern: 'dsp' },
  { id: '3', pattern: 'vnp' }
];

const YANDEX_DIRECT_URL = 'https://functions.poehali.dev/6b18ca7b-7f12-4758-a9db-4f774aaf2d23';
const RSYA_PROJECTS_URL = func2url['rsya-projects'] || 'https://functions.poehali.dev/08f68ba6-cbbb-4ca1-841f-185671e0757d';

export default function RSYACleaner() {
  const { id: projectId } = useParams<{ id: string }>();
  const [projectName, setProjectName] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [filters, setFilters] = useState<Filter[]>(DEFAULT_FILTERS);
  const [newFilter, setNewFilter] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ disabled: number; total: number } | null>(null);
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

  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'campaigns' | 'platforms'>('platforms');
  const [apiError, setApiError] = useState<{code: number; message: string; detail: string} | null>(null);
  
  // Тестовые площадки для демонстрации
  const [testPlatforms] = useState<Platform[]>([
    {
      adgroup_id: '1',
      adgroup_name: 'avito.ru',
      status: 'ACTIVE',
      network_enabled: true,
      stats: { impressions: 15234, clicks: 456, ctr: 2.99, cost: 12450, cpc: 27.3, conversions: 12, conversion_rate: 2.63, avg_position: 1.2 }
    },
    {
      adgroup_id: '2',
      adgroup_name: 'dzen.ru',
      status: 'ACTIVE',
      network_enabled: true,
      stats: { impressions: 98765, clicks: 1234, ctr: 1.25, cost: 45600, cpc: 37.0, conversions: 5, conversion_rate: 0.41, avg_position: 2.1 }
    },
    {
      adgroup_id: '3',
      adgroup_name: 'mail.ru',
      status: 'ACTIVE',
      network_enabled: true,
      stats: { impressions: 45678, clicks: 789, ctr: 1.73, cost: 28900, cpc: 36.6, conversions: 8, conversion_rate: 1.01, avg_position: 1.8 }
    },
    {
      adgroup_id: '4',
      adgroup_name: 'yandex.ru/news',
      status: 'ACTIVE',
      network_enabled: true,
      stats: { impressions: 67890, clicks: 1567, ctr: 2.31, cost: 56700, cpc: 36.2, conversions: 18, conversion_rate: 1.15, avg_position: 1.5 }
    },
    {
      adgroup_id: '5',
      adgroup_name: 'vk.com',
      status: 'ACTIVE',
      network_enabled: true,
      stats: { impressions: 123456, clicks: 2345, ctr: 1.90, cost: 89000, cpc: 38.0, conversions: 15, conversion_rate: 0.64, avg_position: 2.3 }
    }
  ]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const uid = localStorage.getItem('user_id') || '1';
    setUserId(uid);
    
    if (!projectId) {
      navigate('/rsya');
      return;
    }
    
    loadProject(uid, projectId);
  }, [projectId, navigate]);

  const loadProject = async (uid: string, pid: string) => {
    try {
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
      } else {
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        
        if (accessToken) {
          await saveTokenToProject(uid, pid, accessToken);
          window.history.replaceState({}, document.title, window.location.pathname);
          setIsConnected(true);
        }
      }
    } catch (error) {
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

  const exchangeCodeForToken = async (code: string) => {
    try {
      setLoading(true);
      const response = await fetch(YANDEX_DIRECT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exchange_code', code })
      });

      if (!response.ok) throw new Error('Ошибка обмена кода на токен');

      const data = await response.json();
      const token = data.access_token;
      
      localStorage.setItem('yandex_direct_token', token);
      await saveTokenToProject(userId, projectId!, token);
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsConnected(true);
      
      toast({ title: '✅ Подключено!', description: 'Яндекс.Директ успешно подключён' });
    } catch (error) {
      toast({ title: 'Ошибка авторизации', description: 'Не удалось получить токен доступа', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async (token: string) => {
    setLoading(true);
    try {
      const actualLogin = localStorage.getItem('yandex_client_login');
      
      const url = YANDEX_DIRECT_URL;
      
      const headers: Record<string, string> = { 'X-Auth-Token': token };
      if (actualLogin) {
        headers['X-Client-Login'] = actualLogin;
      }
      
      toast({ 
        title: '⏳ Загрузка данных...', 
        description: 'Получаем кампании, площадки и цели из Reports API'
      });
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) throw new Error('Ошибка загрузки кампаний');

      const data = await response.json();
      
      // Загружаем цели из API Директа (PriorityGoals)
      let goalsData: any[] = [];
      try {
        const goalsUrl = `${YANDEX_DIRECT_URL}?action=goals`;
        
        const goalsHeaders: Record<string, string> = { 'X-Auth-Token': token };
        if (actualLogin) {
          goalsHeaders['X-Client-Login'] = actualLogin;
        }
        
        const goalsResponse = await fetch(goalsUrl, {
          method: 'GET',
          headers: goalsHeaders
        });
        
        if (goalsResponse.ok) {
          const goalsResult = await goalsResponse.json();
          goalsData = goalsResult.goals || [];
          console.log('[DEBUG] Loaded goals from API:', goalsData);
          
          if (goalsData.length > 0) {
            toast({ 
              title: '🎯 Цели загружены', 
              description: `Найдено целей: ${goalsData.length}`
            });
          }
        }
      } catch (e) {
        console.warn('[WARN] Failed to load goals:', e);
      }
      
      if (data.error) {
        const errorCode = data.error_code;
        const errorTitle = data.error;
        const errorDetail = data.error_detail || '';
        
        console.error('Yandex API Error:', { errorCode, errorTitle, errorDetail, fullResponse: data });
        
        setApiError({
          code: errorCode,
          message: errorTitle,
          detail: errorDetail
        });
        
        let toastTitle = '❌ Ошибка API Яндекс.Директ';
        let toastDescription = errorDetail || errorTitle;
        
        if (errorCode === 53) {
          toastTitle = '❌ Недействительный OAuth токен';
          toastDescription = 'Токен истёк или невалиден. Получите новый токен через OAuth';
          setIsConnected(false);
        } else if (errorCode === 513) {
          toastTitle = '🔐 Аккаунт не подключен к Директу';
        } else if (errorCode === 58) {
          toastTitle = '⚙️ Приложение не активировано';
        }
        
        toast({ 
          title: toastTitle, 
          description: toastDescription,
          variant: 'destructive',
          duration: 15000
        });
        setCampaigns([]);
        return;
      }
      
      setApiError(null);
      
      // Присваиваем цели кампаниям из goalsData
      const campaignsWithGoals = (data.campaigns || []).map((campaign: Campaign) => {
        // Находим цели, которые привязаны к этой кампании
        const campaignGoals = goalsData
          .filter(goal => goal.campaigns?.some((c: any) => c.id === parseInt(campaign.id)))
          .map(goal => ({
            id: goal.id,
            name: goal.name || `Цель ${goal.id}`,
            type: 'conversion'
          }));
        
        return {
          ...campaign,
          goals: campaignGoals
        };
      });
      
      setCampaigns(campaignsWithGoals);
      
      const totalPlatforms = campaignsWithGoals.reduce((sum: number, c: Campaign) => sum + (c.platforms?.length || 0), 0);
      const totalGoals = campaignsWithGoals.reduce((sum: number, c: Campaign) => sum + (c.goals?.length || 0), 0);
      
      // Если площадок нет (Reports API вернул 201 - отчёт в очереди), ждём и запрашиваем снова
      if (totalPlatforms === 0 && campaignsWithGoals.length > 0) {
        toast({ 
          title: '⏳ Формирование отчёта...', 
          description: 'Reports API готовит данные. Повторный запрос через 3 сек...'
        });
        
        setTimeout(async () => {
          try {
            const retryResponse = await fetch(url, {
              method: 'GET',
              headers
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              
              if (!retryData.error) {
                const retryCampaignsWithGoals = (retryData.campaigns || []).map((campaign: Campaign) => {
                  const campaignGoals = goalsData
                    .filter(goal => goal.campaigns?.some((c: any) => c.id === parseInt(campaign.id)))
                    .map(goal => ({
                      id: goal.id,
                      name: goal.name || `Цель ${goal.id}`,
                      type: 'conversion'
                    }));
                  
                  return {
                    ...campaign,
                    goals: campaignGoals
                  };
                });
                
                setCampaigns(retryCampaignsWithGoals);
                
                const retryTotalPlatforms = retryCampaignsWithGoals.reduce((sum: number, c: Campaign) => sum + (c.platforms?.length || 0), 0);
                
                toast({ 
                  title: '✅ Данные обновлены', 
                  description: `Кампаний: ${retryCampaignsWithGoals.length} • Площадок: ${retryTotalPlatforms} • Целей: ${totalGoals}`
                });
              }
            }
          } catch (e) {
            console.warn('[WARN] Retry failed:', e);
          }
        }, 3000);
      } else {
        toast({ 
          title: '✅ Данные загружены', 
          description: `Кампаний: ${data.campaigns?.length || 0} • Площадок: ${totalPlatforms} • Целей: ${totalGoals}`
        });
      }
    } catch (error) {
      toast({ title: 'Ошибка загрузки кампаний', description: 'Не удалось загрузить список кампаний', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadGoalsFromDirect = async (token: string) => {
    console.log('🎯 loadGoalsFromDirect called');
    try {
      const clientLogin = localStorage.getItem('yandex_client_login') || undefined;
      
      toast({ 
        title: '⏳ Загрузка целей...', 
        description: 'Получаем цели из Яндекс.Директ'
      });
      
      const url = `${YANDEX_DIRECT_URL}?action=goals${clientLogin ? `&client_login=${clientLogin}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'X-Auth-Token': token }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        toast({ 
          title: '❌ Ошибка API Директ', 
          description: data.error,
          variant: 'destructive'
        });
        return;
      }
      
      const goals = data.goals || [];
      console.log('✅ Goals loaded from Direct:', goals);
      
      toast({ 
        title: '✅ Цели загружены', 
        description: `Найдено целей: ${goals.length}`
      });
      
    } catch (error) {
      toast({ 
        title: '❌ Ошибка загрузки целей', 
        description: String(error), 
        variant: 'destructive' 
      });
    }
  };

  const checkYandexConnection = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id;
    
    if (!userId) return;
    
    try {
      const response = await fetch(func2url['yandex-oauth'], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.connected && data.access_token) {
          localStorage.setItem('yandex_direct_token', data.access_token);
          setIsConnected(true);
          toast({ title: '✅ Яндекс подключен', description: `Аккаунт: ${data.yandex_login}` });
          loadCampaigns(data.access_token);
        }
      }
    } catch (error) {
      console.error('Ошибка проверки подключения:', error);
    }
  };

  const handleConnect = () => {
    const clientId = 'fa264103fca547b7baa436de1a416fbe';
    const authUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${clientId}`;
    
    window.open(authUrl, '_blank');
    setShowCodeInput(true);
    
    toast({ 
      title: 'Скопируйте токен', 
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
      
      // Сохраняем настройки
      if (clientLogin.trim()) {
        localStorage.setItem('yandex_client_login', clientLogin.trim());
      } else {
        localStorage.removeItem('yandex_client_login');
      }
      
      // Если длиннее 10 символов - считаем готовым токеном
      if (token.length > 10) {
        localStorage.setItem('yandex_direct_token', token);
        await saveTokenToProject(userId, projectId!, token);
        setIsConnected(true);
        setShowCodeInput(false);
        setAuthCode('');
        toast({ title: '✅ Токен сохранён', description: 'Яндекс.Директ подключён' });
      } else {
        // OAuth коды обычно короткие
        await exchangeCodeForToken(token);
        setShowCodeInput(false);
        setAuthCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTestCampaign = async () => {
    const token = localStorage.getItem('yandex_direct_token');
    const savedLogin = localStorage.getItem('yandex_client_login');
    
    if (!token) {
      toast({ title: 'Токен не найден', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(YANDEX_DIRECT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'create_test_campaign', 
          token,
          client_login: savedLogin 
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({ title: '✅ Кампания создана!', description: `ID: ${data.campaign_id}` });
        await loadCampaigns(token);
      } else {
        toast({ 
          title: '❌ Ошибка создания кампании', 
          description: data.error_detail || data.error,
          variant: 'destructive',
          duration: 10000
        });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось создать тестовую кампанию', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('yandex_direct_token');
    localStorage.removeItem('yandex_client_login');
    setIsConnected(false);
    setCampaigns([]);
    setSelectedCampaigns([]);
    setResults(null);
    setClientLoginState('');
    toast({ title: 'Яндекс.Директ отключён' });
  };

  const allPlatforms = useMemo(() => {
    return campaigns.flatMap(c => 
      (c.platforms || []).map(p => ({
        ...p,
        campaign_id: c.id,
        campaign_name: c.name
      }))
    );
  }, [campaigns]);

  const toggleCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaignId) ? prev.filter(id => id !== campaignId) : [...prev, campaignId]
    );
  };

  const selectAllCampaigns = () => setSelectedCampaigns(campaigns.map(c => c.id));
  const deselectAllCampaigns = () => setSelectedCampaigns([]);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId) ? prev.filter(id => id !== platformId) : [...prev, platformId]
    );
  };

  const selectAllPlatforms = () => setSelectedPlatforms(allPlatforms.map(p => p.adgroup_id));
  const deselectAllPlatforms = () => setSelectedPlatforms([]);

  const addFilter = () => {
    if (!newFilter.trim()) {
      toast({ title: 'Введите паттерн фильтра', variant: 'destructive' });
      return;
    }
    const filter: Filter = { id: Date.now().toString(), pattern: newFilter.trim() };
    setFilters([...filters, filter]);
    setNewFilter('');
    toast({ title: '✅ Фильтр добавлен', description: `Паттерн: ${filter.pattern}` });
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
    toast({ title: 'Фильтр удалён' });
  };

  const handleClean = async () => {
    if (selectedCampaigns.length === 0) {
      toast({ title: 'Выберите хотя бы одну кампанию', variant: 'destructive' });
      return;
    }
    if (filters.length === 0) {
      toast({ title: 'Добавьте хотя бы один фильтр', variant: 'destructive' });
      return;
    }

    const token = localStorage.getItem('yandex_direct_token');
    if (!token) {
      toast({ title: 'Токен авторизации не найден', variant: 'destructive' });
      return;
    }

    setLoading(true);
    toast({ title: '🚀 Запуск чистки...', description: `Применяем ${filters.length} фильтров к ${selectedCampaigns.length} кампаниям` });

    try {
      const response = await fetch(YANDEX_DIRECT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify({ campaignIds: selectedCampaigns, filters: filters.map(f => f.pattern) })
      });

      if (!response.ok) throw new Error('Ошибка при выполнении чистки');

      const data = await response.json();
      setResults(data);
      toast({ title: '✅ Чистка завершена!', description: `Отключено ${data.disabled} площадок из ${data.total}` });
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось выполнить чистку площадок', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 p-8 ml-64">
        <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/rsya')}
              variant="outline"
              size="icon"
            >
              <Icon name="ArrowLeft" className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">{projectName || 'Чистка РСЯ'}</h1>
              <p className="text-lg text-slate-600">Автоматическое отключение нецелевых площадок в Рекламной сети Яндекса</p>
            </div>
          </div>
          <Button
            onClick={() => navigate(`/rsya/${projectId}/settings`)}
            variant="outline"
            size="lg"
          >
            <Icon name="Settings" className="mr-2 h-5 w-5" />
            Настройки
          </Button>
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
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Icon name="Target" className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-900">Загрузка кампаний</h3>
                      <p className="text-sm text-blue-700">Загрузите кампании и цели из Яндекс.Директ для работы</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => {
                      const token = localStorage.getItem('yandex_direct_token');
                      if (token) {
                        loadCampaigns(token);
                        toast({ title: '⏳ Загрузка...', description: 'Получаем данные из Яндекс.Директ' });
                      }
                    }}
                    disabled={loading || campaigns.length > 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Icon name="Loader2" className="mr-2 h-5 w-5 animate-spin" />
                        Загрузка...
                      </>
                    ) : campaigns.length > 0 ? (
                      <>
                        <Icon name="CheckCircle2" className="mr-2 h-5 w-5" />
                        Загружено ({campaigns.length})
                      </>
                    ) : (
                      <>
                        <Icon name="Download" className="mr-2 h-5 w-5" />
                        Загрузить кампании
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {apiError && apiError.code === 513 && (
              <Card className="bg-orange-50 border-orange-300 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-orange-100 rounded-full">
                      <Icon name="UserX" className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-orange-900 mb-2">🔐 Аккаунт не подключён к Директу</h3>
                      <p className="text-sm text-orange-800 mb-4">
                        {apiError.detail}
                      </p>
                      
                      <div className="bg-white rounded-lg p-4 mb-4 border border-orange-200">
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <Icon name="Lightbulb" className="h-4 w-4 text-orange-600" />
                          Возможные причины:
                        </h4>
                        <ul className="space-y-3 text-sm">
                          <li className="flex items-start gap-2">
                            <Icon name="Circle" className="h-2 w-2 mt-1.5 text-orange-600 flex-shrink-0" />
                            <div>
                              <strong className="text-slate-900">Агентский аккаунт:</strong>
                              <p className="text-slate-700">Если вы агент — укажите <code className="bg-slate-100 px-1 rounded">Client-Login</code> клиента при подключении</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-2">
                            <Icon name="Circle" className="h-2 w-2 mt-1.5 text-orange-600 flex-shrink-0" />
                            <div>
                              <strong className="text-slate-900">Нет доступа к Директу:</strong>
                              <p className="text-slate-700">Зайдите на <a href="https://direct.yandex.ru" target="_blank" className="text-blue-600 underline">direct.yandex.ru</a> и завершите регистрацию</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-2">
                            <Icon name="Circle" className="h-2 w-2 mt-1.5 text-orange-600 flex-shrink-0" />
                            <div>
                              <strong className="text-slate-900">Неверный логин клиента:</strong>
                              <p className="text-slate-700">Проверьте правильность написания Client-Login (без @yandex.ru)</p>
                            </div>
                          </li>
                        </ul>
                      </div>
                      
                      <div className="flex gap-3">
                        <Button 
                          onClick={() => {
                            handleDisconnect();
                            setShowCodeInput(true);
                          }}
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          <Icon name="Settings" className="mr-2 h-4 w-4" />
                          Переподключить с Client-Login
                        </Button>
                        <Button 
                          onClick={() => window.open('https://direct.yandex.ru', '_blank')}
                          variant="outline"
                        >
                          <Icon name="ExternalLink" className="mr-2 h-4 w-4" />
                          Открыть Директ
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {apiError && apiError.code === 58 && (
              <Card className="bg-purple-50 border-purple-300 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Icon name="FileKey" className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-purple-900 mb-2">⚙️ OAuth приложение не активировано для Production API</h3>
                      <p className="text-sm text-purple-800 mb-4">
                        {apiError.detail}
                      </p>
                      
                      <div className="bg-white rounded-lg p-4 mb-4 border border-purple-200">
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <Icon name="ClipboardList" className="h-4 w-4 text-purple-600" />
                          Как активировать приложение для Production API:
                        </h4>
                        <ol className="list-decimal list-inside space-y-3 text-sm text-slate-700">
                          <li>
                            Перейдите на{' '}
                            <a 
                              href="https://direct.yandex.ru/registered/main.pl?cmd=apiSettings" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline font-medium"
                            >
                              Настройки API в Директе
                            </a>
                          </li>
                          <li>
                            В разделе <strong>"Зарегистрированные приложения"</strong> найдите ваше приложение
                          </li>
                          <li>
                            Нажмите <strong>"Подать заявку на доступ"</strong>
                          </li>
                          <li>
                            Заполните форму:
                            <ul className="ml-6 mt-1 space-y-1 text-xs">
                              <li>• Название приложения</li>
                              <li>• Описание (зачем нужен API)</li>
                              <li>• URL приложения (можно указать любой)</li>
                            </ul>
                          </li>
                          <li>
                            Дождитесь подтверждения от Яндекса (обычно 1-3 рабочих дня)
                          </li>
                          <li>
                            После одобрения вернитесь сюда и переподключитесь
                          </li>
                        </ol>
                      </div>
                      
                      <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
                        <p className="text-xs text-amber-900 flex items-start gap-2">
                          <Icon name="Lightbulb" className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
                          <span>
                            <strong>Совет:</strong> Пока заявка на рассмотрении, можете использовать режим <strong>Песочница</strong> для тестирования работы сервиса
                          </span>
                        </p>
                      </div>
                      
                      <div className="flex gap-3">
                        <Button 
                          onClick={() => window.open('https://direct.yandex.ru/registered/main.pl?cmd=apiSettings', '_blank')}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Icon name="ExternalLink" className="mr-2 h-4 w-4" />
                          Открыть настройки API
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          

          
            {viewMode === 'campaigns' && (
              <RSYAFiltersManager
                filters={filters}
                newFilter={newFilter}
                setNewFilter={setNewFilter}
                onAddFilter={addFilter}
                onRemoveFilter={removeFilter}
              />
            )}

            {campaigns.length > 0 && (
              <Card className="bg-white shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center justify-center gap-4 flex-1">
                      <button
                        onClick={() => setViewMode('campaigns')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                          viewMode === 'campaigns'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Icon name="Target" className="h-5 w-5" />
                        По кампаниям
                      </button>
                      <button
                        onClick={() => setViewMode('platforms')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                          viewMode === 'platforms'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Icon name="Table" className="h-5 w-5" />
                        Все площадки ({allPlatforms.length})
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {campaigns.length > 0 && (
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-100 rounded-full">
                        <Icon name="Target" className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-green-900">Цели конверсии</h3>
                        <p className="text-sm text-green-700">Загрузите цели из Яндекс.Директ для анализа</p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => {
                        const token = localStorage.getItem('yandex_direct_token');
                        if (token) loadGoalsFromDirect(token);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white shadow-md"
                      size="lg"
                    >
                      <Icon name="Download" className="mr-2 h-5 w-5" />
                      Получить цели
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {campaigns.length > 0 && viewMode === 'campaigns' && (
              <RSYACampaignSelector
                campaigns={campaigns}
                selectedCampaigns={selectedCampaigns}
                onToggleCampaign={toggleCampaign}
                onSelectAll={selectAllCampaigns}
                onDeselectAll={deselectAllCampaigns}
                selectedGoal={selectedGoal}
                onSelectGoal={setSelectedGoal}
              />
            )}

            {viewMode === 'platforms' && (
              <>
                <RSYAAutomationRules
                  onApplyRule={(rule) => {
                    let matchedPlatforms = allPlatforms;
                    
                    rule.conditions.forEach(cond => {
                      if (cond.type === 'pattern' && cond.pattern) {
                        matchedPlatforms = matchedPlatforms.filter(p => 
                          p.adgroup_name.toLowerCase().includes(cond.pattern!.toLowerCase())
                        );
                      } else if (cond.type === 'metric' && cond.field && cond.operator && cond.value !== undefined) {
                        matchedPlatforms = matchedPlatforms.filter(p => {
                          if (!p.stats) return false;
                          const val = p.stats[cond.field!];
                          if (val === undefined) return false;
                          
                          switch (cond.operator) {
                            case '>=': return val >= cond.value!;
                            case '<=': return val <= cond.value!;
                            case '>': return val > cond.value!;
                            case '<': return val < cond.value!;
                            case '=': return val === cond.value!;
                            default: return false;
                          }
                        });
                      }
                    });
                    
                    const matchedIds = matchedPlatforms.map(p => p.adgroup_id);
                    matchedIds.forEach(id => {
                      if (!selectedPlatforms.includes(id)) {
                        togglePlatform(id);
                      }
                    });
                    
                    toast({ 
                      title: `✅ Правило "${rule.name}" применено`, 
                      description: `Выбрано площадок: ${matchedIds.length}` 
                    });
                  }}
                />
                
                <RSYAPlatformsTable
                  platforms={campaigns.length > 0 ? allPlatforms : testPlatforms}
                  selectedPlatforms={selectedPlatforms}
                  onTogglePlatform={togglePlatform}
                  onSelectAll={selectAllPlatforms}
                  onDeselectAll={deselectAllPlatforms}
                  onMassDisable={() => {
                    toast({ 
                      title: '🚀 Массовое отключение', 
                      description: `Будет отключено ${selectedPlatforms.length} площадок` 
                    });
                  }}
                />
              </>
            )}

            {campaigns.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <Button
                    onClick={handleClean}
                    disabled={loading || (viewMode === 'campaigns' ? selectedCampaigns.length === 0 : selectedPlatforms.length === 0) || filters.length === 0}
                    size="lg"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    {loading ? (
                      <>
                        <Icon name="Loader2" className="mr-2 h-5 w-5 animate-spin" />
                        Выполняется чистка...
                      </>
                    ) : (
                      <>
                        <Icon name="Sparkles" className="mr-2 h-5 w-5" />
                        {viewMode === 'campaigns' 
                          ? `Запустить чистку (${selectedCampaigns.length} кампаний)` 
                          : `Отключить площадки (${selectedPlatforms.length})`}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {results && (
              <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <Icon name="CheckCircle2" className="h-12 w-12 text-emerald-600 mx-auto" />
                    <h3 className="text-2xl font-bold text-emerald-900">Чистка завершена!</h3>
                    <p className="text-lg text-emerald-700">
                      Отключено <span className="font-bold">{results.disabled}</span> площадок из <span className="font-bold">{results.total}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
        </div>
      </div>
    </>
  );
}