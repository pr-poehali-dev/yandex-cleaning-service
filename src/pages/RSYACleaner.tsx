import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

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

const BACKEND_URL = 'https://functions.poehali.dev/6b18ca7b-7f12-4758-a9db-4f774aaf2d23';

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
      console.log('🔑 Обмен кода на токен:', code);
      
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'exchange_code',
          code: code
        })
      });

      console.log('📡 Ответ exchange:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Ошибка exchange:', errorText);
        throw new Error('Ошибка обмена кода на токен');
      }

      const data = await response.json();
      console.log('🎫 Получен токен:', data);
      
      const token = data.access_token;
      
      localStorage.setItem('yandex_direct_token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
      
      setIsConnected(true);
      
      toast({
        title: '✅ Подключено!',
        description: 'Яндекс.Директ успешно подключён'
      });
      
      console.log('📥 Запускаю загрузку кампаний...');
      await loadCampaigns(token);
    } catch (error) {
      console.error('❌ Ошибка авторизации:', error);
      toast({
        title: 'Ошибка авторизации',
        description: 'Не удалось получить токен доступа',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async (token: string) => {
    try {
      console.log('🔄 Загрузка кампаний с токеном:', token.substring(0, 10) + '...');
      
      const response = await fetch(BACKEND_URL, {
        method: 'GET',
        headers: {
          'X-Auth-Token': token
        }
      });

      console.log('📡 Ответ сервера:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Ошибка:', errorText);
        throw new Error('Ошибка загрузки кампаний');
      }

      const data = await response.json();
      console.log('📊 Получены кампании:', data);
      
      setCampaigns(data.campaigns || []);
      
      toast({
        title: '✅ Кампании загружены',
        description: `Найдено кампаний: ${data.campaigns?.length || 0}`
      });
    } catch (error) {
      console.error('❌ Ошибка загрузки:', error);
      toast({
        title: 'Ошибка загрузки кампаний',
        description: 'Не удалось загрузить список кампаний',
        variant: 'destructive'
      });
    }
  };

  const handleConnect = async () => {
    try {
      const response = await fetch(BACKEND_URL + '?action=config');
      const { clientId } = await response.json();
      
      const authUrl = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${clientId}`;
      
      window.open(authUrl, '_blank');
      setShowCodeInput(true);
      
      toast({
        title: '📋 Скопируйте код',
        description: 'После авторизации Яндекс покажет код — вставьте его в поле ниже'
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось получить настройки OAuth',
        variant: 'destructive'
      });
    }
  };

  const handleCodeSubmit = async () => {
    if (!authCode.trim()) {
      toast({
        title: 'Введите код',
        description: 'Вставьте код из окна авторизации Яндекс',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      await exchangeCodeForToken(authCode.trim());
      setShowCodeInput(false);
      setAuthCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('yandex_direct_token');
    setIsConnected(false);
    setCampaigns([]);
    setSelectedCampaigns([]);
    setResults(null);
    toast({ title: 'Яндекс.Директ отключён' });
  };

  const toggleCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaignId) 
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const addFilter = () => {
    if (!newFilter.trim()) {
      toast({ title: 'Введите паттерн фильтра', variant: 'destructive' });
      return;
    }

    const filter: Filter = {
      id: Date.now().toString(),
      pattern: newFilter.trim()
    };

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
    toast({ 
      title: '🚀 Запуск чистки...', 
      description: `Применяем ${filters.length} фильтров к ${selectedCampaigns.length} кампаниям` 
    });

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        },
        body: JSON.stringify({
          campaignIds: selectedCampaigns,
          filters: filters.map(f => f.pattern)
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка при выполнении чистки');
      }

      const data = await response.json();
      setResults(data);
      toast({ 
        title: '✅ Чистка завершена!', 
        description: `Отключено ${data.disabled} площадок из ${data.total}` 
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось выполнить чистку площадок',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/50 via-emerald-50/30 to-teal-50/50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            Чистка площадок РСЯ
          </h1>
          <p className="text-slate-600">
            Автоматическое отключение нежелательных площадок в кампаниях РСЯ
          </p>
        </div>

        <div className="grid gap-6">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="Link" size={20} />
                Яндекс.Директ
              </CardTitle>
              <CardDescription>
                {isConnected ? 'Аккаунт подключён' : 'Подключите аккаунт для работы с кампаниями'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isConnected ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="Zap" size={32} className="text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Подключите Яндекс.Директ</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Авторизуйтесь через OAuth для доступа к кампаниям
                  </p>
                  
                  {!showCodeInput ? (
                    <Button 
                      onClick={handleConnect}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                    >
                      <Icon name="Link" size={18} className="mr-2" />
                      Подключить Яндекс.Директ
                    </Button>
                  ) : (
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                        <p className="text-sm font-medium text-blue-900 mb-2">
                          📋 Инструкция:
                        </p>
                        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                          <li>В открывшемся окне войдите в Яндекс</li>
                          <li>Разрешите доступ к Директу</li>
                          <li>Скопируйте код из окна</li>
                          <li>Вставьте его в поле ниже</li>
                        </ol>
                      </div>
                      
                      <div className="flex gap-2">
                        <Input
                          placeholder="Вставьте код из окна Яндекс (например: fkyiev3vbcechree)"
                          value={authCode}
                          onChange={(e) => setAuthCode(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleCodeSubmit}
                          disabled={loading || !authCode.trim()}
                          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                        >
                          {loading ? (
                            <Icon name="Loader2" size={18} className="animate-spin" />
                          ) : (
                            <>
                              <Icon name="Check" size={18} className="mr-2" />
                              Подтвердить
                            </>
                          )}
                        </Button>
                      </div>
                      
                      <Button 
                        onClick={() => {
                          setShowCodeInput(false);
                          setAuthCode('');
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Отмена
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <Icon name="CheckCircle2" size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-green-900">Яндекс.Директ подключён</p>
                        <p className="text-sm text-green-700">Найдено {campaigns.length} кампаний РСЯ</p>
                      </div>
                    </div>
                    <Button onClick={handleDisconnect} variant="outline" size="sm">
                      <Icon name="Unlink" size={16} className="mr-2" />
                      Отключить
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700 mb-3">Выберите кампании для чистки:</p>
                    {campaigns.map(campaign => (
                      <Card 
                        key={campaign.id}
                        className={`cursor-pointer transition-all ${
                          selectedCampaigns.includes(campaign.id) 
                            ? 'ring-2 ring-blue-500 bg-blue-50' 
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => toggleCampaign(campaign.id)}
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedCampaigns.includes(campaign.id) 
                              ? 'bg-blue-600 border-blue-600' 
                              : 'border-slate-300'
                          }`}>
                            {selectedCampaigns.includes(campaign.id) && (
                              <Icon name="Check" size={14} className="text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-xs text-muted-foreground">ID: {campaign.id}</p>
                          </div>
                          <Badge className={campaign.status === 'RUNNING' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                            {campaign.status === 'RUNNING' ? 'Активна' : 'Приостановлена'}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {isConnected && (
            <>
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="Filter" size={20} />
                    Фильтры площадок
                  </CardTitle>
                  <CardDescription>
                    Площадки, содержащие эти паттерны, будут отключены
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 min-h-[48px] p-3 border rounded-lg bg-slate-50">
                    {filters.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Фильтры не добавлены</p>
                    ) : (
                      filters.map(filter => (
                        <Badge 
                          key={filter.id} 
                          className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 border-blue-200"
                        >
                          <span className="font-mono">{filter.pattern}</span>
                          <Icon 
                            name="X" 
                            size={14} 
                            className="ml-2 cursor-pointer hover:text-green-900" 
                            onClick={() => removeFilter(filter.id)}
                          />
                        </Badge>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Введите паттерн (например: com., dsp, vnp)"
                      value={newFilter}
                      onChange={(e) => setNewFilter(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addFilter()}
                    />
                    <Button onClick={addFilter} variant="outline">
                      <Icon name="Plus" size={18} className="mr-2" />
                      Добавить
                    </Button>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      📌 Примеры фильтров:
                    </p>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• <code className="font-mono bg-white px-1 rounded">com.</code> — блокирует домены типа example.com.ru</li>
                      <li>• <code className="font-mono bg-white px-1 rounded">dsp</code> — блокирует DSP-площадки</li>
                      <li>• <code className="font-mono bg-white px-1 rounded">vnp</code> — блокирует VNP-партнёрки</li>
                      <li>• <code className="font-mono bg-white px-1 rounded">adult</code> — блокирует взрослый контент</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {results && (
                <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <Icon name="CheckCircle2" size={20} />
                      Результаты чистки
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-white rounded-lg">
                        <div className="text-3xl font-bold text-green-600">{results.disabled}</div>
                        <div className="text-sm text-muted-foreground">Площадок отключено</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg">
                        <div className="text-3xl font-bold text-slate-600">{results.total}</div>
                        <div className="text-sm text-muted-foreground">Всего проверено</div>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-green-700 text-center">
                      ✨ Отключено {((results.disabled / results.total) * 100).toFixed(1)}% площадок
                    </p>
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={handleClean} 
                disabled={loading || selectedCampaigns.length === 0}
                size="lg"
                className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
              >
                {loading ? (
                  <>
                    <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                    Выполняется чистка...
                  </>
                ) : (
                  <>
                    <Icon name="Sparkles" size={20} className="mr-2" />
                    Запустить чистку площадок ({selectedCampaigns.length})
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}