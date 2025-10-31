import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import AppSidebar from '@/components/layout/AppSidebar';
import RSYAConnectionCard from '@/components/rsya/RSYAConnectionCard';
import RSYAFiltersManager from '@/components/rsya/RSYAFiltersManager';
import RSYACampaignSelector from '@/components/rsya/RSYACampaignSelector';

interface Filter {
  id: string;
  pattern: string;
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
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
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ disabled: number; total: number } | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [clientLogin, setClientLogin] = useState('');
  const [useSandbox, setUseSandbox] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      exchangeCodeForToken(code);
      return;
    }

    const token = localStorage.getItem('yandex_direct_token');
    if (token) {
      setIsConnected(true);
      loadCampaigns(token);
    }
  }, []);

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
    try {
      const url = useSandbox 
        ? `${YANDEX_DIRECT_URL}?sandbox=true` 
        : YANDEX_DIRECT_URL;
      
      const headers: Record<string, string> = { 'X-Auth-Token': token };
      const savedLogin = localStorage.getItem('yandex_client_login');
      if (savedLogin) {
        headers['X-Client-Login'] = savedLogin;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) throw new Error('Ошибка загрузки кампаний');

      const data = await response.json();
      
      if (data.error) {
        const errorMsg = data.error_detail 
          ? `${data.error}: ${data.error_detail}` 
          : data.error;
        toast({ 
          title: '❌ Ошибка API Яндекс.Директ', 
          description: errorMsg,
          variant: 'destructive',
          duration: 10000
        });
        setCampaigns([]);
        return;
      }
      
      setCampaigns(data.campaigns || []);
      toast({ title: '✅ Кампании загружены', description: `Найдено РСЯ кампаний: ${data.campaigns?.length || 0}` });
    } catch (error) {
      toast({ title: 'Ошибка загрузки кампаний', description: 'Не удалось загрузить список кампаний', variant: 'destructive' });
    }
  };

  const handleConnect = async () => {
    try {
      const response = await fetch(YANDEX_DIRECT_URL + '?action=config');
      const { clientId } = await response.json();
      const authUrl = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${clientId}`;
      window.open(authUrl, '_blank');
      setShowCodeInput(true);
      toast({ title: '📋 Скопируйте код', description: 'После авторизации Яндекс покажет код — вставьте его в поле ниже' });
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось получить настройки OAuth', variant: 'destructive' });
    }
  };

  const handleCodeSubmit = async () => {
    if (!authCode.trim()) {
      toast({ title: 'Введите код или токен', description: 'Вставьте код OAuth или готовый токен доступа', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    try {
      const token = authCode.trim();
      
      // Сохраняем логин клиента если указан
      if (clientLogin.trim()) {
        localStorage.setItem('yandex_client_login', clientLogin.trim());
      } else {
        localStorage.removeItem('yandex_client_login');
      }
      
      // Если выглядит как готовый токен (32+ символов без дефисов) - используем напрямую
      if (token.length >= 32 && !token.includes('-')) {
        localStorage.setItem('yandex_direct_token', token);
        setIsConnected(true);
        setShowCodeInput(false);
        setAuthCode('');
        toast({ title: '✅ Токен сохранён', description: 'Загружаем кампании...' });
        await loadCampaigns(token);
      } else {
        // Иначе обмениваем OAuth код на токен
        await exchangeCodeForToken(token);
        setShowCodeInput(false);
        setAuthCode('');
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
    setSelectedCampaigns([]);
    setResults(null);
    setClientLogin('');
    toast({ title: 'Яндекс.Директ отключён' });
  };

  const toggleCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaignId) ? prev.filter(id => id !== campaignId) : [...prev, campaignId]
    );
  };

  const selectAllCampaigns = () => setSelectedCampaigns(campaigns.map(c => c.id));
  const deselectAllCampaigns = () => setSelectedCampaigns([]);

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
            <RSYAFiltersManager
              filters={filters}
              newFilter={newFilter}
              setNewFilter={setNewFilter}
              onAddFilter={addFilter}
              onRemoveFilter={removeFilter}
            />

            {campaigns.length > 0 && (
              <RSYACampaignSelector
                campaigns={campaigns}
                selectedCampaigns={selectedCampaigns}
                onToggleCampaign={toggleCampaign}
                onSelectAll={selectAllCampaigns}
                onDeselectAll={deselectAllCampaigns}
              />
            )}

            {campaigns.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <Button
                    onClick={handleClean}
                    disabled={loading || selectedCampaigns.length === 0 || filters.length === 0}
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
                        Запустить чистку
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