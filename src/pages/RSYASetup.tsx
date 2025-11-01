import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import AppSidebar from '@/components/layout/AppSidebar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import func2url from '../../backend/func2url.json';

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface Goal {
  id: string;
  name: string;
  type: string;
  counter_id?: string;
  counter_name?: string;
}

interface Counter {
  id: string;
  name: string;
  site: string;
  owner_login: string;
}

const RSYA_PROJECTS_URL = func2url['rsya-projects'] || 'https://functions.poehali.dev/08f68ba6-cbbb-4ca1-841f-185671e0757d';

export default function RSYASetup() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingCounters, setLoadingCounters] = useState(false);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [selectedCounters, setSelectedCounters] = useState<Set<string>>(new Set());
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());
  const [autoSelectCampaigns, setAutoSelectCampaigns] = useState(true);

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const userId = localStorage.getItem('user_id') || '1';
      
      if (!projectId) {
        navigate('/rsya');
        return;
      }
      
      const projectResponse = await fetch(`${RSYA_PROJECTS_URL}?project_id=${projectId}`, {
        method: 'GET',
        headers: { 'X-User-Id': userId }
      });
      
      if (!projectResponse.ok) {
        toast({
          title: 'Ошибка',
          description: 'Проект не найден',
          variant: 'destructive'
        });
        navigate('/rsya');
        return;
      }
      
      const projectData = await projectResponse.json();
      const token = projectData.project.yandex_token;
      
      if (!token) {
        toast({
          title: 'Ошибка',
          description: 'Подключите Яндекс.Директ в настройках проекта',
          variant: 'destructive'
        });
        navigate(`/rsya/${projectId}`);
        return;
      }

      const campaignsResponse = await fetch(`https://functions.poehali.dev/6b18ca7b-7f12-4758-a9db-4f774aaf2d23`, {
        headers: {
          'X-Auth-Token': token
        }
      });

      if (!campaignsResponse.ok) {
        throw new Error('Ошибка загрузки кампаний');
      }

      const campaignsData = await campaignsResponse.json();
      setCampaigns(campaignsData.campaigns || []);
      
      if (autoSelectCampaigns && campaignsData.campaigns?.length > 0) {
        const campaignIds = new Set(campaignsData.campaigns.map((c: Campaign) => c.id));
        setSelectedCampaigns(campaignIds);
      }
      
      console.log('🎯 Загружаем цели из всех кампаний...');
      setLoadingGoals(true);
      const goalsResponse = await fetch(
        `https://functions.poehali.dev/6b18ca7b-7f12-4758-a9db-4f774aaf2d23?action=goals`,
        {
          headers: {
            'X-Auth-Token': token
          }
        }
      );

      console.log('🎯 Статус загрузки целей:', goalsResponse.status);
      if (goalsResponse.ok) {
        const goalsData = await goalsResponse.json();
        console.log('🎯 Ответ от бэкенда (цели):', goalsData);
        const allGoals = goalsData.goals || [];
        console.log('🎯 Загружено целей:', allGoals.length);
        if (allGoals.length > 0) {
          console.log('🎯 Пример цели:', allGoals[0]);
        }
        setGoals(allGoals);
        
        // Извлекаем уникальные ID счётчиков из целей
        const counterIds = new Set<string>();
        allGoals.forEach((goal: Goal) => {
          if (goal.counter_id) {
            counterIds.add(goal.counter_id);
          }
        });
        
        console.log('📊 Найдено уникальных счётчиков в целях:', counterIds.size);
        console.log('📊 ID счётчиков:', Array.from(counterIds));
        
        // Загружаем информацию только о счётчиках из Директа
        if (counterIds.size > 0) {
          setLoadingCounters(true);
          const counterIdsParam = Array.from(counterIds).join(',');
          const countersResponse = await fetch(
            `https://functions.poehali.dev/6b18ca7b-7f12-4758-a9db-4f774aaf2d23?action=counters&counter_ids=${counterIdsParam}`,
            {
              headers: {
                'X-Auth-Token': token
              }
            }
          );

          console.log('📊 Статус загрузки счётчиков:', countersResponse.status);
          if (countersResponse.ok) {
            const countersData = await countersResponse.json();
            console.log('📊 Ответ от бэкенда (счётчики):', countersData);
            const directCounters = countersData.counters || [];
            console.log('📊 Загружено счётчиков из Директа:', directCounters.length);
            if (directCounters.length > 0) {
              console.log('📊 Пример счётчика:', directCounters[0]);
            }
            setCounters(directCounters);
            
            // Автоматически выбираем все счётчики
            const allCounterIds = new Set(directCounters.map((c: Counter) => c.id));
            setSelectedCounters(allCounterIds);
          }
          setLoadingCounters(false);
        }
        
        // Автоматически выбираем все цели
        const allGoalIds = new Set(allGoals.map((g: Goal) => g.id));
        setSelectedGoals(allGoalIds);
      }
      setLoadingGoals(false);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные из Яндекс.Директ',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignToggle = (campaignId: string) => {
    const newSelected = new Set(selectedCampaigns);
    if (newSelected.has(campaignId)) {
      newSelected.delete(campaignId);
    } else {
      newSelected.add(campaignId);
    }
    setSelectedCampaigns(newSelected);
  };

  const handleGoalToggle = (goalId: string) => {
    const newSelected = new Set(selectedGoals);
    if (newSelected.has(goalId)) {
      newSelected.delete(goalId);
    } else {
      newSelected.add(goalId);
    }
    setSelectedGoals(newSelected);
  };

  const handleSelectAllCampaigns = () => {
    const allIds = new Set(campaigns.map(c => c.id));
    setSelectedCampaigns(allIds);
  };

  const handleDeselectAllCampaigns = () => {
    setSelectedCampaigns(new Set());
  };

  const handleSelectAllGoals = () => {
    const allIds = new Set(goals.map(g => g.id));
    setSelectedGoals(allIds);
  };

  const handleCounterToggle = (counterId: string) => {
    const newSelected = new Set(selectedCounters);
    if (newSelected.has(counterId)) {
      newSelected.delete(counterId);
    } else {
      newSelected.add(counterId);
    }
    setSelectedCounters(newSelected);
  };

  const handleSelectAllCounters = () => {
    const allIds = new Set(counters.map(c => c.id));
    setSelectedCounters(allIds);
  };

  const handleDeselectAllCounters = () => {
    setSelectedCounters(new Set());
  };



  const handleSave = async () => {
    if (selectedCampaigns.size === 0) {
      toast({
        title: 'Ошибка',
        description: 'Выберите хотя бы одну кампанию',
        variant: 'destructive'
      });
      return;
    }

    if (selectedGoals.size === 0) {
      toast({
        title: 'Ошибка',
        description: 'Выберите хотя бы одну цель',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      
      const selectedCampaignsData = campaigns.filter(c => selectedCampaigns.has(c.id));
      const selectedGoalsData = goals.filter(g => selectedGoals.has(g.id));
      
      const response = await fetch(`https://functions.poehali.dev/08f68ba6-cbbb-4ca1-841f-185671e0757d?action=setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': localStorage.getItem('user_id') || ''
        },
        body: JSON.stringify({
          project_id: projectId,
          campaigns: selectedCampaignsData,
          goals: selectedGoalsData
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка сохранения настроек');
      }

      toast({
        title: 'Успешно',
        description: `Сохранено ${selectedCampaigns.size} кампаний и ${selectedGoals.size} целей`
      });

      navigate(`/rsya/${projectId}`);
      
    } catch (error) {
      console.error('Error saving setup:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить настройки',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <AppSidebar />
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 p-8 ml-64">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Icon name="Loader2" className="h-12 w-12 animate-spin text-emerald-600 mx-auto mb-4" />
                <p className="text-lg text-slate-600">Загрузка кампаний и целей из Яндекс.Директ...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 p-8 ml-64">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={() => navigate('/rsya')}
              variant="outline"
              size="icon"
            >
              <Icon name="ArrowLeft" className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-2">⚙️ Настройка проекта РСЯ</h1>
              <p className="text-lg text-slate-600">Выберите кампании и счётчики для автоматической чистки площадок</p>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border-2 border-emerald-100 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Icon name="Megaphone" className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900">Кампании РСЯ</p>
                      <p className="text-xs text-slate-500 font-normal">Выберите кампании для чистки площадок</p>
                    </div>
                  </span>
                  <div className="px-3 py-1 bg-emerald-100 rounded-full">
                    <span className="text-sm font-bold text-emerald-700">
                      {selectedCampaigns.size} / {campaigns.length}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex gap-2 mb-4">
                  <Button
                    onClick={handleSelectAllCampaigns}
                    variant="outline"
                    size="sm"
                  >
                    <Icon name="CheckSquare" className="h-4 w-4 mr-2" />
                    Выбрать все
                  </Button>
                  <Button
                    onClick={handleDeselectAllCampaigns}
                    variant="outline"
                    size="sm"
                  >
                    <Icon name="Square" className="h-4 w-4 mr-2" />
                    Снять все
                  </Button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {campaigns.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Icon name="AlertCircle" className="h-12 w-12 mx-auto mb-2 text-slate-400" />
                      <p>РСЯ кампании не найдены</p>
                      <p className="text-sm">Убедитесь что у вас есть кампании с показами только в РСЯ</p>
                    </div>
                  ) : (
                    campaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="flex items-start gap-3 p-3 rounded-lg border-2 bg-white hover:bg-emerald-50 hover:border-emerald-200 cursor-pointer transition-all hover:shadow-md"
                        onClick={() => handleCampaignToggle(campaign.id)}
                      >
                        <Checkbox
                          checked={selectedCampaigns.has(campaign.id)}
                          onCheckedChange={() => handleCampaignToggle(campaign.id)}
                          className="mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{campaign.name}</p>
                          <p className="text-xs text-slate-500">ID: {campaign.id}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-100 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Icon name="BarChart3" className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900">Счётчики Яндекс.Метрики</p>
                      <p className="text-xs text-slate-500 font-normal">Только счётчики из ваших РСЯ кампаний</p>
                    </div>
                  </span>
                  <div className="px-3 py-1 bg-green-100 rounded-full">
                    <span className="text-sm font-bold text-green-700">
                      {selectedCounters.size} / {counters.length}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {loadingCounters ? (
                  <div className="text-center py-8">
                    <Icon name="Loader2" className="h-8 w-8 animate-spin text-green-600 mx-auto mb-2" />
                    <p className="text-slate-600">Загружаем счётчики из Директа...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {counters.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-slate-500">
                          <Icon name="AlertCircle" className="h-12 w-12 mx-auto mb-2 text-slate-400" />
                          <p>Счётчики не найдены</p>
                          <p className="text-sm">Проверьте доступ к Яндекс.Метрике</p>
                        </div>
                      ) : (
                        counters.map((counter) => {
                          const isSelected = selectedCounters.has(counter.id);
                          return (
                            <div
                              key={counter.id}
                              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                isSelected 
                                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-lg scale-[1.02]' 
                                  : 'bg-white hover:bg-green-50 hover:border-green-200 hover:shadow-md'
                              }`}
                              onClick={() => handleCounterToggle(counter.id)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleCounterToggle(counter.id)}
                                className="mt-0.5 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{counter.name}</p>
                                <p className="text-xs text-slate-500">ID: {counter.id}</p>
                                {counter.site && (
                                  <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                                    <Icon name="Globe" className="h-3 w-3" />
                                    {counter.site}
                                  </p>
                                )}
                              </div>
                              {loadingGoals && isSelected && (
                                <Icon name="Loader2" className="h-4 w-4 animate-spin text-green-600" />
                              )}
                            </div>
                          );
                        })
                      )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 border-teal-100 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-teal-50 via-emerald-50 to-green-50">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 rounded-lg">
                      <Icon name="Target" className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900">Цели конверсий</p>
                      <p className="text-xs text-slate-500 font-normal">Автоматически загружены из всех кампаний</p>
                    </div>
                  </span>
                  <div className="px-3 py-1 bg-teal-100 rounded-full">
                    <span className="text-sm font-bold text-teal-700">
                      {selectedGoals.size} / {goals.length}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {loadingGoals ? (
                  <div className="text-center py-12">
                    <Icon name="Loader2" className="h-10 w-10 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-slate-700">Загружаем цели из Директа...</p>
                    <p className="text-sm text-slate-500 mt-2">Это может занять несколько секунд</p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 mb-4">
                      <Button
                        onClick={handleSelectAllGoals}
                        variant="outline"
                        size="sm"
                        className="hover:bg-teal-50 hover:border-teal-300"
                      >
                        <Icon name="CheckSquare" className="h-4 w-4 mr-2" />
                        Выбрать все
                      </Button>
                    </div>

                    <div className="space-y-6">
                      {goals.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <div className="p-4 bg-slate-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                            <Icon name="Target" className="h-10 w-10 text-slate-400" />
                          </div>
                          <p className="font-semibold text-lg text-slate-700">Цели не найдены</p>
                          <p className="text-sm mt-2">Проверьте настройки целей в Яндекс.Метрике</p>
                        </div>
                  ) : (
                    (() => {
                      // Группируем цели по счётчикам
                      const goalsByCounter: Record<string, Goal[]> = {};
                      goals.forEach(goal => {
                        const counterId = goal.counter_id || 'unknown';
                        if (!goalsByCounter[counterId]) {
                          goalsByCounter[counterId] = [];
                        }
                        goalsByCounter[counterId].push(goal);
                      });

                      return Object.entries(goalsByCounter).map(([counterId, counterGoals]) => {
                        const counterName = counterGoals[0]?.counter_name || `Счётчик ${counterId}`;
                        const selectedInCounter = counterGoals.filter(g => selectedGoals.has(g.id)).length;
                        
                        return (
                          <div key={counterId} className="space-y-3">
                            {/* Заголовок счётчика */}
                            <div className="flex items-center justify-between bg-gradient-to-r from-teal-50 to-emerald-50 p-4 rounded-xl border-2 border-teal-200 shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-teal-100 rounded-lg">
                                  <Icon name="BarChart3" className="h-4 w-4 text-teal-600" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-slate-900">{counterName}</h3>
                                  <p className="text-xs text-slate-500">ID: {counterId}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="px-2 py-1 bg-teal-100 rounded-full">
                                  <span className="text-xs font-bold text-teal-700">
                                    {selectedInCounter} / {counterGoals.length}
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const allSelected = counterGoals.every(g => selectedGoals.has(g.id));
                                    const newSelected = new Set(selectedGoals);
                                    if (allSelected) {
                                      counterGoals.forEach(g => newSelected.delete(g.id));
                                    } else {
                                      counterGoals.forEach(g => newSelected.add(g.id));
                                    }
                                    setSelectedGoals(newSelected);
                                  }}
                                  className="text-xs h-7 px-3 hover:bg-teal-100"
                                >
                                  {counterGoals.every(g => selectedGoals.has(g.id)) ? (
                                    <>
                                      <Icon name="Square" className="h-3 w-3 mr-1" />
                                      Снять все
                                    </>
                                  ) : (
                                    <>
                                      <Icon name="CheckSquare" className="h-3 w-3 mr-1" />
                                      Выбрать все
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* Цели счётчика */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pl-2">
                              {counterGoals.map((goal) => (
                                <div
                                  key={goal.id}
                                  className={`flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                    selectedGoals.has(goal.id)
                                      ? 'bg-gradient-to-br from-teal-50 to-green-50 border-teal-300 shadow-md'
                                      : 'bg-white hover:bg-teal-50 hover:border-teal-200 hover:shadow-sm'
                                  }`}
                                  onClick={() => handleGoalToggle(goal.id)}
                                >
                                  <Checkbox
                                    checked={selectedGoals.has(goal.id)}
                                    onCheckedChange={() => handleGoalToggle(goal.id)}
                                    className="mt-0.5 flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 break-words leading-tight">{goal.name}</p>
                                    <p className="text-xs text-slate-500 mt-1">ID: {goal.id}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              </>
            )}
          </CardContent>
            </Card>
          </div>

          <div className="sticky bottom-8 mt-8 p-6 bg-white/80 backdrop-blur-lg border-2 border-green-200 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Icon name="CheckCircle2" className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-lg text-slate-900">Готово к сохранению</p>
                  <p className="text-sm text-slate-600">
                    {selectedCampaigns.size} кампаний • {selectedCounters.size} счётчиков • {selectedGoals.size} целей
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => navigate('/rsya')}
                  variant="outline"
                  size="lg"
                  className="border-2"
                >
                  <Icon name="X" className="mr-2 h-4 w-4" />
                  Отмена
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || selectedCampaigns.size === 0 || selectedGoals.size === 0}
                  size="lg"
                  className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-700 hover:via-green-700 hover:to-teal-700 shadow-lg shadow-green-500/30 px-8"
                >
                  {saving ? (
                    <>
                      <Icon name="Loader2" className="mr-2 h-5 w-5 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Icon name="Rocket" className="mr-2 h-5 w-5" />
                      Сохранить и запустить
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}