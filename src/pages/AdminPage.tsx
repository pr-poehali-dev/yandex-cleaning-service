import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import func2url from '../../backend/func2url.json';

interface User {
  userId: string;
  phone?: string;
  planType: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  hasAccess?: boolean;
}

interface Stats {
  total: number;
  activeTrial: number;
  activeMonthly: number;
  newToday: number;
  expiringWeek: number;
}

type TabType = 'dashboard' | 'users' | 'analytics' | 'bulk';

const ADMIN_KEY = 'directkit_admin_2024';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
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

  const LIMIT = 50;

  useEffect(() => {
    const authStatus = sessionStorage.getItem('adminAuth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      loadInitialData();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'directkit2024') {
      setIsAuthenticated(true);
      sessionStorage.setItem('adminAuth', 'true');
      loadInitialData();
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

  const loadInitialData = async () => {
    await Promise.all([loadUsers(0, true), loadStats()]);
  };

  const loadStats = async () => {
    try {
      const response = await fetch(
        `${func2url.subscription}?action=admin_stats`,
        {
          method: 'GET',
          headers: {
            'X-Admin-Key': ADMIN_KEY
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  const loadUsers = async (offsetValue: number = 0, reset: boolean = false) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await fetch(
        `${func2url.subscription}?action=admin_all&limit=${LIMIT}&offset=${offsetValue}`,
        {
          method: 'GET',
          headers: {
            'X-Admin-Key': ADMIN_KEY
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (reset) {
          setUsers(data.users || []);
        } else {
          setUsers(prev => [...prev, ...(data.users || [])]);
        }
        
        setTotal(data.total || 0);
        setHasMore(data.hasMore || false);
        setOffset(offsetValue + LIMIT);
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
      setLoadingMore(false);
    }
  };

  const loadMoreUsers = () => {
    if (!loadingMore && hasMore) {
      loadUsers(offset, false);
    }
  };

  const updateSubscription = async (targetUserId: string, planType: string, days: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${func2url.subscription}?action=admin_update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': ADMIN_KEY
          },
          body: JSON.stringify({
            userId: targetUserId,
            planType,
            days
          })
        }
      );

      if (response.ok) {
        toast({
          title: 'Подписка обновлена',
          description: `Пользователю ${targetUserId} назначен тариф ${planType} на ${days} дней`
        });
        await loadInitialData();
        return true;
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
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubscription = async () => {
    if (!newPlan.userId) {
      toast({
        title: 'Ошибка',
        description: 'Введите ID пользователя',
        variant: 'destructive'
      });
      return;
    }

    const success = await updateSubscription(newPlan.userId, newPlan.planType, newPlan.days);
    if (success) {
      setNewPlan({ userId: '', planType: 'trial', days: 1 });
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
      const success = await updateSubscription(userId, bulkPlan.planType, bulkPlan.days);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    setLoading(false);
    toast({
      title: 'Массовое обновление завершено',
      description: `Успешно: ${successCount}, Ошибок: ${errorCount}`
    });
    setBulkUserIds('');
  };

  const deleteUser = async (userId: string) => {
    if (!confirm(`Удалить пользователя ${userId}?`)) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${func2url.subscription}?action=admin_delete&userId=${userId}`,
        {
          method: 'DELETE',
          headers: {
            'X-Admin-Key': ADMIN_KEY
          }
        }
      );

      if (response.ok) {
        toast({
          title: 'Пользователь удален',
          description: `${userId} успешно удален`
        });
        await loadInitialData();
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить пользователя',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredUsers = () => {
    let filtered = [...users];

    if (filterStatus !== 'all') {
      if (filterStatus === 'active') {
        filtered = filtered.filter(u => u.hasAccess);
      } else if (filterStatus === 'expired') {
        filtered = filtered.filter(u => !u.hasAccess);
      }
    }

    if (filterPlan !== 'all') {
      filtered = filtered.filter(u => u.planType === filterPlan);
    }

    filtered.sort((a, b) => {
      let aVal: any = a[sortBy as keyof User];
      let bVal: any = b[sortBy as keyof User];

      if (sortBy === 'createdAt' || sortBy === 'expiresAt') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
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
      ['User ID', 'Phone', 'Plan Type', 'Status', 'Has Access', 'Expires At', 'Created At'].join(','),
      ...filtered.map(u => [
        u.userId,
        u.phone || '',
        u.planType,
        u.status,
        u.hasAccess ? 'Yes' : 'No',
        u.expiresAt || '',
        u.createdAt || ''
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center">
                <Icon name="Shield" size={40} className="text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl text-center text-gray-900">
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
              <Button type="submit" className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700">
                <Icon name="LogIn" size={20} className="mr-2" />
                Войти
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredUsers = getFilteredUsers();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-emerald-600 text-white p-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Icon name="Shield" size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">DirectKit Admin</h1>
              <p className="text-purple-100">Управление подписками • {total} пользователей</p>
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
            { id: 'users', label: `Пользователи (${users.length})`, icon: 'Users' },
            { id: 'analytics', label: 'Аналитика', icon: 'BarChart3' },
            { id: 'bulk', label: 'Массовые операции', icon: 'Settings' }
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={activeTab === tab.id ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              <Icon name={tab.icon as any} size={18} className="mr-2" />
              {tab.label}
            </Button>
          ))}
        </div>

        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">Всего пользователей</CardTitle>
                    <Icon name="Users" size={20} className="text-emerald-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900">{stats.total}</div>
                  <p className="text-xs mt-1 text-gray-500">Новых сегодня: {stats.newToday}</p>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">Активные Trial</CardTitle>
                    <Icon name="Zap" size={20} className="text-emerald-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900">{stats.activeTrial}</div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">Истекает на неделе</CardTitle>
                    <Icon name="AlertTriangle" size={20} className="text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900">{stats.expiringWeek}</div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">Активные Monthly</CardTitle>
                    <Icon name="CheckCircle2" size={20} className="text-emerald-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900">{stats.activeMonthly}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="shadow-sm border border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Icon name="TrendingUp" size={20} className="text-emerald-600" />
                    Быстрые действия
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => setActiveTab('users')}>
                    <Icon name="Users" size={18} className="mr-2" />
                    Все пользователи
                  </Button>
                  <Button className="w-full" variant="outline" onClick={exportToCSV}>
                    <Icon name="Download" size={18} className="mr-2" />
                    Экспорт в CSV
                  </Button>
                  <Button className="w-full" variant="outline" onClick={loadInitialData}>
                    <Icon name="RefreshCw" size={18} className="mr-2" />
                    Обновить данные
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Icon name="Target" size={20} className="text-emerald-600" />
                    Конверсия
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-emerald-600 mb-2">
                      {stats.total > 0 ? Math.round((stats.activeMonthly / stats.total) * 100) : 0}%
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Trial → Monthly
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Icon name="Activity" size={20} className="text-emerald-600" />
                    Активность
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                    <span className="text-sm">Trial</span>
                    <span className="text-lg font-bold text-emerald-600">{stats.activeTrial}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                    <span className="text-sm">Monthly</span>
                    <span className="text-lg font-bold text-emerald-600">{stats.activeMonthly}</span>
                  </div>
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

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Назначить подписку</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-2">
                    <Input
                      placeholder="User ID"
                      value={newPlan.userId}
                      onChange={(e) => setNewPlan({ ...newPlan, userId: e.target.value })}
                      className="md:col-span-1"
                    />
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
                    <Button onClick={handleUpdateSubscription} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                      <Icon name="Check" size={18} className="mr-2" />
                      Назначить
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Пользователи ({filteredUsers.length} из {total})</CardTitle>
                    <CardDescription>
                      Загружено: {users.length} • {hasMore ? 'Есть еще' : 'Все загружены'}
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
                    <Icon name="Loader2" size={32} className="animate-spin mx-auto text-emerald-600" />
                    <p className="mt-4 text-muted-foreground">Загрузка...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Icon name="Users" size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Пользователи не найдены</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-slate-50">
                            <th className="text-left p-3 font-semibold">User ID</th>
                            <th className="text-left p-3 font-semibold">Телефон</th>
                            <th className="text-left p-3 font-semibold">Тариф</th>
                            <th className="text-left p-3 font-semibold">Доступ</th>
                            <th className="text-left p-3 font-semibold">Истекает</th>
                            <th className="text-left p-3 font-semibold">Создан</th>
                            <th className="text-right p-3 font-semibold">Действия</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((user, idx) => (
                            <tr key={idx} className="border-b hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-mono text-sm">{user.userId}</td>
                              <td className="p-3 text-sm">{user.phone || '—'}</td>
                              <td className="p-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  user.planType === 'monthly' 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {user.planType}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  user.hasAccess 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {user.hasAccess ? 'Активен' : 'Истек'}
                                </span>
                              </td>
                              <td className="p-3 text-sm">
                                {user.expiresAt ? new Date(user.expiresAt).toLocaleDateString('ru-RU') : '-'}
                              </td>
                              <td className="p-3 text-sm">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : '-'}
                              </td>
                              <td className="p-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteUser(user.userId)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Icon name="Trash2" size={16} />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {hasMore && (
                      <div className="mt-6 text-center">
                        <Button
                          onClick={loadMoreUsers}
                          disabled={loadingMore}
                          variant="outline"
                          className="w-full md:w-auto"
                        >
                          {loadingMore ? (
                            <>
                              <Icon name="Loader2" size={18} className="mr-2 animate-spin" />
                              Загрузка...
                            </>
                          ) : (
                            <>
                              <Icon name="ChevronDown" size={18} className="mr-2" />
                              Загрузить еще ({users.length} из {total})
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'analytics' && stats && (
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
                    {stats.total > 0 ? Math.round((stats.activeMonthly / stats.total) * 100) : 0}%
                  </div>
                  <p className="text-muted-foreground">
                    {stats.activeMonthly} из {stats.total} пользователей
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="DollarSign" size={20} />
                  Выручка
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-5xl font-bold text-green-600 mb-2">
                    {stats.revenue.toLocaleString()}₽
                  </div>
                  <p className="text-muted-foreground">
                    Ежемесячная выручка
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Users" size={20} />
                  Активность
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span>Триал активных</span>
                  <span className="text-2xl font-bold text-green-600">{stats.activeTrial}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span>Платных активных</span>
                  <span className="text-2xl font-bold text-blue-600">{stats.activeMonthly}</span>
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
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span>Истекают на неделе</span>
                  <span className="text-2xl font-bold text-orange-600">{stats.expiringWeek}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span>Новых сегодня</span>
                  <span className="text-2xl font-bold text-purple-600">{stats.newToday}</span>
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
                    <li>• Данные включают: ID, тариф, статус, даты</li>
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
                    setFilterStatus('active');
                    setFilterPlan('trial');
                  }}>
                    <Icon name="Zap" size={16} className="mr-1" />
                    Trial
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