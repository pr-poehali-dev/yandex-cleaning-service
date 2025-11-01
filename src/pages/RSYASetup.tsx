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
      
      console.log('📊 Загружаем счётчики Метрики...');
      setLoadingCounters(true);
      const countersResponse = await fetch(`https://functions.poehali.dev/6b18ca7b-7f12-4758-a9db-4f774aaf2d23?action=counters`, {
        headers: {
          'X-Auth-Token': token
        }
      });

      if (countersResponse.ok) {
        const countersData = await countersResponse.json();
        const allCounters = countersData.counters || [];
        console.log('📊 Всего счётчиков:', allCounters.length);
        setCounters(allCounters);
      }
      setLoadingCounters(false);
      
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

  const handleCounterToggle = async (counterId: string) => {
    const newSelected = new Set(selectedCounters);
    const wasSelected = newSelected.has(counterId);
    
    if (wasSelected) {
      newSelected.delete(counterId);
      // Удаляем цели этого счётчика
      const updatedGoals = goals.filter(g => g.counter_id !== counterId);
      setGoals(updatedGoals);
      // Удаляем выбранные цели этого счётчика
      const newSelectedGoals = new Set(selectedGoals);
      goals.filter(g => g.counter_id === counterId).forEach(g => newSelectedGoals.delete(g.id));
      setSelectedGoals(newSelectedGoals);
    } else {
      newSelected.add(counterId);
      // Автоматически загружаем цели для этого счётчика
      await loadGoalsForCounter(counterId);
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

  const loadGoalsForCounter = async (counterId: string) => {
    try {
      setLoadingGoals(true);
      
      const userId = localStorage.getItem('user_id') || '1';
      const projectResponse = await fetch(`${RSYA_PROJECTS_URL}?project_id=${projectId}`, {
        method: 'GET',
        headers: { 'X-User-Id': userId }
      });
      
      if (!projectResponse.ok) return;
      
      const projectData = await projectResponse.json();
      const token = projectData.project.yandex_token;
      
      console.log('🎯 Загружаем цели из счётчика:', counterId);
      
      const goalsResponse = await fetch(
        `https://functions.poehali.dev/6b18ca7b-7f12-4758-a9db-4f774aaf2d23?action=goals&counter_ids=${counterId}`,
        {
          headers: {
            'X-Auth-Token': token
          }
        }
      );

      if (goalsResponse.ok) {
        const goalsData = await goalsResponse.json();
        const counterGoals = goalsData.goals || [];
        console.log('🎯 Загружено целей из счётчика:', counterGoals.length);
        
        // Добавляем цели к существующим (не заменяем)
        const updatedGoals = [...goals, ...counterGoals];
        setGoals(updatedGoals);
        
        // Автоматически выбираем новые цели
        const newSelectedGoals = new Set(selectedGoals);
        counterGoals.forEach((g: Goal) => newSelectedGoals.add(g.id));
        setSelectedGoals(newSelectedGoals);
        
        toast({
          title: 'Цели загружены',
          description: `Добавлено ${counterGoals.length} целей из счётчика`
        });
      }
    } catch (error) {
      console.error('Error loading goals:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить цели',
        variant: 'destructive'
      });
    } finally {
      setLoadingGoals(false);
    }
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
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Настройка проекта РСЯ</h1>
              <p className="text-lg text-slate-600">Выберите кампании, счётчики и цели для автоматической чистки</p>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border-2">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Icon name="Target" className="h-5 w-5 text-blue-600" />
                    <span className="text-lg">Кампании РСЯ</span>
                  </span>
                  <span className="text-xs font-normal text-slate-600">
                    {selectedCampaigns.size} из {campaigns.length}
                  </span>
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
                        className="flex items-start gap-2 p-2.5 rounded-lg border bg-white hover:bg-slate-50 cursor-pointer transition-colors"
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

            <Card className="border-2">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Icon name="BarChart3" className="h-5 w-5 text-orange-600" />
                    <span className="text-lg">Счётчики Метрики</span>
                  </span>
                  <span className="text-xs font-normal text-slate-600">
                    {selectedCounters.size} из {counters.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {loadingCounters ? (
                  <div className="text-center py-8">
                    <Icon name="Loader2" className="h-8 w-8 animate-spin text-orange-600 mx-auto mb-2" />
                    <p className="text-slate-600">Загрузка счётчиков...</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800">
                        <Icon name="Info" className="h-4 w-4 inline mr-1" />
                        Нажмите на счётчик чтобы загрузить его цели
                      </p>
                    </div>

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
                              className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                                isSelected 
                                  ? 'bg-orange-50 border-orange-300 shadow-sm' 
                                  : 'bg-white hover:bg-orange-50 hover:border-orange-200'
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
                                  <p className="text-xs text-orange-600 mt-0.5">{counter.site}</p>
                                )}
                              </div>
                              {loadingGoals && isSelected && (
                                <Icon name="Loader2" className="h-4 w-4 animate-spin text-orange-600" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Icon name="Trophy" className="h-5 w-5 text-purple-600" />
                    <span className="text-lg">Цели из выбранных счётчиков</span>
                  </span>
                  <span className="text-xs font-normal text-slate-600">
                    {selectedGoals.size} из {goals.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex gap-2 mb-4">
                  <Button
                    onClick={handleSelectAllGoals}
                    variant="outline"
                    size="sm"
                  >
                    <Icon name="CheckSquare" className="h-4 w-4 mr-2" />
                    Выбрать все
                  </Button>
                </div>

                <div className="space-y-6">
                  {goals.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Icon name="Target" className="h-12 w-12 mx-auto mb-2 text-slate-400" />
                      <p className="font-medium">Цели не загружены</p>
                      <p className="text-sm mt-1">Нажмите на счётчики выше чтобы загрузить их цели</p>
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
                            <div className="flex items-center justify-between bg-gradient-to-r from-purple-100 to-pink-100 p-3 rounded-lg border-2 border-purple-200">
                              <div className="flex items-center gap-3">
                                <Icon name="BarChart3" className="h-5 w-5 text-purple-600" />
                                <div>
                                  <h3 className="font-semibold text-slate-900">{counterName}</h3>
                                  <p className="text-xs text-slate-600">ID: {counterId}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-purple-700">
                                  {selectedInCounter} / {counterGoals.length}
                                </span>
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
                                  className="text-xs h-7 px-2"
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
                                  className="flex items-start gap-2 p-2.5 rounded-lg border bg-white hover:bg-purple-50 cursor-pointer transition-colors"
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
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              onClick={() => navigate('/rsya')}
              variant="outline"
              size="lg"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || selectedCampaigns.size === 0 || selectedGoals.size === 0}
              size="lg"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              {saving ? (
                <>
                  <Icon name="Loader2" className="mr-2 h-5 w-5 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Icon name="Check" className="mr-2 h-5 w-5" />
                  Сохранить и продолжить
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}