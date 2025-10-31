import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from '@/components/layout/AppSidebar';
import func2url from '../../backend/func2url.json';

interface SubscriptionStatus {
  hasAccess: boolean;
  planType: 'trial' | 'monthly';
  status: 'active' | 'expired';
  expiresAt?: string;
  trialEndsAt?: string;
}

export default function Subscription() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(func2url.subscription, {
        headers: {
          'X-User-Id': user.id.toString()
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!user?.id) return;

    setActivating(true);
    try {
      const response = await fetch(func2url.subscription, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id.toString()
        },
        body: JSON.stringify({ action: 'activate' })
      });

      if (response.ok) {
        toast({
          title: 'Подписка активирована',
          description: 'Месячная подписка успешно оформлена'
        });
        await loadSubscription();
      } else {
        throw new Error('Activation failed');
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось активировать подписку',
        variant: 'destructive'
      });
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <>
        <AppSidebar />
        <div className="min-h-screen bg-slate-50 flex items-center justify-center ml-64">
          <div className="text-center">
            <Icon name="Loader2" className="animate-spin h-12 w-12 text-emerald-600 mx-auto mb-4" />
            <p className="text-gray-600">Загрузка...</p>
          </div>
        </div>
      </>
    );
  }

  const daysLeft = subscription?.expiresAt 
    ? Math.max(0, Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-slate-50 ml-64">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Подписка</h1>
                <p className="text-gray-600">Управление тарифом и доступом к сервису</p>
              </div>
              {user?.userId && (
                <div className="px-4 py-2 bg-white border border-slate-200 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">ID профиля</div>
                  <div className="font-mono text-sm text-gray-700">{user.userId}</div>
                </div>
              )}
            </div>

            <Card className="p-6 bg-white border border-slate-200 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold mb-1">Текущий статус</h2>
                  <p className="text-sm text-gray-500">Информация о вашей подписке</p>
                </div>
                {subscription?.hasAccess ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg font-medium text-sm">
                    <Icon name="CheckCircle2" size={16} />
                    Активна
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-800 rounded-lg font-medium text-sm">
                    <Icon name="XCircle" size={16} />
                    Неактивна
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="Package" size={18} className="text-emerald-600" />
                    <span className="text-sm font-medium text-gray-600">Тариф</span>
                  </div>
                  <p className="text-xl font-semibold text-gray-900">
                    {subscription?.planType === 'trial' ? 'Триал' : 'Месячная'}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="Calendar" size={18} className="text-emerald-600" />
                    <span className="text-sm font-medium text-gray-600">Действует до</span>
                  </div>
                  <p className="text-base font-semibold text-gray-900">
                    {subscription?.hasAccess ? formatDate(subscription.expiresAt) : '—'}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="Clock" size={18} className="text-emerald-600" />
                    <span className="text-sm font-medium text-gray-600">Осталось дней</span>
                  </div>
                  <p className="text-xl font-semibold">
                    {subscription?.hasAccess ? (
                      <span className={daysLeft < 3 ? 'text-red-600' : 'text-emerald-600'}>
                        {daysLeft}
                      </span>
                    ) : '0'}
                  </p>
                </div>
              </div>

              {subscription?.hasAccess && daysLeft < 7 && subscription.planType === 'trial' && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Icon name="AlertTriangle" size={20} className="text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-orange-900">Триал скоро закончится</p>
                      <p className="text-orange-800 text-sm mt-1">
                        Осталось {daysLeft} {daysLeft === 1 ? 'день' : 'дня'}. Оформите подписку, чтобы продолжить.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!subscription?.hasAccess && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Icon name="XCircle" size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-900">Подписка неактивна</p>
                      <p className="text-red-800 text-sm mt-1">
                        Для продолжения работы необходимо оформить подписку
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <div>
              <h2 className="text-2xl font-semibold mb-6">Доступные тарифы</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <Card className={`p-6 border-2 ${
                  subscription?.planType === 'trial' 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-slate-200 bg-white'
                }`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-1">Триал</h3>
                      <p className="text-sm text-gray-600">Пробный период</p>
                    </div>
                    {subscription?.planType === 'trial' && (
                      <div className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium">
                        Активен
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-bold text-gray-900">0₽</span>
                      <span className="text-gray-500">/ 1 день</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                      <Icon name="Check" size={20} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Доступ ко всем функциям</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Icon name="Check" size={20} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Безлимитный сбор фраз</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Icon name="Check" size={20} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">AI-кластеризация</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Icon name="Check" size={20} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Экспорт данных</span>
                    </div>
                  </div>

                  <Button 
                    disabled
                    className="w-full bg-slate-200 text-slate-500 cursor-not-allowed"
                  >
                    Автоматически при регистрации
                  </Button>
                </Card>

                <Card className={`p-6 border-2 ${
                  subscription?.planType === 'monthly' 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-slate-200 bg-white'
                }`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-1">Месячная подписка</h3>
                      <p className="text-sm text-gray-600">Полный доступ на 30 дней</p>
                    </div>
                    {subscription?.planType === 'monthly' && (
                      <div className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium">
                        Активен
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-bold text-gray-900">500₽</span>
                      <span className="text-gray-500">/ месяц</span>
                    </div>
                    <p className="text-sm text-emerald-600 font-medium">Выгода 50% от аналогов</p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                      <Icon name="Check" size={20} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Все функции триала</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Icon name="Check" size={20} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Приоритетная поддержка</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Icon name="Check" size={20} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Ранний доступ к новым функциям</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Icon name="Check" size={20} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Увеличенные лимиты</span>
                    </div>
                  </div>

                  {subscription?.planType === 'monthly' ? (
                    <Button 
                      disabled
                      className="w-full bg-emerald-600 text-white"
                    >
                      <Icon name="CheckCircle2" size={18} className="mr-2" />
                      Уже активна
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleActivate}
                      disabled={activating}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {activating ? (
                        <>
                          <Icon name="Loader2" size={18} className="mr-2 animate-spin" />
                          Активация...
                        </>
                      ) : (
                        <>
                          <Icon name="Zap" size={18} className="mr-2" />
                          Активировать (для теста)
                        </>
                      )}
                    </Button>
                  )}
                </Card>
              </div>
            </div>

            <Card className="p-6 bg-white border border-slate-200">
              <h3 className="text-lg font-semibold mb-4">Что входит в подписку</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Icon name="Sparkles" size={18} className="text-emerald-600" />
                    Сбор ключевых фраз
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-0.5">•</span>
                      <span>Интеграция с Яндекс.Wordstat</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-0.5">•</span>
                      <span>Автоматический парсинг по регионам</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-0.5">•</span>
                      <span>Безлимитное количество запросов</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Icon name="Brain" size={18} className="text-emerald-600" />
                    AI-кластеризация
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-0.5">•</span>
                      <span>Умная группировка по смыслу</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-0.5">•</span>
                      <span>Автоматические названия кластеров</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-0.5">•</span>
                      <span>Экспорт в удобные форматы</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Icon name="TrendingUp" size={18} className="text-emerald-600" />
                    Аналитика
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-0.5">•</span>
                      <span>Статистика по запросам</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-0.5">•</span>
                      <span>Анализ частотности</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-0.5">•</span>
                      <span>Визуализация данных</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Icon name="Headphones" size={18} className="text-emerald-600" />
                    Поддержка
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-0.5">•</span>
                      <span>Быстрая техподдержка</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-0.5">•</span>
                      <span>Обучающие материалы</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-0.5">•</span>
                      <span>Регулярные обновления</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            <div className="text-center text-sm text-gray-500">
              <p>При возникновении вопросов обращайтесь в службу поддержки</p>
              <p className="mt-1">Email: support@directkit.ru • Telegram: @directkit_support</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
