import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { AppSidebar } from '@/components/AppSidebar';
import { useToast } from '@/hooks/use-toast';

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface Goal {
  id: string;
  name: string;
  type: string;
}

export default function RSYASetup() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());
  const [autoSelectCampaigns, setAutoSelectCampaigns] = useState(true);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('rsya_yandex_token');
      if (!token) {
        toast({
          title: 'Ошибка',
          description: 'Токен авторизации не найден',
          variant: 'destructive'
        });
        navigate('/rsya');
        return;
      }

      const response = await fetch(`https://functions.poehali.dev/6b18ca7b-7f12-4758-a9db-4f774aaf2d23`, {
        headers: {
          'X-Auth-Token': token
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }

      const data = await response.json();
      
      setCampaigns(data.campaigns || []);
      
      const allGoals: Goal[] = [];
      const goalsMap = new Map<string, Goal>();
      
      data.campaigns?.forEach((camp: any) => {
        camp.goals?.forEach((goal: Goal) => {
          if (!goalsMap.has(goal.id)) {
            goalsMap.set(goal.id, goal);
            allGoals.push(goal);
          }
        });
      });
      
      setGoals(allGoals);
      
      if (autoSelectCampaigns && data.campaigns?.length > 0) {
        const campaignIds = new Set(data.campaigns.map((c: Campaign) => c.id));
        setSelectedCampaigns(campaignIds);
      }
      
      if (allGoals.length > 0) {
        const goalIds = new Set(allGoals.map(g => g.id));
        setSelectedGoals(goalIds);
      }
      
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
              <p className="text-lg text-slate-600">Выберите кампании и цели для автоматической чистки</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-2">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Icon name="Target" className="h-6 w-6 text-blue-600" />
                    Кампании РСЯ
                  </span>
                  <span className="text-sm font-normal text-slate-600">
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
                        className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => handleCampaignToggle(campaign.id)}
                      >
                        <Checkbox
                          checked={selectedCampaigns.has(campaign.id)}
                          onCheckedChange={() => handleCampaignToggle(campaign.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{campaign.name}</p>
                          <p className="text-sm text-slate-500">ID: {campaign.id}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Icon name="Trophy" className="h-6 w-6 text-purple-600" />
                    Цели Метрики
                  </span>
                  <span className="text-sm font-normal text-slate-600">
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

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {goals.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Icon name="AlertCircle" className="h-12 w-12 mx-auto mb-2 text-slate-400" />
                      <p>Цели не найдены</p>
                      <p className="text-sm">Убедитесь что в кампаниях настроены цели Метрики</p>
                    </div>
                  ) : (
                    goals.map((goal) => (
                      <div
                        key={goal.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => handleGoalToggle(goal.id)}
                      >
                        <Checkbox
                          checked={selectedGoals.has(goal.id)}
                          onCheckedChange={() => handleGoalToggle(goal.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{goal.name}</p>
                          <p className="text-sm text-slate-500">ID: {goal.id}</p>
                        </div>
                      </div>
                    ))
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