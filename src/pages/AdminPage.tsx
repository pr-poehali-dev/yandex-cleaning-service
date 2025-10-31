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
  hasAccess?: boolean;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  trialUsers: number;
  monthlyUsers: number;
  expiredUsers: number;
  revenue: number;
  newUsersToday: number;
  expiringThisWeek: number;
}

type TabType = 'dashboard' | 'users' | 'analytics' | 'bulk';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchUserId, setSearchUserId] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [bulkUserIds, setBulkUserIds] = useState('');
  const [bulkPlan, setBulkPlan] = useState({ planType: 'trial', days: 1 });
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

  const bulkUpdateSubscriptions = async () => {
    const userIdList = bulkUserIds.split('\n').map(id => id.trim()).filter(Boolean);
    
    if (userIdList.length === 0) {
      toast({
        title: 'Ошибка',
        description: 'Введите хотя бы один User ID',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const userId of userIdList) {
      try {
        const response = await fetch(func2url.subscription, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId
          },
          body: JSON.stringify({
            planType: bulkPlan.planType,
            days: bulkPlan.days
          })
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    setLoading(false);
    toast({
      title: 'Массовое обновление завершено',
      description: `Успешно: ${successCount}, Ошибок: ${errorCount}`
    });
    loadUsers();
    setBulkUserIds('');
  };

  const calculateStats = (): Stats => {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === 'active' && u.hasAccess).length,
      trialUsers: users.filter(u => u.planType === 'trial').length,
      monthlyUsers: users.filter(u => u.planType === 'monthly').length,
      expiredUsers: users.filter(u => u.status === 'expired' || !u.hasAccess).length,
      revenue: users.filter(u => u.planType === 'monthly' && u.status === 'active').length * 500,
      newUsersToday: users.filter(u => new Date(u.createdAt) >= todayStart).length,
      expiringThisWeek: users.filter(u => {
        const expDate = new Date(u.expiresAt);
        return expDate >= now && expDate <= weekEnd;
      }).length
    };
  };

  const getFilteredUsers = () => {
    let filtered = [...users];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(u => u.status === filterStatus);
    }

    if (filterPlan !== 'all') {
      filtered = filtered.filter(u => u.planType === filterPlan);
    }

    filtered.sort((a, b) => {
      let aVal: any = a[sortBy as keyof User];
      let bVal: any = b[sortBy as keyof User];

      if (sortBy === 'createdAt' || sortBy === 'expiresAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  };

  const exportToCSV = () => {
    const filtered = getFilteredUsers();
    const csv = [
      ['User ID', 'Email', 'Plan Type', 'Status', 'Expires At', 'Created At'].join(','),
      ...filtered.map(u => [
        u.userId,
        u.email || '',
        u.planType,
        u.status,
        u.expiresAt,
        u.createdAt
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Экспорт завершен',
      description: `Экспортировано ${filtered.length} пользователей`
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-lg">
                <Icon name="Shield" size={40} className="text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Админ-панель
            </CardTitle>
            <CardDescription className="text-center text-base">
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
                  className="h-12"
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
                  className="h-12"
                />
              </div>
              <Button type="submit" className="w-full h-12 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <Icon name="LogIn" size={20} className="mr-2" />
                Войти
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = calculateStats();
  const filteredUsers = getFilteredUsers();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Icon name="Shield" size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">DirectKit Admin</h1>
              <p className="text-purple-100">Управление подписками и пользователями</p>
            </div>
          </div>
          <Button variant="secondary" onClick={handleLogout}>
            <Icon name="LogOut" size={18} className="mr-2" />
            Выйти
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'dashboard', label: 'Дашборд', icon: 'LayoutDashboard' },
            { id: 'users', label: 'Пользователи', icon: 'Users' },
            { id: 'analytics', label: 'Аналитика', icon: 'BarChart3' },
            { id: 'bulk', label: 'Массовые операции', icon: 'Settings' }
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={activeTab === tab.id ? 'bg-gradient-to-r from-purple-600 to-pink-600' : ''}
            >
              <Icon name={tab.icon as any} size={18} className="mr-2" />
              {tab.label}
            </Button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium opacity-90">Всего пользователей</CardTitle>
                    <Icon name="Users" size={20} className="opacity-75" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{stats.totalUsers}</div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium opacity-90">Активные</CardTitle>
                    <Icon name="CheckCircle2" size={20} className="opacity-75" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{stats.activeUsers}</div>
                  <p className="text-xs mt-1 opacity-75">Новых сегодня: {stats.newUsersToday}</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium opacity-90">Истекает на неделе</CardTitle>
                    <Icon name="AlertTriangle" size={20} className="opacity-75" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{stats.expiringThisWeek}</div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium opacity-90">Доход (мес.)</CardTitle>
                    <Icon name="DollarSign" size={20} className="opacity-75" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{stats.revenue.toLocaleString()}₽</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Icon name="TrendingUp" size={20} />
                    По тарифам
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Trial</span>
                    <span className="text-2xl font-bold text-green-600">{stats.trialUsers}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Monthly</span>
                    <span className="text-2xl font-bold text-blue-600">{stats.monthlyUsers}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Icon name="Activity" size={20} />
                    По статусам
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Активные</span>
                    <span className="text-2xl font-bold text-green-600">{stats.activeUsers}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="font-medium">Истекшие</span>
                    <span className="text-2xl font-bold text-red-600">{stats.expiredUsers}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Быстрые действия</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full" onClick={() => setActiveTab('users')}>
                    <Icon name="Users" size={18} className="mr-2" />
                    Все пользователи
                  </Button>
                  <Button className="w-full" variant="outline" onClick={exportToCSV}>
                    <Icon name="Download" size={18} className="mr-2" />
                    Экспорт в CSV
                  </Button>
                  <Button className="w-full" variant="outline" onClick={loadUsers}>
                    <Icon name="RefreshCw" size={18} className="mr-2" />
                    Обновить данные
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Поиск по ID</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="user_123456"
                      value={searchUserId}
                      onChange={(e) => setSearchUserId(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchUser()}
                    />
                    <Button onClick={searchUser} disabled={loading}>
                      <Icon name="Search" size={18} />
                    </Button>
                    <Button variant="outline" onClick={loadUsers} disabled={loading}>
                      <Icon name="X" size={18} />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Фильтры</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">Все статусы</option>
                    <option value="active">Активные</option>
                    <option value="expired">Истекшие</option>
                  </select>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={filterPlan}
                    onChange={(e) => setFilterPlan(e.target.value)}
                  >
                    <option value="all">Все тарифы</option>
                    <option value="trial">Trial</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Назначить подписку</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Input
                    placeholder="User ID"
                    value={newPlan.userId}
                    onChange={(e) => setNewPlan({ ...newPlan, userId: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="px-3 py-2 border rounded-md"
                      value={newPlan.planType}
                      onChange={(e) => setNewPlan({ ...newPlan, planType: e.target.value })}
                    >
                      <option value="trial">Trial</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Дней"
                      value={newPlan.days}
                      onChange={(e) => setNewPlan({ ...newPlan, days: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <Button onClick={updateSubscription} disabled={loading} className="w-full">
                    <Icon name="Check" size={18} className="mr-2" />
                    Назначить
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Пользователи ({filteredUsers.length})</CardTitle>
                    <CardDescription>
                      Отфильтровано из {users.length} пользователей
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <select
                      className="px-3 py-2 border rounded-md text-sm"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="createdAt">По дате создания</option>
                      <option value="expiresAt">По дате истечения</option>
                      <option value="planType">По тарифу</option>
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      <Icon name={sortOrder === 'asc' ? 'ArrowUp' : 'ArrowDown'} size={16} />
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToCSV}>
                      <Icon name="Download" size={16} className="mr-1" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12">
                    <Icon name="Loader2" size={32} className="animate-spin mx-auto text-purple-600" />
                    <p className="mt-4 text-muted-foreground">Загрузка...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Icon name="Users" size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Пользователи не найдены</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="text-left p-3 font-semibold">User ID</th>
                          <th className="text-left p-3 font-semibold">Email</th>
                          <th className="text-left p-3 font-semibold">Тариф</th>
                          <th className="text-left p-3 font-semibold">Статус</th>
                          <th className="text-left p-3 font-semibold">Истекает</th>
                          <th className="text-left p-3 font-semibold">Создан</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user, idx) => (
                          <tr key={idx} className="border-b hover:bg-purple-50 transition-colors">
                            <td className="p-3 font-mono text-sm">{user.userId}</td>
                            <td className="p-3">{user.email || '-'}</td>
                            <td className="p-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                user.planType === 'monthly' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {user.planType}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                user.status === 'active' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
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
        )}

        {activeTab === 'analytics' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="TrendingUp" size={20} />
                  Конверсия Trial → Monthly
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-5xl font-bold text-purple-600 mb-2">
                    {stats.monthlyUsers > 0 ? Math.round((stats.monthlyUsers / stats.totalUsers) * 100) : 0}%
                  </div>
                  <p className="text-muted-foreground">
                    {stats.monthlyUsers} из {stats.totalUsers} пользователей
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Target" size={20} />
                  Retention Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-5xl font-bold text-green-600 mb-2">
                    {stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
                  </div>
                  <p className="text-muted-foreground">
                    Активные пользователи от общего числа
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="DollarSign" size={20} />
                  Средний чек
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-5xl font-bold text-blue-600 mb-2">
                    {stats.monthlyUsers > 0 ? Math.round(stats.revenue / stats.monthlyUsers) : 0}₽
                  </div>
                  <p className="text-muted-foreground">
                    На одного платящего пользователя
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="AlertCircle" size={20} />
                  Требуют внимания
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span>Истекают на неделе</span>
                    <span className="text-xl font-bold text-orange-600">{stats.expiringThisWeek}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span>Уже истекли</span>
                    <span className="text-xl font-bold text-red-600">{stats.expiredUsers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'bulk' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Users" size={20} />
                  Массовое назначение подписок
                </CardTitle>
                <CardDescription>
                  Введите список User ID (каждый с новой строки)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>User ID (по одному на строку)</Label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-md min-h-[200px] font-mono text-sm"
                    placeholder="user_123&#10;user_456&#10;user_789"
                    value={bulkUserIds}
                    onChange={(e) => setBulkUserIds(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Будет обработано: {bulkUserIds.split('\n').filter(Boolean).length} пользователей
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Тариф</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={bulkPlan.planType}
                      onChange={(e) => setBulkPlan({ ...bulkPlan, planType: e.target.value })}
                    >
                      <option value="trial">Trial</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Количество дней</Label>
                    <Input
                      type="number"
                      min="1"
                      value={bulkPlan.days}
                      onChange={(e) => setBulkPlan({ ...bulkPlan, days: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <Button 
                  onClick={bulkUpdateSubscriptions} 
                  disabled={loading} 
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  {loading ? (
                    <>
                      <Icon name="Loader2" size={18} className="mr-2 animate-spin" />
                      Обработка...
                    </>
                  ) : (
                    <>
                      <Icon name="Zap" size={18} className="mr-2" />
                      Применить ко всем
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="FileDown" size={20} />
                  Экспорт данных
                </CardTitle>
                <CardDescription>
                  Выгрузка пользователей с учетом фильтров
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Icon name="Info" size={16} />
                    Как это работает
                  </h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Экспорт создает CSV файл</li>
                    <li>• Учитываются все активные фильтры</li>
                    <li>• Данные включают: ID, email, тариф, статус, даты</li>
                    <li>• Файл можно открыть в Excel или Google Sheets</li>
                  </ul>
                </div>
                <Button 
                  onClick={exportToCSV} 
                  variant="outline" 
                  className="w-full h-12"
                >
                  <Icon name="Download" size={18} className="mr-2" />
                  Скачать CSV ({filteredUsers.length} записей)
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => {
                    setFilterStatus('active');
                    setFilterPlan('monthly');
                  }}>
                    <Icon name="Filter" size={16} className="mr-1" />
                    Платные
                  </Button>
                  <Button variant="outline" onClick={() => {
                    const weekEnd = new Date();
                    weekEnd.setDate(weekEnd.getDate() + 7);
                    setFilterStatus('all');
                  }}>
                    <Icon name="AlertTriangle" size={16} className="mr-1" />
                    Истекают
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
