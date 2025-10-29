import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import { useNavigate } from 'react-router-dom';

type AuthStep = 'phone' | 'code';

export default function Auth() {
  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length <= 1) return `+7 (${digits}`;
    if (digits.length <= 4) return `+7 (${digits.slice(1, 4)}`;
    if (digits.length <= 7) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}`;
    if (digits.length <= 9) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}`;
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  };

  const handlePhoneSubmit = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 11) {
      toast({ title: 'Введите корректный номер телефона', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('code');
      toast({ 
        title: '📱 Код отправлен', 
        description: 'Проверьте SMS на номере ' + phone 
      });
    }, 1000);
  };

  const handleCodeSubmit = async () => {
    if (code.length !== 4) {
      toast({ title: 'Введите 4-значный код', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      localStorage.setItem('directkit_auth', 'true');
      localStorage.setItem('directkit_phone', phone);
      toast({ title: '✅ Добро пожаловать!', description: 'Вход выполнен успешно' });
      navigate('/projects');
    }, 1000);
  };

  const handleBack = () => {
    setStep('phone');
    setCode('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-black rounded-2xl mb-4">
            <Icon name="Zap" size={28} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            DirectKit
          </h1>
          <p className="text-muted-foreground">
            Сервис сбора семантического ядра
          </p>
        </div>

        <Card className="shadow-sm border">
          <CardHeader>
            <CardTitle className="text-2xl">
              {step === 'phone' ? 'Вход в систему' : 'Подтверждение'}
            </CardTitle>
            <CardDescription>
              {step === 'phone' 
                ? 'Введите номер телефона для входа' 
                : `Код отправлен на ${phone}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 'phone' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">Номер телефона</Label>
                  <div className="relative">
                    <Icon name="Phone" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+7 (___) ___-__-__"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      onKeyDown={(e) => e.key === 'Enter' && handlePhoneSubmit()}
                      className="pl-10 text-lg"
                      maxLength={18}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handlePhoneSubmit} 
                  disabled={loading}
                  className="w-full bg-black hover:bg-slate-800 text-white"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                      Отправка кода...
                    </>
                  ) : (
                    <>
                      Получить код
                      <Icon name="ArrowRight" size={20} className="ml-2" />
                    </>
                  )}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Нажимая кнопку, вы соглашаетесь с{' '}
                  <a href="#" className="text-slate-900 hover:underline font-medium">
                    условиями использования
                  </a>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="code">Код из SMS</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="• • • •"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
                    className="text-center text-2xl tracking-widest font-mono"
                    maxLength={4}
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={handleBack} 
                    variant="outline" 
                    className="flex-1"
                  >
                    <Icon name="ArrowLeft" size={20} className="mr-2" />
                    Назад
                  </Button>
                  <Button 
                    onClick={handleCodeSubmit} 
                    disabled={loading}
                    className="flex-1 bg-black hover:bg-slate-800 text-white"
                  >
                    {loading ? (
                      <>
                        <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                        Вход...
                      </>
                    ) : (
                      <>
                        Войти
                        <Icon name="Check" size={20} className="ml-2" />
                      </>
                    )}
                  </Button>
                </div>

                <Button 
                  onClick={() => toast({ title: 'Код отправлен повторно' })}
                  variant="ghost" 
                  className="w-full text-slate-600 hover:text-slate-900"
                >
                  <Icon name="RotateCcw" size={16} className="mr-2" />
                  Отправить код повторно
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>© 2024 DirectKit. Все права защищены.</p>
        </div>
      </div>
    </div>
  );
}