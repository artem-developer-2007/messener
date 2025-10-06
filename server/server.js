const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const { testConnection } = require('./database'); // Импортируем проверку подключения

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// MIDDLEWARE
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

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

app.use(authRoutes);

// Остальной код без изменений...
app.use('/api/protected', (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Требуется аутентификация'
    });
  }
  next();
});

app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err);
  res.status(500).json({
    message: 'Ошибка сервера'
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Страница не найдена' });
});

// Запускаем сервер только после инициализации БД
app.listen(PORT, async () => {
  await initializeDatabase();
  console.log(`Сервер стартовал на порту: ${PORT}`);
});