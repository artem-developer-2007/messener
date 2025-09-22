import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Messenger() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedEmail = localStorage.getItem('userEmail');

    if (!token) {
      navigate('/login');
      return;
    }

    // Проверяем валидность токена и получаем данные пользователя
    axios.get('http://localhost:5000/verify-token', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(response => {
      if (response.data.success) {
        setUserId(response.data.user.userId);
        setUserEmail(storedEmail || response.data.user.email);
        setIsLoading(false);
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        navigate('/login');
      }
    })
    .catch(error => {
      console.error('Ошибка проверки токена:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('userEmail');
      navigate('/login');
    });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-900">
        <div className="text-white">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-neutral-900 text-white">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Мессенджер</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Выйти
          </button>
        </div>
        
        <div className="bg-neutral-800 p-6 rounded-lg">
          <h2 className="text-xl mb-4">Добро пожаловать!</h2>
          <p>Email: {userEmail}</p>
          <p>ID пользователя: {userId}</p>
        </div>
      </div>
    </div>
  );
}

export default Messenger;