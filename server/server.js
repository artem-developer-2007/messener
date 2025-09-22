const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');

// Можно брать даннеы из .env
dotenv.config();

// Запуск сервера, порт
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Куда можно отправлять данные
  credentials: true // Можно отправлять данные
}));
app.use(express.json()); // Можно использовать JSON

app.use(authRoutes); // Отправка письма на почту

// Middleware для проверки аутентификации
app.use('/api/protected', (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Требуется аутентификация' 
    });
  }
  
  // Здесь можно добавить проверку JWT токена
  next();
});

// Обработка ошибок, next никуда дальше не идет, но пусть будет
app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err);
  res.status(500).json({ 
    message: 'Оибка сервера' 
  });
});

// Обработка 404 страницы
app.use((req, res) => {
  res.status(404).json({ message: 'Страница не найдена' });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер стартовал на порту: ${PORT}`);
  console.log(`Email сервис: ${process.env.SMTP_HOST}`);
});