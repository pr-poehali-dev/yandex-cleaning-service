import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/contexts/AuthContext';

type AuthStep = 'phone' | 'code';

export default function Auth() {
  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    
    let result = '+7';
    if (digits.length > 1) {
      result += ` (${digits.slice(1, 4)}`;
      if (digits.length >= 4) {
        result += `) ${digits.slice(4, 7)}`;
      }
      if (digits.length >= 7) {
        result += `-${digits.slice(7, 9)}`;
      }
      if (digits.length >= 9) {
        result += `-${digits.slice(9, 11)}`;
      }
    }
    return result;
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
    try {
      await login(phone);
      toast({ title: '✅ Добро пожаловать!', description: 'Вход выполнен успешно' });
      navigate('/');
    } catch (error) {
      toast({ title: 'Ошибка входа', description: 'Попробуйте снова', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setCode('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl mb-4">
            <Icon name="Zap" size={28} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-2">
            DirectKit
          </h1>
          <p className="text-muted-foreground">
            Сервис сбора семантического ядра
          </p>
        </div>

        <Card className="shadow-lg border-0">
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
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
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
                  <a href="#" className="text-emerald-600 hover:underline font-medium">
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
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
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
                  className="w-full text-emerald-600 hover:text-emerald-700"
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