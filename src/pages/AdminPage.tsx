import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import func2url from '../../backend/func2url.json';

interface User {
  userId: string;
  email: string;
  planType: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchUserId, setSearchUserId] = useState('');
  const [newPlan, setNewPlan] = useState<{ userId: string; planType: string; days: number }>({
    userId: '',
    planType: 'trial',
    days: 1
  });
  const { toast } = useToast();

  useEffect(() => {
    const authStatus = sessionStorage.getItem('adminAuth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      loadUsers();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'directkit2024') {
      setIsAuthenticated(true);
      sessionStorage.setItem('adminAuth', 'true');
      loadUsers();
      toast({
        title: 'Вход выполнен',
        description: 'Добро пожаловать в админ-панель'
      });
    } else {
      toast({
        title: 'Ошибка входа',
        description: 'Неверный логин или пароль',
        variant: 'destructive'
      });
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('adminAuth');
    setUsername('');
    setPassword('');
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${func2url.subscription}?action=admin_list`, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить список пользователей',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const searchUser = async () => {
    if (!searchUserId.trim()) {
      loadUsers();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(func2url.subscription, {
        method: 'GET',
        headers: {
          'X-User-Id': searchUserId
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers([{ ...data, userId: searchUserId }]);
      } else {
        toast({
          title: 'Пользователь не найден',
          variant: 'destructive'
        });
        setUsers([]);
      }
    } catch (error) {
      console.error('Ошибка поиска:', error);
      toast({
        title: 'Ошибка поиска',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSubscription = async () => {
    if (!newPlan.userId) {
      toast({
        title: 'Ошибка',
        description: 'Введите ID пользователя',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(func2url.subscription, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': newPlan.userId
        },
        body: JSON.stringify({
          planType: newPlan.planType,
          days: newPlan.days
        })
      });

      if (response.ok) {
        toast({
          title: 'Подписка обновлена',
          description: `Пользователю ${newPlan.userId} назначен тариф ${newPlan.planType}`
        });
        loadUsers();
        setNewPlan({ userId: '', planType: 'trial', days: 1 });
      } else {
        throw new Error('Ошибка обновления');
      }
    } catch (error) {
      console.error('Ошибка обновления подписки:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить подписку',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center">
                <Icon name="Shield" size={32} className="text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Админ-панель</CardTitle>
            <CardDescription className="text-center">
              Введите учетные данные для доступа
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Логин</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                <Icon name="LogIn" size={18} className="mr-2" />
                Войти
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <Icon name="Shield" size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Админ-панель</h1>
              <p className="text-muted-foreground">Управление подписками пользователей</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <Icon name="LogOut" size={18} className="mr-2" />
            Выйти
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Поиск пользователя</CardTitle>
              <CardDescription>Найти пользователя по ID</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="User ID"
                  value={searchUserId}
                  onChange={(e) => setSearchUserId(e.target.value)}
                />
                <Button onClick={searchUser} disabled={loading}>
                  <Icon name="Search" size={18} />
                </Button>
                <Button variant="outline" onClick={loadUsers} disabled={loading}>
                  <Icon name="RefreshCw" size={18} />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Назначить подписку</CardTitle>
              <CardDescription>Создать или изменить подписку пользователя</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>User ID</Label>
                <Input
                  placeholder="user_123456"
                  value={newPlan.userId}
                  onChange={(e) => setNewPlan({ ...newPlan, userId: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Тариф</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={newPlan.planType}
                    onChange={(e) => setNewPlan({ ...newPlan, planType: e.target.value })}
                  >
                    <option value="trial">Trial</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Дней</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newPlan.days}
                    onChange={(e) => setNewPlan({ ...newPlan, days: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <Button onClick={updateSubscription} disabled={loading} className="w-full">
                <Icon name="Check" size={18} className="mr-2" />
                Назначить подписку
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Список пользователей ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Пользователи не найдены</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">User ID</th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Тариф</th>
                      <th className="text-left p-3">Статус</th>
                      <th className="text-left p-3">Истекает</th>
                      <th className="text-left p-3">Создан</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-mono text-sm">{user.userId}</td>
                        <td className="p-3">{user.email || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.planType === 'monthly' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {user.planType}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="p-3 text-sm">
                          {new Date(user.expiresAt).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="p-3 text-sm">
                          {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
