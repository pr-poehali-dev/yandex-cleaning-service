import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { useState } from 'react';

interface RSYAConnectionCardProps {
  isConnected: boolean;
  showCodeInput: boolean;
  authCode: string;
  clientLogin: string;
  setAuthCode: (value: string) => void;
  setClientLogin: (value: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleCodeInput: () => void;
  onSubmitCode: () => void;
}

export default function RSYAConnectionCard({
  isConnected,
  showCodeInput,
  authCode,
  clientLogin,
  setAuthCode,
  setClientLogin,
  onConnect,
  onDisconnect,
  onToggleCodeInput,
  onSubmitCode
}: RSYAConnectionCardProps) {
  const [showInstructions, setShowInstructions] = useState(false);

  if (isConnected) {
    return (
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-emerald-900">
                <Icon name="CheckCircle2" className="h-5 w-5 text-emerald-600" />
                Подключено к Яндекс.Директ
              </CardTitle>
              <div className="text-emerald-700 mt-1 flex items-center gap-2 flex-wrap text-sm">
                <Badge variant="default" className="text-xs bg-emerald-600">Production</Badge>
                <span>Боевой аккаунт</span>
                {clientLogin && (
                  <span className="text-xs bg-white px-2 py-0.5 rounded border border-emerald-300 font-mono">
                    {clientLogin}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  onDisconnect();
                  onToggleCodeInput();
                }} 
                variant="outline" 
                size="sm"
              >
                <Icon name="Settings" className="h-4 w-4 mr-2" />
                Изменить Client-Login
              </Button>
              <Button onClick={onDisconnect} variant="outline" size="sm">
                <Icon name="LogOut" className="h-4 w-4 mr-2" />
                Отключить
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Icon name="Link" className="h-5 w-5 text-blue-600" />
          Подключение к Яндекс.Директ
        </CardTitle>
        <CardDescription className="text-blue-700">
          Выберите режим работы и авторизуйтесь
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {setUseSandbox && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setUseSandbox(true)}
              className={`p-4 rounded-lg border-2 transition-all ${
                useSandbox
                  ? 'border-amber-400 bg-amber-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-amber-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon name="TestTube" className={`h-5 w-5 ${useSandbox ? 'text-amber-600' : 'text-slate-400'}`} />
                <span className={`font-semibold ${useSandbox ? 'text-amber-900' : 'text-slate-700'}`}>
                  Песочница
                </span>
              </div>
              <p className="text-xs text-slate-600 text-left">
                Для тестирования без реальных данных
              </p>
            </button>
            <button
              onClick={() => setUseSandbox(false)}
              className={`p-4 rounded-lg border-2 transition-all ${
                !useSandbox
                  ? 'border-emerald-400 bg-emerald-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon name="Zap" className={`h-5 w-5 ${!useSandbox ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className={`font-semibold ${!useSandbox ? 'text-emerald-900' : 'text-slate-700'}`}>
                  Production
                </span>
              </div>
              <p className="text-xs text-slate-600 text-left">
                Работа с реальными кампаниями
              </p>
            </button>
          </div>
        )}

        {!useSandbox && (
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Icon name="Info" className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-blue-900 mb-2">Для работы с реальными кампаниями нужен токен с правами:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800 ml-2">
                  <li>Просмотр кампаний и групп объявлений</li>
                  <li>Редактирование кампаний (для отключения площадок)</li>
                  <li>Доступ к статистике (Reports API)</li>
                  <li>Доступ к целям Метрики (если используются)</li>
                </ul>
                <button
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="mt-3 text-blue-700 hover:text-blue-900 font-medium text-sm flex items-center gap-1"
                >
                  <Icon name={showInstructions ? "ChevronUp" : "ChevronDown"} className="h-4 w-4" />
                  {showInstructions ? 'Скрыть инструкцию' : 'Как получить токен →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showInstructions && !useSandbox && (
          <div className="bg-white border-2 border-blue-200 rounded-lg p-4 space-y-3 text-sm">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Icon name="BookOpen" className="h-4 w-4 text-blue-600" />
              Инструкция по получению токена
            </h4>
            
            <div className="space-y-2">
              <p className="font-semibold text-slate-800">1. Создайте приложение в Яндекс.OAuth</p>
              <p className="text-slate-600 ml-4">
                Перейдите на <a href="https://oauth.yandex.ru" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">oauth.yandex.ru</a> и создайте новое приложение
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-slate-800">2. Укажите права доступа</p>
              <div className="ml-4 bg-slate-50 p-3 rounded border text-xs font-mono">
                <p>✓ direct:api (Яндекс.Директ API)</p>
                <p>✓ metrika:read (Яндекс.Метрика - чтение)</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-slate-800">3. Получите токен</p>
              <p className="text-slate-600 ml-4">
                После авторизации скопируйте токен доступа и вставьте его ниже
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-slate-800">4. Для агентских аккаунтов</p>
              <p className="text-slate-600 ml-4">
                Если у вас агентский токен — укажите логин клиента в формате <code className="bg-slate-100 px-1 rounded">login-name</code>
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded p-3 mt-3">
              <p className="text-xs text-amber-800">
                <Icon name="AlertTriangle" className="h-3.5 w-3.5 inline mr-1" />
                <strong>Важно:</strong> Токен даёт полный доступ к аккаунту. Храните его в безопасности!
              </p>
            </div>
          </div>
        )}

        {!showCodeInput ? (
          <div className="space-y-3">
            <Button onClick={onConnect} className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg">
              <Icon name="Lock" className="h-5 w-5 mr-2" />
              Авторизоваться через OAuth
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gradient-to-br from-blue-50 to-indigo-50 px-2 text-slate-500">или</span>
              </div>
            </div>
            
            <Button onClick={onToggleCodeInput} variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-100">
              <Icon name="Terminal" className="h-5 w-5 mr-2" />
              У меня уже есть токен
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Icon name="Info" className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Если автоматическое окно не сработало:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Скопируйте код с страницы Яндекса</li>
                    <li>Вставьте его в поле ниже</li>
                    <li>Нажмите "Подключиться"</li>
                  </ol>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Токен доступа
                </label>
                <Input
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="y0_AgA..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Скопируйте токен из адресной строки после #access_token=
                </p>
              </div>
              
              {!useSandbox && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Логин клиента <span className="text-slate-400 font-normal">(для агентских аккаунтов)</span>
                  </label>
                  <Input
                    value={clientLogin}
                    onChange={(e) => setClientLogin(e.target.value)}
                    placeholder="client-login"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Оставьте пустым, если используете прямой доступ
                  </p>
                </div>
              )}
              
              <Button 
                onClick={onSubmitCode} 
                disabled={!authCode.trim()} 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                size="lg"
              >
                <Icon name="Check" className="h-5 w-5 mr-2" />
                Подключиться
              </Button>
            </div>
            <Button onClick={onToggleCodeInput} variant="ghost" size="sm" className="w-full">
              <Icon name="ArrowLeft" className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}