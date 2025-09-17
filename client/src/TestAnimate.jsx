import { useState } from 'react';

function FlipAnimation() {
  // Состояние для отслеживания, какой экран активен
  const [currentScreen, setCurrentScreen] = useState('first');

  // Функция для переключения между экранами
  const toggleScreen = () => {
    setCurrentScreen(currentScreen === 'first' ? 'second' : 'first');
  };

  return (
    <div className="relative h-screen overflow-hidden bg-gray-900">
      
      {/* ПЕРВЫЙ ЭКРАН - уезжает вверх при переключении */}
      <div 
        className={`absolute inset-0 transition-transform duration-500 ease-in-out ${
          currentScreen === 'first' 
            ? 'translate-y-0' // На своем месте, когда активен
            : '-translate-y-full' // Уезжает вверх, когда не активен
        }`}
      >
        <div className="h-full flex items-center justify-center bg-blue-600">
          <div className="text-white text-center">
            <h1 className="text-4xl mb-8">Экран 1</h1>
            <p className="text-xl mb-12">Привет! Это первый экран</p>
            <button 
              onClick={toggleScreen}
              className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors"
            >
              Перейти к экрану 2 ↓
            </button>
          </div>
        </div>
      </div>

      {/* ВТОРОЙ ЭКРАН - появляется сверху при переключении */}
      <div 
        className={`absolute inset-0 transition-transform duration-500 ease-in-out ${
          currentScreen === 'second' 
            ? 'translate-y-0' // На своем месте, когда активен
            : 'translate-y-full' // Уезжает вниз, когда не активен
        }`}
      >
        <div className="h-full flex items-center justify-center bg-green-600">
          <div className="text-white text-center">
            <h1 className="text-4xl mb-8">Экран 2</h1>
            <p className="text-xl mb-12">Это второй экран!</p>
            <button 
              onClick={toggleScreen}
              className="bg-white text-green-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors"
            >
              Вернуться к экрану 1 ↑
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

export default FlipAnimation;


/*

<button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  type="button"
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

*/