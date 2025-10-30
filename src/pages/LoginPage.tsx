import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

const API_URL = 'https://functions.poehali.dev/06df3397-13af-46f0-946a-f5d38aa6f60f';

export default function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [sentCode, setSentCode] = useState('');

  const handleSendCode = async () => {
    if (!phone.trim()) {
      toast.error('Введите номер телефона');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?endpoint=auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_code', phone })
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        setSentCode(data.code);
        setStep('code');
        toast.success(`Код отправлен! (Для теста: ${data.code})`);
      } else {
        toast.error(data.error || 'Ошибка отправки кода');
      }
    } catch (error) {
      toast.error('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      toast.error('Введите код');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?endpoint=auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_code', phone, code })
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        localStorage.setItem('userId', data.userId.toString());
        localStorage.setItem('userPhone', data.phone);
        toast.success('Вход выполнен!');
        navigate('/clustering');
      } else {
        toast.error(data.error || 'Неверный код');
      }
    } catch (error) {
      toast.error('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center">
              <Icon name="Sparkles" size={32} className="text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Вход в систему</CardTitle>
          <CardDescription>
            {step === 'phone' 
              ? 'Введите номер телефона для получения кода'
              : 'Введите код из SMS'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'phone' ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Номер телефона</label>
                <Input
                  type="tel"
                  placeholder="+7 999 123-45-67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
                />
              </div>
              <Button 
                onClick={handleSendCode} 
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? 'Отправка...' : 'Получить код'}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Код из SMS</label>
                <Input
                  type="text"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                />
              </div>
              <Button 
                onClick={handleVerifyCode} 
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? 'Проверка...' : 'Войти'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep('phone')}
                className="w-full"
              >
                Изменить номер
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
