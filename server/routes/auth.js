const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// ХРАНИЛИЩЕ КОДОВ(ПОТОМ ИСПОЛЬЗУЮ БД)
const emailCodes = new Map();
const users = new Map(); // Временное хранилище пользователей

// СЕКРЕТНЫЙ КЛЮЧ ДЛЯ JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ГЕНЕРАЦИЯ 6-НАЧНОГО КОДА
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ГЕНЕРАЦИЯ JWT ТОКЕНА
function generateToken(email, userId) {
  return jwt.sign(
    { 
      email, 
      userId, 
      iat: Math.floor(Date.now() / 1000), // время создания
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 час
    },
    JWT_SECRET
  );
}

// СОЗДАНИЕ ТРАНСПОРТЕРА ДЛЯ EMAIL-СЕРВЕРА
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST, // ХОСТ
    port: parseInt(process.env.SMTP_PORT) || 465, // ПОРТ
    secure: true, // ИСПОЛЬЗУЕТ SSL/TLS ШИФРОВАНИЕ
    auth: {
      user: process.env.SMTP_USER, // ЛОГИН
      pass: process.env.SMTP_PASS, // ПАРОЛЬ)СГЕНЕРИРОВАННЫЙ
    },
    tls: {
      rejectUnauthorized: false //..........
    }
  });
};

// ПРОВЕРКА ВАЛИДНОСТЬ EMAIL
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // 
  return emailRegex.test(email); // 
}

// ОЧИСТКА СТАРЫХ КОДОВ
function cleanupOldCodes() {
  const now = Date.now(); // ТЕКУЩЕЕ ВРЕМЯ
  const tenMinutesAgo = now - (10 * 60 * 1000); // КОД БУДЕТ СУЩЕСТВОВАТЬ 10 МИНУТ
  
  for (let [email, data] of emailCodes.entries()) {
    if (data.createdAt < tenMinutesAgo) {
      emailCodes.delete(email);
      console.log(`Cleaned up expired code for: ${email}`);
    }
  }
}

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Токен доступа отсутствует' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false,
        message: 'Недействительный токен' 
      });
    }
    req.user = user;
    next();
  });
};

// Отправка email с кодом
router.post('/email', async (req, res) => {
  try {
    // Тело запроса
    const { email } = req.body;

    // Валидация
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email обязателен' 
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Пожалуйста, введите корректный email' 
      });
    }

    // СОЗДАЕМ ИЛИ ПОЛУЧАЕМ USERID ДЛЯ EMAIL
    let userId = users.get(email);
    if (!userId) {
      userId = uuidv4();
      users.set(email, userId);
      console.log(`Создан новый пользователь: ${email} -> ${userId}`);
    } else {
      console.log(`Найден существующий пользователь: ${email} -> ${userId}`);
    }

    // Генерация и сохранение кода
    const code = generateCode();
    emailCodes.set(email, {
      code,
      createdAt: Date.now(),
      attempts: 0,
      userId: userId // Сохраняем userId для кода
    });

    // Очистка старых кодов
    cleanupOldCodes();

    // Настройка транспортера - ИСПРАВЛЕНО!
    const transporter = createTransporter();

    // Проверяем соединение с SMTP сервером
    try {
      await transporter.verify();
      console.log('SMTP connection verified');
    } catch (verifyError) {
      console.error('❌ SMTP connection failed:', verifyError);
      return res.status(500).json({ 
        success: false,
        message: 'Ошибка подключения к почтовому серверу' 
      });
    }

    // Отправка email
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Ваш код подтверждения 🔐',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Код подтверждения</h2>
          <p>Для завершения аутентификации используйте следующий код:</p>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #4294ff; font-size: 32px; letter-spacing: 5px; margin: 0;">
              ${code}
            </h1>
          </div>
          <p style="color: #666; font-size: 14px;">
            Код действителен в течение 10 минут.<br>
            Если вы не запрашивали этот код, проигнорируйте это письмо.
          </p>
        </div>
      `
    };

    // Отправка письма ВСЕГДА (и в development, и в production)
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to: ${email}`);
    
    // Дополнительно логируем для development
    if (process.env.NODE_ENV !== 'production') {
      console.log('=== DEVELOPMENT INFO ===');
      console.log('📧 Email:', email);
      console.log('🔢 Code:', code);
      console.log('👤 User ID:', userId);
      console.log('=======================');
    }
    
  } catch (sendError) {
    console.error('❌ Email sending failed:', sendError);
    throw sendError; // Перебрасываем ошибку для обработки выше
  }

    res.json({ 
      success: true,
      message: 'Код отправлен на вашу почту',
      code: process.env.NODE_ENV === 'production' ? null : code,
      userId: userId // Возвращаем userId для отладки
    });

  } catch (error) {
    console.error('❌ Email sending error:', error);
    
    if (error.code === 'EAUTH') {
      return res.status(500).json({ 
        success: false,
        message: 'Ошибка аутентификации почтового сервера. Проверьте логин и пароль.' 
      });
    }
    
    if (error.code === 'ECONNECTION') {
      return res.status(500).json({ 
        success: false,
        message: 'Ошибка подключения к почтовому серверу. Проверьте хост и порт.' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Ошибка при отправке email. Попробуйте позже'
    });
  }
});

