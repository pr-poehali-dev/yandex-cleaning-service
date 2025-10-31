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
          'X-User-Id': user.id
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
          'X-User-Id': user.id
        },
        body: JSON.stringify({ action: 'activate' })
      });

      if (response.ok) {
        toast({
          title: '🎉 Подписка активирована!',
          description: 'Теперь вы можете пользоваться сервисом целый месяц'
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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center ml-64">
          <div className="text-center">
            <Icon name="Loader2" className="animate-spin h-12 w-12 text-purple-600 mx-auto mb-4" />
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 ml-64">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Заголовок */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4 shadow-lg">
                <Icon name="CreditCard" size={32} className="text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Управление подпиской</h1>
              <p className="text-lg text-gray-600">Безлимитный сбор фраз и AI-кластеризация</p>
            </div>

            {/* Текущий статус */}
            <Card className="p-8 border-2">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Текущий статус</h2>
                  <p className="text-gray-600">Информация о вашей подписке</p>
                </div>
                {subscription?.hasAccess && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full font-semibold">
                    <Icon name="CheckCircle2" size={20} />
                    Активна
                  </div>
                )}
                {!subscription?.hasAccess && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-full font-semibold">
                    <Icon name="XCircle" size={20} />
                    Неактивна
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="Package" size={20} className="text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">Тариф</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {subscription?.planType === 'trial' ? '🎁 Триал' : '💎 Месячная'}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="Calendar" size={20} className="text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">Действует до</span>
                  </div>
                  <p className="text-xl font-bold">
                    {subscription?.hasAccess ? formatDate(subscription.expiresAt) : '—'}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="Clock" size={20} className="text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">Осталось дней</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {subscription?.hasAccess ? (
                      <span className={daysLeft < 3 ? 'text-red-600' : 'text-green-600'}>
                        {daysLeft}
                      </span>
                    ) : '0'}
                  </p>
                </div>
              </div>

              {/* Предупреждения */}
              {subscription?.hasAccess && daysLeft < 7 && subscription.planType === 'trial' && (
                <div className="mt-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded">
                  <div className="flex items-start gap-3">
                    <Icon name="AlertTriangle" size={20} className="text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-orange-900">Триал скоро закончится</p>
                      <p className="text-orange-800 text-sm mt-1">
                        Осталось {daysLeft} {daysLeft === 1 ? 'день' : 'дня'}. Оформите подписку, чтобы продолжить пользоваться сервисом.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!subscription?.hasAccess && (
                <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                  <div className="flex items-start gap-3">
                    <Icon name="XCircle" size={20} className="text-red-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900">Подписка неактивна</p>
                      <p className="text-red-800 text-sm mt-1">
                        Для продолжения работы необходимо оформить подписку
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Тарифы */}
            <div>
              <h2 className="text-2xl font-bold mb-6 text-center">Доступные тарифы</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* Триал */}
                <Card className="p-6 border-2">
                  <div className="mb-6">
                    <Icon name="Gift" className="h-12 w-12 text-blue-600 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Пробный период</h3>
                    <div className="text-3xl font-bold text-gray-900 mb-2">Бесплатно</div>
                    <p className="text-gray-600">1 день полного доступа</p>
                  </div>
                  
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2">
                      <Icon name="Check" className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>Сбор до 500 фраз за запрос</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Icon name="Check" className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>AI-кластеризация GPT-4</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Icon name="Check" className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>Экспорт в Excel</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Icon name="Check" className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>Все регионы России</span>
                    </li>
                  </ul>

                  {subscription?.planType === 'trial' && subscription?.hasAccess ? (
                    <Button disabled className="w-full" size="lg">
                      <Icon name="Check" className="mr-2 h-5 w-5" />
                      Активирован
                    </Button>
                  ) : (
                    <Button disabled className="w-full" size="lg" variant="outline">
                      Триал использован
                    </Button>
                  )}
                </Card>

                {/* Месячная подписка */}
                <Card className="p-6 border-4 border-purple-600 relative shadow-xl">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-1.5 rounded-full text-sm font-bold shadow-lg">
                    ⭐ Популярный
                  </div>
                  
                  <div className="mb-6 mt-2">
                    <Icon name="Sparkles" className="h-12 w-12 text-purple-600 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Месячная подписка</h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold text-gray-900">500₽</span>
                      <span className="text-gray-600">/месяц</span>
                    </div>
                    <p className="text-gray-600">30 дней безлимита</p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2">
                      <Icon name="Zap" className="h-5 w-5 text-purple-600 flex-shrink-0" />
                      <span className="font-semibold">Безлимитный сбор фраз</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Icon name="Infinity" className="h-5 w-5 text-purple-600 flex-shrink-0" />
                      <span className="font-semibold">Неограниченные проекты</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Icon name="Brain" className="h-5 w-5 text-purple-600 flex-shrink-0" />
                      <span>AI-кластеризация GPT-4</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Icon name="Download" className="h-5 w-5 text-purple-600 flex-shrink-0" />
                      <span>Экспорт в Excel и CSV</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Icon name="MapPin" className="h-5 w-5 text-purple-600 flex-shrink-0" />
                      <span>Все регионы России</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Icon name="HeadphonesIcon" className="h-5 w-5 text-purple-600 flex-shrink-0" />
                      <span>Приоритетная поддержка</span>
                    </li>
                  </ul>

                  {subscription?.planType === 'monthly' && subscription?.hasAccess ? (
                    <div>
                      <Button disabled className="w-full mb-4" size="lg">
                        <Icon name="Check" className="mr-2 h-5 w-5" />
                        Подписка активна
                      </Button>
                      <p className="text-center text-sm text-gray-600">
                        Действует до {formatDate(subscription.expiresAt)}
                      </p>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleActivate} 
                      disabled={activating}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" 
                      size="lg"
                    >
                      {activating ? (
                        <>
                          <Icon name="Loader2" className="mr-2 h-5 w-5 animate-spin" />
                          Обработка...
                        </>
                      ) : (
                        <>
                          <Icon name="CreditCard" className="mr-2 h-5 w-5" />
                          Оплатить 500₽
                        </>
                      )}
                    </Button>
                  )}
                </Card>
              </div>
            </div>

            {/* Что входит в подписку */}
            <Card className="p-8">
              <h3 className="text-xl font-bold mb-6">Что входит в подписку?</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Icon name="Search" size={24} className="text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Сбор семантики</h4>
                    <p className="text-gray-600 text-sm">Автоматический парсинг до 500 фраз за один запрос из Яндекс.Wordstat</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Icon name="Grid3x3" size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Умная кластеризация</h4>
                    <p className="text-gray-600 text-sm">AI группирует фразы по интентам и автоматически находит минус-слова</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Icon name="FileSpreadsheet" size={24} className="text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Экспорт данных</h4>
                    <p className="text-gray-600 text-sm">Выгрузка готовых кластеров в Excel для загрузки в Яндекс.Директ</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Icon name="MapPin" size={24} className="text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Региональность</h4>
                    <p className="text-gray-600 text-sm">Сбор частотности по любым регионам России от Москвы до Владивостока</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Кнопка назад */}
            <div className="text-center">
              <Button variant="ghost" onClick={() => navigate('/home')} size="lg">
                <Icon name="ArrowLeft" className="mr-2 h-5 w-5" />
                Вернуться на главную
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
