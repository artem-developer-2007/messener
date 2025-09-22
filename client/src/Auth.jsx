import './App.css';
import picture from './img/robot.png';
import axios from 'axios';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function Auth() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [secondScreenMessage, setSecondScreenMessage] = useState(''); // Отдельное сообщение для второго экрана
  const [isLoading, setIsLoading] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('first');
  const [storedEmail, setStoredEmail] = useState('');
  const navigate = useNavigate();

  // РЕФЫ ДЛЯ ИНПУТОВ КОДА
  const inputRef1 = useRef(null);
  const inputRef2 = useRef(null);
  const inputRef3 = useRef(null);
  const inputRef4 = useRef(null);
  const inputRef5 = useRef(null);
  const inputRef6 = useRef(null);

  const [code1, setCode1] = useState('');
  const [code2, setCode2] = useState('');
  const [code3, setCode3] = useState('');
  const [code4, setCode4] = useState('');
  const [code5, setCode5] = useState('');
  const [code6, setCode6] = useState('');

  // ЕСЛИ ПЕРВЙ ЭКРАН ИСТИННЫЙ - ПЕРЕКЛЮЧИТЬ НА ВТОРОЙ, ЕСЛИ ЛОЖНЫЙ - НА ПЕРВЫЙ
  const toggleScreen = () => {
    setCurrentScreen(currentScreen === 'first' ? 'second' : 'first');
  };

  // ПРОВЕРКА ВАЛИДНОСТИ EMAIL-А
  const handleSubmit = async () => {
    if (!email || !email.includes('@')) {
      setMessage('Пожалуйста, введите корректный email');
      return;
    }

    // КОЛЕСИКО
    setIsLoading(true);
    setMessage(''); // Очищаем предыдущие сообщения

    // ОТПРАВКА ДАННЫХ НА СЕРВЕР
    try {
      const response = await axios.post('http://localhost:5000/email', {
        email: email
      });

      // СООБЩЕНИЕ
      setMessage(response.data.message || 'Email успешно отправлен!');
      
      // СОХРАНЯЕМ EMAIL ДЛЯ ВТОРОГО ЭКРАНА
      setStoredEmail(email);
      
      // ОТЧИСТКА EMAIL ПОСЛЕ ЕГО ОТПРАВКИ
      setEmail('');
      
      // ПЕРЕКЛЮЧЕНИЕ НА ВТОРОЙ ЭКРАН, ПОСЛЕ УСПЕШНОЙ ОТПРАВКИ, 500 МС ЗАДЕРЖКА
      setTimeout(() => {
        toggleScreen();
      }, 500);

      // ОБРАБОТКА ОШИБОК
    } catch (error) {
      console.error('Ошибка отправки:', error);
      
      if (error.response) {
        setMessage(error.response.data.message || 'Ошибка сервера');
      } else if (error.request) {
        setMessage('Нет ответа от сервера. Проверьте подключение.');
      } else {
        setMessage('Произошла ошибка при отправке');
      }
      
      // ОСТАНОВИТЬ КОЛЕСИКО
    } finally {
      setIsLoading(false);
    }
  };

  // ПРОВЕРКА КОДА И АУТЕНТИФИКАЦИЯ
  const handleVerifyCode = async () => {
    const code = code1 + code2 + code3 + code4 + code5 + code6;
    
    if (code.length !== 6) {
      setSecondScreenMessage('Пожалуйста, введите полный код');
      return;
    }

    // ПРОВЕРЯЕМ ЧТО EMAIL СОХРАНЕН
    if (!storedEmail) {
      setSecondScreenMessage('Ошибка: email не найден. Вернитесь назад и введите email снова.');
      return;
    }

    setIsLoading(true);
    setSecondScreenMessage(''); // Очищаем предыдущие сообщения

    try {
      const response = await axios.post('http://localhost:5000/verify-code', {
        email: storedEmail,
        code: code
      });

      if (response.data.success) {
        // Сохраняем токен в localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userEmail', storedEmail);
        
        setSecondScreenMessage('Успешная аутентификация!');
        
        // Перенаправляем на страницу мессенджера
        setTimeout(() => {
          navigate('/messenger');
        }, 1000);
      } else {
        setSecondScreenMessage(response.data.message);
      }
    } catch (error) {
      console.error('Ошибка проверки кода:', error);
      
      if (error.response) {
        setSecondScreenMessage(error.response.data.message || 'Ошибка сервера');
      } else {
        setSecondScreenMessage('Произошла ошибка при проверке кода');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ЕСЛИ ПОЛЬЗОВАТЕЛЬ НАЖАЛ ENTER - ОТПРАВИТЬ EMAIL НА СЕРВЕР
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (currentScreen === 'first') {
        handleSubmit();
      } else {
        handleVerifyCode();
      }
    }
  };

  //
  const handleDragStart = (e) => {
    e.preventDefault();
  };

  //
  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  //
  const handleChange = (e, currentRef, nextRef) => {
    const value = e.target.value;

    // ЕСЛИ ТЕКУЩИЙ ИНПУТ АКТИВЕН - МЕНЯ ЕГО ЗНАЧЕНИ
    if (currentRef === inputRef1) setCode1(value);
    if (currentRef === inputRef2) setCode2(value);
    if (currentRef === inputRef3) setCode3(value);
    if (currentRef === inputRef4) setCode4(value);
    if (currentRef === inputRef5) setCode5(value);
    if (currentRef === inputRef6) setCode6(value);

    // ПЕРЕХОД НА СЛЕДУЮЩИЙ ИНПУТ(ЕСЛИ ОН СУЩЕСТВУЕТ)
    if (value && nextRef && nextRef.current) {
      nextRef.current.focus();
    }
  };

  // АВТОФОКУС НА ПЕРВЫЙ ИНПУТ, ПРИ ПЕРЕХОДЕ НА ВТОРОЙ ЭКРАН
  useEffect(() => {
    if (currentScreen === 'second' && inputRef1.current) {
      const timer = setTimeout(() => {
        inputRef1.current.focus();
      }, 250); // Задержка после анимации перехода

      return () => clearTimeout(timer);
    }
  }, [currentScreen]);
  
  return (
    <>
      {/* ОБЩИЙ КОНТЕЙНЕР */}
      <div className="relative h-screen overflow-hidden bg-neutral-900">
        
        {/* ПЕРВЫЙ ЭКРАН - уезжает вверх */}
        <div className={`absolute inset-0 transition-transform duration-500 ease-in-out ${
          currentScreen === 'first' 
            ? 'translate-y-0' 
            : '-translate-y-full'
        }`}>
          
          <div className="flex flex-col items-center justify-center pt-32">
            <img 
              src={picture} 
              width={230} 
              className='flex justify-center' 
              alt="Robot" 
              draggable="false"
              onDragStart={handleDragStart}
              onContextMenu={handleContextMenu}
            />
          </div>
          
          <div className="p-6 w-full flex justify-center">
            <div className="space-y-6 w-full max-w-sm">
              
              <div className="space-y-2">
                <label htmlFor="email" className="block text-xs font-medium text-white">
                  Адрес электронной почты
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="example@mail.com"
                    disabled={isLoading}
                    autoComplete="off"
                    className="block w-full pl-10 pr-3 py-4 text-white rounded-lg bg-neutral-800 focus:outline-none
                    px-4 border border-gray-700 outline-none transition-all duration-500
                    focus:shadow-[0_0_10px_4px_rgba(59,130,246,0.5)] focus:shadow-blue-500/50 placeholder-gray-500"
                  />
                </div>
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium border-none
                  text-white bg-gradient-to-r from-blue-600 to-blue-400 hover:cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Отправка...
                  </div>
                ) : (
                  'ПРОДОЛЖИТЬ'
                )}
              </button>

              {message && (
                <div className={`p-3 rounded-lg text-sm ${
                  message.includes('успешно') || message.includes('Код отправлен') 
                    ? 'bg-green-500/20 text-green-300' 
                    : 'bg-red-500/20 text-red-300'
                }`}>
                  {message}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ВТОРОЙ ЭКРАН - появляется снизу */}
        <div className={`absolute inset-0 transition-transform duration-500 ease-in-out ${
          currentScreen === 'second' 
            ? 'translate-y-0' 
            : 'translate-y-full'
        }`}>
          
          <div className="h-full bg-neutral-900 flex flex-col items-center justify-center">
            
            {/* Кнопка назад */}
            <button 
              onClick={() => {
                // ПРИ ВОЗВРАТЕ ОЧИЩАЕМ КОД И СОХРАНЕННЫЙ EMAIL
                setStoredEmail('');
                setCode1(''); setCode2(''); setCode3(''); 
                setCode4(''); setCode5(''); setCode6('');
                setSecondScreenMessage(''); // Очищаем сообщение второго экрана
                toggleScreen();
              }}
              className="absolute top-6 left-6 flex items-center text-blue-400 hover:text-blue-300 transition-colors"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Назад
            </button>

            <div className="text-center mb-8">
              <p className="text-white text-xl">Введите код из письма</p>
              <p className="text-gray-400 text-sm mt-2">Отправлено на: {storedEmail}</p>
            </div>

            <div className="flex flex-row items-center justify-center gap-3">
              {[inputRef1, inputRef2, inputRef3, inputRef4, inputRef5, inputRef6].map((ref, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={1}
                  value={[code1, code2, code3, code4, code5, code6][index]}
                  ref={ref}
                  onChange={(e) => handleChange(
                    e, 
                    ref, 
                    index < 5 ? [inputRef2, inputRef3, inputRef4, inputRef5, inputRef6, null][index] : null
                  )}
                  onKeyPress={handleKeyPress}
                  className="w-16 h-16 border text-white border-gray-600 rounded-lg text-center text-2xl 
                           bg-neutral-800 focus:outline-none focus:border-blue-500 transition-colors"
                />
              ))}
            </div>

            <button 
              onClick={handleVerifyCode}
              disabled={isLoading}
              className="mt-10 w-64 py-3 px-4 rounded-lg shadow-sm text-sm font-medium
                text-white bg-gradient-to-r from-blue-600 to-blue-400 hover:cursor-pointer
                transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'ПРОВЕРКА...' : 'ПОДТВЕРДИТЬ'}
            </button>

            {/* СООБЩЕНИЕ ТОЛЬКО ДЛЯ ВТОРОГО ЭКРАНА - ПОЯВЛЯЕТСЯ ТОЛЬКО ПРИ ОШИБКАХ */}
            {secondScreenMessage && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${
                secondScreenMessage.includes('успешно') 
                  ? 'bg-green-500/20 text-green-300' 
                  : 'bg-red-500/20 text-red-300'
              }`}>
                {secondScreenMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Auth;