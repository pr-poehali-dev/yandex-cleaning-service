import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function RSYACleaner() {
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
  const [useSandbox, setUseSandboxState] = useState(true);
  
  const setUseSandbox = (value: boolean) => {
    setUseSandboxState(value);
    localStorage.setItem('yandex_use_sandbox', String(value));
  };
  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'campaigns' | 'platforms'>('campaigns');
  const [apiError, setApiError] = useState<{code: number; message: string; detail: string} | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Проверяем токен в hash (response_type=token)
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get('access_token');
    
    if (accessToken) {
      localStorage.setItem('yandex_direct_token', accessToken);
      
      // Сохраняем текущие настройки sandbox и clientLogin
      const savedSandbox = localStorage.getItem('yandex_use_sandbox');
      const savedLogin = localStorage.getItem('yandex_client_login');
      if (savedSandbox !== null) setUseSandboxState(savedSandbox === 'true');
      if (savedLogin) setClientLoginState(savedLogin);
      
      setIsConnected(true);
      setShowCodeInput(false);
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      toast({ title: '✅ Токен получен!', description: 'Загружаем кампании...' });
      loadCampaigns(accessToken);
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const yandexConnected = urlParams.get('yandex_connected');
    
    if (yandexConnected === 'true') {
      window.history.replaceState({}, document.title, window.location.pathname);
      toast({ title: '✅ Яндекс подключен!', description: 'Загружаем кампании...' });
      checkYandexConnection();
    }

    const token = localStorage.getItem('yandex_direct_token');
    const savedLogin = localStorage.getItem('yandex_client_login');
    const savedSandbox = localStorage.getItem('yandex_use_sandbox');
    
    if (token) {
      setIsConnected(true);
      if (savedLogin) setClientLoginState(savedLogin);
      if (savedSandbox !== null) setUseSandboxState(savedSandbox === 'true');
      loadCampaigns(token);
    }
  }, [toast]);

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
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsConnected(true);
      
      toast({ title: '✅ Подключено!', description: 'Яндекс.Директ успешно подключён' });
      await loadCampaigns(token);
    } catch (error) {
      toast({ title: 'Ошибка авторизации', description: 'Не удалось получить токен доступа', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async (token: string) => {
    setLoading(true);
    try {
      // ВСЕГДА берём актуальные значения из localStorage
      const actualSandbox = localStorage.getItem('yandex_use_sandbox') === 'true';
      const actualLogin = localStorage.getItem('yandex_client_login');
      
      const url = actualSandbox 
        ? `${YANDEX_DIRECT_URL}?sandbox=true` 
        : YANDEX_DIRECT_URL;
      
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
          localStorage.removeItem('yandex_direct_token');
          setIsConnected(false);
        } else if (errorCode === 513 && useSandbox) {
          toastTitle = '🧪 Песочница не активирована';
          toastDescription = errorDetail;
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
      
      setCampaigns(data.campaigns || []);
      
      const totalPlatforms = (data.campaigns || []).reduce((sum: number, c: Campaign) => sum + (c.platforms?.length || 0), 0);
      const totalGoals = (data.campaigns || []).reduce((sum: number, c: Campaign) => sum + (c.goals?.length || 0), 0);
      
      toast({ 
        title: '✅ Данные загружены', 
        description: `Кампаний: ${data.campaigns?.length || 0} • Площадок: ${totalPlatforms} • Целей: ${totalGoals}`
      });
    } catch (error) {
      toast({ title: 'Ошибка загрузки кампаний', description: 'Не удалось загрузить список кампаний', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadGoals = async (token: string) => {
    try {
      const actualSandbox = localStorage.getItem('yandex_use_sandbox') === 'true';
      const url = `${YANDEX_DIRECT_URL}?action=goals${actualSandbox ? '&sandbox=true' : ''}`;
      
      toast({ 
        title: '⏳ Загрузка целей...', 
        description: 'Получаем список целей из Метрики'
      });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'X-Auth-Token': token }
      });

      if (!response.ok) throw new Error('Ошибка загрузки целей');

      const data = await response.json();
      
      if (data.error) {
        toast({ 
          title: '❌ Ошибка загрузки целей', 
          description: data.details?.error_detail || data.error,
          variant: 'destructive'
        });
        return;
      }
      
      console.log('Goals loaded:', data.goals);
      
      toast({ 
        title: '✅ Цели загружены', 
        description: `Найдено целей: ${data.goals?.length || 0}`
      });
    } catch (error) {
      toast({ 
        title: 'Ошибка загрузки целей', 
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
      localStorage.setItem('yandex_use_sandbox', String(useSandbox));
      if (clientLogin.trim()) {
        localStorage.setItem('yandex_client_login', clientLogin.trim());
      } else {
        localStorage.removeItem('yandex_client_login');
      }
      
      // Если длиннее 10 символов - считаем готовым токеном
      if (token.length > 10) {
        localStorage.setItem('yandex_direct_token', token);
        setIsConnected(true);
        setShowCodeInput(false);
        setAuthCode('');
        toast({ title: '✅ Токен сохранён', description: 'Загружаем кампании...' });
        await loadCampaigns(token);
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
    localStorage.removeItem('yandex_use_sandbox');
    setIsConnected(false);
    setCampaigns([]);
    setSelectedCampaigns([]);
    setResults(null);
    setClientLoginState('');
    setUseSandboxState(true);
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
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Чистка РСЯ</h1>
          <p className="text-lg text-slate-600">Автоматическое отключение нецелевых площадок в Рекламной сети Яндекса</p>
        </div>

        <RSYAConnectionCard
          isConnected={isConnected}
          showCodeInput={showCodeInput}
          authCode={authCode}
          clientLogin={clientLogin}
          useSandbox={useSandbox}
          setAuthCode={setAuthCode}
          setClientLogin={setClientLogin}
          setUseSandbox={setUseSandbox}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onToggleCodeInput={() => setShowCodeInput(!showCodeInput)}
          onSubmitCode={handleCodeSubmit}
        />

        {isConnected && (
          <>
            {apiError && apiError.code === 513 && useSandbox && (
              <Card className="bg-red-50 border-red-300 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-100 rounded-full">
                      <Icon name="AlertCircle" className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-red-900 mb-2">🧪 Песочница Директа не активирована</h3>
                      <p className="text-sm text-red-800 mb-4">
                        Ваш аккаунт не зарегистрирован в песочнице Яндекс.Директа. Для тестирования необходимо активировать доступ.
                      </p>
                      
                      <div className="bg-white rounded-lg p-4 mb-4 border border-red-200">
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <Icon name="ListChecks" className="h-4 w-4 text-red-600" />
                          Инструкция по активации:
                        </h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
                          <li>
                            Перейдите на{' '}
                            <a 
                              href="https://sandbox.direct.yandex.ru" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline font-medium"
                            >
                              sandbox.direct.yandex.ru
                            </a>
                          </li>
                          <li>Авторизуйтесь тем же Яндекс-аккаунтом, токен которого используете</li>
                          <li>Примите условия использования песочницы</li>
                          <li>Создайте хотя бы одну тестовую кампанию (РСЯ или Поиск)</li>
                          <li>Вернитесь сюда и нажмите кнопку обновления</li>
                        </ol>
                      </div>
                      
                      <div className="flex gap-3">
                        <Button 
                          onClick={() => window.open('https://sandbox.direct.yandex.ru', '_blank')}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Icon name="ExternalLink" className="mr-2 h-4 w-4" />
                          Открыть песочницу Директа
                        </Button>
                        <Button 
                          onClick={() => {
                            const token = localStorage.getItem('yandex_direct_token');
                            if (token) loadCampaigns(token);
                          }}
                          variant="outline"
                        >
                          <Icon name="RefreshCw" className="mr-2 h-4 w-4" />
                          Проверить снова
                        </Button>
                        <Button 
                          onClick={() => {
                            const token = localStorage.getItem('yandex_direct_token');
                            if (token) loadGoals(token);
                          }}
                          variant="outline"
                          className="border-green-500 text-green-700 hover:bg-green-50"
                        >
                          <Icon name="Target" className="mr-2 h-4 w-4" />
                          Загрузить цели
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {apiError && apiError.code === 513 && !useSandbox && (
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
            
            {apiError && apiError.code === 58 && !useSandbox && (
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
                        <Button 
                          onClick={() => {
                            if (setUseSandbox) {
                              setUseSandbox(true);
                              const token = localStorage.getItem('yandex_direct_token');
                              if (token) loadCampaigns(token);
                            }
                          }}
                          variant="outline"
                        >
                          <Icon name="TestTube" className="mr-2 h-4 w-4" />
                          Переключиться на Песочницу
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          
            {useSandbox && campaigns.length === 0 && !apiError && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Icon name="Info" className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-amber-900 mb-1">Песочница пустая</h3>
                      <p className="text-sm text-amber-700 mb-3">
                        В песочнице нет кампаний. Создайте тестовую РСЯ кампанию для проверки работы сервиса.
                      </p>
                      <Button 
                        onClick={handleCreateTestCampaign}
                        disabled={loading}
                        size="sm"
                        variant="outline"
                        className="border-amber-300 hover:bg-amber-100"
                      >
                        {loading ? (
                          <>
                            <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
                            Создание...
                          </>
                        ) : (
                          <>
                            <Icon name="Plus" className="mr-2 h-4 w-4" />
                            Создать тестовую кампанию
                          </>
                        )}
                      </Button>
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
                  <div className="flex items-center justify-center gap-4 mb-6">
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

            {campaigns.length > 0 && viewMode === 'platforms' && (
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
                  platforms={allPlatforms}
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