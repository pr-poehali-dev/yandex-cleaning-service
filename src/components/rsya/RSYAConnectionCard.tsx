import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';

interface RSYAConnectionCardProps {
  isConnected: boolean;
  showCodeInput: boolean;
  authCode: string;
  setAuthCode: (value: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleCodeInput: () => void;
  onSubmitCode: () => void;
}

export default function RSYAConnectionCard({
  isConnected,
  showCodeInput,
  authCode,
  setAuthCode,
  onConnect,
  onDisconnect,
  onToggleCodeInput,
  onSubmitCode
}: RSYAConnectionCardProps) {
  if (isConnected) {
    return (
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-900">
            <Icon name="CheckCircle2" className="h-5 w-5 text-emerald-600" />
            Подключено к Яндекс.Директ
          </CardTitle>
          <CardDescription className="text-emerald-700">
            Можно работать с кампаниями
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onDisconnect} variant="outline" size="sm">
            <Icon name="LogOut" className="h-4 w-4 mr-2" />
            Отключить
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Icon name="Link" className="h-5 w-5 text-blue-600" />
          Подключение к Яндекс.Директ
        </CardTitle>
        <CardDescription className="text-blue-700">
          Для работы с площадками необходимо авторизоваться
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showCodeInput ? (
          <div className="flex gap-2">
            <Button onClick={onConnect} className="bg-blue-600 hover:bg-blue-700">
              <Icon name="Key" className="h-4 w-4 mr-2" />
              Авторизоваться через OAuth
            </Button>
            <Button onClick={onToggleCodeInput} variant="outline">
              У меня есть код
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder="Вставьте код авторизации"
                className="font-mono"
              />
              <Button onClick={onSubmitCode} disabled={!authCode.trim()}>
                <Icon name="Check" className="h-4 w-4 mr-2" />
                Применить
              </Button>
            </div>
            <Button onClick={onToggleCodeInput} variant="ghost" size="sm">
              <Icon name="ArrowLeft" className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
