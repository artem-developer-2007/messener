import './App.css';
import picture from './img/robot.png';
import axios from 'axios';
import { useState, useRef } from 'react';

function Auth() {
  // Имейл сообщение картинка загрузки
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Обработчик отправки формы
  const handleSubmit = async () => {

    // Валидация email, на server тоже есть
    if (!email || !email.includes('@')) {
      setMessage('Пожалуйста, введите корректный emaieeeeeel');
      return;
    }

    setIsLoading(true); // Появляется отправка и колесико

    try {
      // Отправляем JSON-ом email на сервер
      const response = await axios.post('http://localhost:5000/api/auth/email', {
        email: email
      });

      toggleScreen(); // Если имейл валидный и сервер ответил и нет других ошибок, то экран с имейлом перелистуется на экран с кодом

      setMessage(response.data.message || 'Email успешно отправлен!'); 
      
      // Очитска имейла, но она не так уж нужна т к экран перелистуется ну пофиг
      setEmail('');

    } catch (error) {
      console.error('Ошибка отправки:', error); // Вывод ошибки в консоль
      
      // Обработка разных типов ошибок
      if (error.response) {
        // Сервер ответил с ошибкой
        setMessage(error.response.data.message || 'Ошибка сервера');
      } else if (error.request) {
        // Запрос был сделан, но ответа нет
        setMessage('Нет ответа от сервера. Проверьте подключение.');
      } else {
        // Другие ошибки
        setMessage('Произошла ошибка при отправке');
      }
    } finally {
      setIsLoading(false); // Выключить колесико загрузки
    }
  };

  // Обработчик нажатия Enter в поле email
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  // Функция, с помощью которой нельзя перетащить изображение(робота)
  const handleDragStart = (e) => {
    e.preventDefault();
  };

  // Функция, с помощью которой нельзя правой кнопкой перетащить изображение(робота)
  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  // Состояние для отслеживания, какой экран активен
  const [currentScreen, setCurrentScreen] = useState('first');

  // Функция для переключения между экранами
  const toggleScreen = () => {
    setCurrentScreen(currentScreen === 'first' ? 'second' : 'first');
  };

    // ЭКРАН 2(С КОДОМ) ЛОГИКА
    // Рефы для каждого инпута(инициализация)
    const inputRef1 = useRef(null);
    const inputRef2 = useRef(null);
    const inputRef3 = useRef(null);
    const inputRef4 = useRef(null);
    const inputRef5 = useRef(null);
    const inputRef6 = useRef(null);
  
    // Состояния для значений инпутов (если они нужны вам для других целей)
    const [code1, setCode1] = useState('');
    const [code2, setCode2] = useState('');
    const [code3, setCode3] = useState('');
    const [code4, setCode4] = useState('');
    const [code5, setCode5] = useState('');
    const [code6, setCode6] = useState('');
  
    // Обработчик, который будет переключать курсор на следующий input
    const handleChange = (e, currentRef, nextRef) => {
      const value = e.target.value;
  
      // Обновление осстояния текущего input
      // Здесь это условно, вам нужно понять, какому состоянию соответствует какой инпут
      if (currentRef === inputRef1) setCode1(value);
      if (currentRef === inputRef2) setCode2(value);
      if (currentRef === inputRef3) setCode3(value);
      if (currentRef === inputRef4) setCode4(value);
      if (currentRef === inputRef5) setCode5(value);
      if (currentRef === inputRef6) setCode6(value);
  
      // Если пользователь что-то ввел и следующий реф существует, то переключаем фокус на следующий инпут
      if (value && nextRef && nextRef.current) {
        nextRef.current.focus();
      }
    };


    // Анимация

    
  return (
    <>
        {/* 1 ЭКРАН */}  
        <div className={`bg-neutral-900 absolute inset-0 transition-transform duration-500 ease-in-out h-screen ${ 
          currentScreen === 'first' 
            ? 'translate-y-0' // На своем месте, когда активен
            : '-translate-y-full' // Уезжает вверх, когда не активен
        }`}>       
          {/* DIV С РОБОТОМ */}                                                                                                                                                                                                                   
          <div className="flex flex-col items-center justify-center pt-32">
            {/* КАРТИНКА С РОБОТОМ */}
            <img src={picture} width={230} className='flex justify-center' alt="Robot" draggable="false"
              onDragStart={handleDragStart}
              onContextMenu={handleContextMenu}
              />
          </div>
            {/* DIV С ФОРМОЙ */}
            <div className="p-6 w-full flex justify-center">
              <div className="space-y-6 w-full max-w-sm">
                
                {/* ПОЛЕ ДЛЯ ВВОДА EMAIL */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-xs font-medium text-white">
                    Адрес электронной почты
                  </label>
                  <div className="relative">
                    {/* ИКОНКА С EMAIL */}
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
                      autocomplete="off"
                      className="block w-full pl-10 pr-3 py-4 text-white rounded-lg bg-neutral-800 focus:outline-none
                      px-4
                      border-1
                      border-gray-700
                      outline-none
                      transition-all
                      duration-500
                      focus:shadow-[0_0_10px_4px_rgba(59,130,246,0.5)]
                      focus:shadow-blue-500/50
                      placeholder-gray-500"
                    />
                  </div>
                </div>
                
                {/* КНОПКА ОТПРАВКИ */}
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  type="button"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium border-none
                  text-white bg-gradient-to-r from-blue-600 to-blue-400 hover:cursor-pointer"
                >
                  {/* ЕСЛИ isLoading ИСТИНА, ТО ИКОНКА ЗАГРУЗКИ И НАДПИСЬ ОТПАРВКА..., ЕСЛИ НЕТ - НАДПИСЬ ПРОДОЛЖИТЬ */}
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

                {/* СООБЩЕНИЕ О СТАТУСЕ */}
                {message && (
                  <div className={`p-3 rounded-lg text-sm ${
                    message.includes('Код отправлен на вашу почту') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                  }`}>
                    {message}
                  </div>
                )}
              </div>
            </div>
          </div>

        <div 
        className={`absolute inset-0 transition-transform duration-500 ease-in-out ${
          currentScreen === 'second' 
            ? 'translate-y-0' // На своем месте, когда активен
            : 'translate-y-full' // Уезжает вниз, когда не активен
        }`}
      >
        <div className="h-full flex items-center justify-center bg-neutral-900">
          <div className="text-white text-center">
            <div className='flex flex-col items-center justify-center pt-72'>
            <p className='text-amber-50 flex justify-center items-center'>HELLO hello 123</p>
          </div>
          <div className='bg-neutral-900 flex flex-row items-center justify-center gap-5 pt-20
          '>
                
                <input
                type="text"
                maxLength={1}
                value={code1}
                ref={inputRef1}
                onChange={(e) => handleChange(e, inputRef1, inputRef2)}
                className="w-20 h-20 border text-white border-gray-300 rounded-lg text-center text-3xl"
                />
                <input
                type="text"
                maxLength={1}
                value={code2}
                ref={inputRef2}
                onChange={(e) => handleChange(e, inputRef2, inputRef3)}
                className="w-20 h-20 border text-white border-gray-300 rounded-lg text-center text-3xl"
                />
                <input
                type="text"
                maxLength={1}
                value={code3}
                ref={inputRef3}
                onChange={(e) => handleChange(e, inputRef3, inputRef4)}
                className="w-20 h-20 border text-white border-gray-300 rounded-lg text-center text-3xl"
                />
                <input
                type="text"
                maxLength={1}
                value={code4}
                ref={inputRef4}
                onChange={(e) => handleChange(e, inputRef4, inputRef5)}
                className="w-20 h-20 border text-white border-gray-300 rounded-lg text-center text-3xl"
                />
                <input
                type="text"
                maxLength={1}
                value={code5}
                ref={inputRef5}
                onChange={(e) => handleChange(e, inputRef5, inputRef6)}
                className="w-20 h-20 border text-white border-gray-300 rounded-lg text-center text-3xl"
                />
                <input
                type="text"
                maxLength={1}
                value={code6}
                ref={inputRef6}
                onChange={(e) => handleChange(e, inputRef6)}
                className="w-20 h-20 border text-white border-gray-300 rounded-lg text-center text-3xl"
                />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Auth;


/*


import
useState
Функция - обработчик формы
Проверка валиден ли email и если нет - выход из функции
Если валиден:
текст 'Подождите' и кружок загрузки
отправка запроса
Если отправился нормально:
очищаем поле email после успешной отправки
текст: имеил успешно отправлен
обработка ошибок(если отправился ненормально)
обработчик enter
*/