// Проверка кода
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ 
        success: false,
        message: 'Email и код обязательны' 
      });
    }

    const storedData = emailCodes.get(email);

    if (!storedData) {
      return res.status(400).json({ 
        success: false,
        message: 'Код не найден или истек срок действия' 
      });
    }

    // Проверка срока действия (10 минут)
    if (Date.now() - storedData.createdAt > 10 * 60 * 1000) {
      emailCodes.delete(email);
      return res.status(400).json({ 
        success: false,
        message: 'Код истек. Запросите новый.' 
      });
    }

    // Проверка попыток
    if (storedData.attempts >= 3) {
      emailCodes.delete(email);
      return res.status(400).json({ 
        success: false,
        message: 'Слишком много попыток. Запросите новый код.' 
      });
    }

    // Проверка кода
    if (storedData.code !== code) {
      storedData.attempts++;
      emailCodes.set(email, storedData);
      
      return res.status(400).json({ 
        success: false,
        message: `Неверный код. Осталось попыток: ${3 - storedData.attempts}`,
        attemptsLeft: 3 - storedData.attempts
      });
    }

    // Успешная проверка - используем сохраненный userId из кода
    const userId = storedData.userId;

    // Генерируем JWT токен (он будет разным, но для одного userId)
    const token = generateToken(email, userId);

    // Удаляем использованный код
    emailCodes.delete(email);

    console.log(`✅ Успешная аутентификация: ${email} -> ${userId}`);
    console.log(`🔑 Сгенерирован токен для userId: ${userId}`);

    res.json({ 
      success: true,
      message: 'Код подтвержден успешно! ✅',
      token: token,
      userId: userId,
      email: email
    });

  } catch (error) {
    console.error('Code verification error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при проверке кода' 
    });
  }
});

// Проверка валидности токена
router.get('/verify-token', authenticateToken, (req, res) => {
  res.json({ 
    success: true,
    user: req.user 
  });
});

// Получение информации о пользователе
router.get('/user/:userId', authenticateToken, (req, res) => {
  const { userId } = req.params;
  
  // Проверяем, что пользователь запрашивает свои данные
  if (req.user.userId !== userId) {
    return res.status(403).json({ 
      success: false,
      message: 'Доступ запрещен' 
    });
  }

  // Ищем пользователя по userId
  const userEntry = Array.from(users.entries()).find(([email, id]) => id === userId);
  
  if (!userEntry) {
    return res.status(404).json({ 
      success: false,
      message: 'Пользователь не найден' 
    });
  }

  res.json({ 
    success: true,
    user: {
      userId: userId,
      email: userEntry[0] // email из хранилища
    }
  });
});

// Получение userId по email (для отладки)
router.get('/user-by-email/:email', (req, res) => {
  const { email } = req.params;
  const userId = users.get(email);
  
  if (!userId) {
    return res.status(404).json({ 
      success: false,
      message: 'Пользователь не найден' 
    });
  }

  res.json({ 
    success: true,
    email: email,
    userId: userId
  });
});

module.exports = router;