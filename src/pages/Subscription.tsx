import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
          title: 'Подписка активирована!',
          description: 'Теперь вы можете пользоваться сервисом целый месяц'
        });
        loadSubscription();
      } else {
        throw new Error('Activation failed');
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось активировать подписку',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader2" className="animate-spin h-12 w-12 text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  const daysLeft = subscription?.expiresAt 
    ? Math.max(0, Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Подписка на сбор ключевых слов</h1>
            <p className="text-lg text-gray-600">Безлимитный сбор фраз из Яндекс.Вордстат и автокластеризация</p>
          </div>

          {subscription?.hasAccess && subscription.planType === 'trial' && (
            <div className="mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Icon name="Clock" className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900">Триал активен</h3>
                  <p className="text-blue-700">
                    {daysLeft === 0 ? 'Последний день' : `Осталось ${daysLeft} дней бесплатного доступа`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {subscription?.status === 'expired' && (
            <div className="mb-8 p-6 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Icon name="AlertCircle" className="h-6 w-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-900">Подписка истекла</h3>
                  <p className="text-red-700">Оформите подписку, чтобы продолжить пользоваться сервисом</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="p-8 border-2">
              <div className="mb-6">
                <Icon name="Gift" className="h-12 w-12 text-blue-600 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Пробный период</h2>
                <div className="text-4xl font-bold text-gray-900 mb-2">Бесплатно</div>
                <p className="text-gray-600">1 день полного доступа</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <Icon name="Check" className="h-5 w-5 text-green-600" />
                  <span>Сбор до 500 фраз</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="Check" className="h-5 w-5 text-green-600" />
                  <span>Автокластеризация AI</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="Check" className="h-5 w-5 text-green-600" />
                  <span>Экспорт в Excel</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="Check" className="h-5 w-5 text-green-600" />
                  <span>Все регионы РФ</span>
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

            <Card className="p-8 border-4 border-purple-600 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Популярный
              </div>
              <div className="mb-6">
                <Icon name="Sparkles" className="h-12 w-12 text-purple-600 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Месячная подписка</h2>
                <div className="text-4xl font-bold text-gray-900 mb-2">500₽</div>
                <p className="text-gray-600">30 дней безлимита</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <Icon name="Check" className="h-5 w-5 text-purple-600" />
                  <span className="font-semibold">Безлимитный сбор фраз</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="Check" className="h-5 w-5 text-purple-600" />
                  <span className="font-semibold">Неограниченные проекты</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="Check" className="h-5 w-5 text-purple-600" />
                  <span>Автокластеризация AI</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="Check" className="h-5 w-5 text-purple-600" />
                  <span>Экспорт в Excel</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="Check" className="h-5 w-5 text-purple-600" />
                  <span>Все регионы РФ</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="Check" className="h-5 w-5 text-purple-600" />
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
                    Действует до {subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString('ru-RU') : ''}
                  </p>
                </div>
              ) : (
                <Button onClick={handleActivate} className="w-full bg-purple-600 hover:bg-purple-700" size="lg">
                  <Icon name="CreditCard" className="mr-2 h-5 w-5" />
                  Оплатить подписку
                </Button>
              )}
            </Card>
          </div>

          <div className="text-center">
            <Button variant="ghost" onClick={() => navigate('/home')}>
              <Icon name="ArrowLeft" className="mr-2 h-4 w-4" />
              Вернуться на главную
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
