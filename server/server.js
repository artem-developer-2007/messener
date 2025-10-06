const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const { testConnection } = require('./database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// MIDDLEWARE
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// ЛОГИРОВАНИЕ ВСЕХ ЗАПРОСОВ
app.use((req, res, next) => {
  console.log(`📨 ${new Date().toISOString()} ${req.method} ${req.url}`);
  console.log('📦 Body:', req.body);
  next();
});

// Проверяем подключение к БД при старте сервера
const initializeDatabase = async () => {
  console.log('Проверка подключения к PostgreSQL...');
  const isConnected = await testConnection();
  if (isConnected) {
    console.log('База данных успешно подключена');
  } else {
    console.log('Проблемы с подключением к базе данных');
  }
};

// ПОДКЛЮЧАЕМ РОУТЫ
app.use('/api/auth', authRoutes);

// ТЕСТОВЫЙ ЭНДПОИНТ ДЛЯ ПРОВЕРКИ
app.get('/api/test', (req, res) => {
  res.json({ message: 'Сервер работает!' });
});

// ПРОСТОЙ ЭНДПОИНТ ДЛЯ ТЕСТИРОВАНИЯ EMAIL
app.post('/api/auth/simple-email', (req, res) => {
  console.log('✅ Простой эндпоинт вызван! Email:', req.body.email);
  res.json({ 
    success: true, 
    message: 'Тестовый ответ от сервера!',
    code: '123456'
  });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('❌ Ошибка сервера:', err);
  res.status(500).json({
    message: 'Ошибка сервера'
  });
});

// Обработка несуществующих маршрутов
app.use((req, res) => {
  console.log(`❌ Маршрут не найден: ${req.method} ${req.url}`);
  res.status(404).json({ message: 'Страница не найдена' });
});

// Запускаем сервер
app.listen(PORT, async () => {
  await initializeDatabase();
  console.log(`✅ Сервер стартовал на порту: ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log('📧 Доступные эндпоинты:');
  console.log('   GET  /api/test');
  console.log('   POST /api/auth/simple-email');
  console.log('   POST /api/auth/email');
});