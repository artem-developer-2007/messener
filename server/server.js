const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');

// МОЖНО БРАТЬ ДАННЫЕ ИЗ .ENV
dotenv.config();

// ЗАПУСК СЕРВЕРА, ПОРТ
const app = express();
const PORT = process.env.PORT || 5000;

// MIDDLEWARE ДЛЯ ДАННЫХ
app.use(cors({
  origin: 'http://localhost:5173', // КУДА ОТПРАВЛЯТЬ ДАННЫЕ
  credentials: true // МОЖНО ЛИ ОТПРАВЛЯТЬ ДАННЫЕ(ДА)
}));
app.use(express.json()); // МОЖНО ИСПОЛЬЗОВАТЬ JSON

app.use(authRoutes); // ОТПРАВКА ПИСЬМА НА ПОЧТУ

// MIDDLEWARE ДЛЯ ПРОВЕРКИ АУТЕНТИФИКАЦИИ
app.use('/api/protected', (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  // ЕСЛИ НЕТУ ТОКЕНА
  if (!token) {
    return res.status(401).json({ 
      success: false, //
      message: 'Требуется аутентификация' //
    });
  }
  
  // ЗДЕСЬ МОЖНО ДОБАВИТЬ ПРОВЕРКУ JWT-ТОКЕНА
  next();
});

// ОБРАБОТКА ОШИБОК, NEXT() НИКУДА НЕ ИДЕТ, НО ПУСТЬ БУДЕТ
app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err);
  res.status(500).json({
    message: 'Оибка сервера'
  });
});

// ОБРАБОТКА 404 СТРАНИЦЫ
app.use((req, res) => {
  res.status(404).json({ message: 'Страница не найдена' });
});

// ЗАПУСК СЕРВЕРА
app.listen(PORT, () => {
  console.log(`Сервер стартовал на порту: ${PORT}`);
  console.log(`Email сервис: ${process.env.SMTP_HOST}`);
});
