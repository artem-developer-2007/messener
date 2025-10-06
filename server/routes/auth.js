const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { 
  upsertUserWithCode, 
  verifyCode, 
  getUserByEmail,
  getUserById,
  searchUsers,
  cleanupExpiredCodes,
  testConnection 
} = require('../database');

// СЕКРЕТНЫЙ КЛЮЧ ДЛЯ JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ГЕНЕРАЦИЯ 6-ЗНАЧНОГО КОДА
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ГЕНЕРАЦИЯ JWT ТОКЕНА
function generateToken(email, userId) {
  return jwt.sign(
    { 
      email, 
      userId, 
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 час
    },
    JWT_SECRET
  );
}

// СОЗДАНИЕ ТРАНСПОРТЕРА ДЛЯ EMAIL-СЕРВЕРА
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// ПРОВЕРКА ВАЛИДНОСТИ EMAIL
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ОЧИСТКА СТАРЫХ КОДОВ
async function cleanupOldCodes() {
  try {
    await cleanupExpiredCodes();
  } catch (error) {
    console.error('❌ Ошибка при очистке кодов:', error);
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

// ==================== ЭНДПОИНТЫ АУТЕНТИФИКАЦИИ ====================

// 📧 ОТПРАВКА EMAIL С КОДОМ ПОДТВЕРЖДЕНИЯ
router.post('/email', async (req, res) => {
  try {
    const { email } = req.body;

    // Валидация входных данных
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

    // Генерируем 6-значный код и время expiration (10 минут)
    const code = generateCode();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // СОХРАНЯЕМ В POSTGRESQL (создаем или обновляем пользователя)
    const dbResult = await upsertUserWithCode(email, code, codeExpiresAt);
    
    if (!dbResult.success) {
      return res.status(500).json({ 
        success: false,
        message: 'Ошибка при сохранении кода в базу данных' 
      });
    }

    // Очистка старых кодов (фоново)
    await cleanupOldCodes();

    // Настройка транспортера для отправки email
    const transporter = createTransporter();

    // Проверяем соединение с SMTP сервером
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified');
    } catch (verifyError) {
      console.error('❌ SMTP connection failed:', verifyError);
      return res.status(500).json({ 
        success: false,
        message: 'Ошибка подключения к почтовому серверу' 
      });
    }

    // Отправка email с кодом подтверждения
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

    // Отправка письма
    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to: ${email}`);
      
      // Дополнительно логируем для development среды
      if (process.env.NODE_ENV !== 'production') {
        console.log('=== DEVELOPMENT INFO ===');
        console.log('📧 Email:', email);
        console.log('🔢 Code:', code);
        console.log('⏰ Expires:', codeExpiresAt);
        console.log('=======================');
      }
      
    } catch (sendError) {
      console.error('❌ Email sending failed:', sendError);
      throw sendError;
    }

    res.json({ 
      success: true,
      message: 'Код отправлен на вашу почту',
      // В production не показываем код, в development показываем для тестирования
      code: process.env.NODE_ENV === 'production' ? null : code
    });

  } catch (error) {
    console.error('❌ Email sending error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при отправке кода' 
    });
  }
});

// ✅ ПРОВЕРКА КОДА ПОДТВЕРЖДЕНИЯ И ВХОД
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    // Валидация входных данных
    if (!email || !code) {
      return res.status(400).json({ 
        success: false,
        message: 'Email и код обязательны' 
      });
    }

    // ПРОВЕРЯЕМ КОД ЧЕРЕЗ POSTGRESQL
    const verificationResult = await verifyCode(email, code);

    if (!verificationResult.success) {
      return res.status(400).json({ 
        success: false,
        message: verificationResult.message 
      });
    }

    // Успешная проверка - генерируем JWT токен
    const userId = verificationResult.user.id;
    const token = generateToken(email, userId);

    console.log(`✅ Успешная аутентификация: ${email} -> ${userId}`);
    console.log(`🔑 Сгенерирован токен для userId: ${userId}`);

    res.json({ 
      success: true,
      message: 'Код подтвержден успешно! ✅',
      token: token,
      userId: userId,
      email: email,
      user: verificationResult.user
    });

  } catch (error) {
    console.error('❌ Code verification error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при проверке кода' 
    });
  }
});

// 🔐 ПРОВЕРКА ВАЛИДНОСТИ ТОКЕНА (для защищенных маршрутов)
router.get('/verify-token', authenticateToken, (req, res) => {
  res.json({ 
    success: true,
    user: req.user 
  });
});

// 👤 ПОЛУЧЕНИЕ ИНФОРМАЦИИ О ТЕКУЩЕМ ПОЛЬЗОВАТЕЛЕ
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Проверяем, что пользователь запрашивает свои данные
    if (req.user.userId !== parseInt(userId)) {
      return res.status(403).json({ 
        success: false,
        message: 'Доступ запрещен' 
      });
    }

    // Ищем пользователя в PostgreSQL
    const user = await getUserByEmail(req.user.email);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Пользователь не найден' 
      });
    }

    res.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        is_verified: user.is_verified,
        last_login: user.last_login,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('❌ Error getting user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при получении данных пользователя' 
    });
  }
});

// ==================== ЭНДПОИНТЫ ПОИСКА ПОЛЬЗОВАТЕЛЕЙ ====================

// 🔍 ПОИСК ПОЛЬЗОВАТЕЛЕЙ ПО ID ИЛИ EMAIL
router.get('/search-users', authenticateToken, async (req, res) => {
  try {
    const { searchTerm } = req.query;

    // Проверяем что searchTerm предоставлен
    if (!searchTerm || searchTerm.trim() === '') {
      return res.status(400).json({ 
        success: false,
        message: 'Пожалуйста, введите ID или email для поиска' 
      });
    }

    console.log(`🔍 Поиск пользователей: "${searchTerm}"`);

    // Ищем пользователей в базе данных
    const foundUsers = await searchUsers(searchTerm.trim());

    if (foundUsers.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Пользователи не найдены' 
      });
    }

    // Форматируем ответ с пользователями
    const formattedUsers = foundUsers.map(user => ({
      id: user.id,
      email: user.email,
      // Генерируем аватар на основе ID пользователя (синий градиент)
      avatar: `https://ui-avatars.com/api/?name=${user.id}&background=4294ff&color=ffffff&bold=true`,
      // Используем ID как имя пользователя для отображения
      displayName: `User${user.id}`,
      is_verified: user.is_verified,
      last_login: user.last_login,
      created_at: user.created_at
    }));

    res.json({ 
      success: true,
      message: `Найдено пользователей: ${formattedUsers.length}`,
      users: formattedUsers
    });

  } catch (error) {
    console.error('❌ Ошибка при поиске пользователей:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при поиске пользователей' 
    });
  }
});

// 👤 ПОЛУЧЕНИЕ ИНФОРМАЦИИ О КОНКРЕТНОМ ПОЛЬЗОВАТЕЛЕ ПО ID
router.get('/user-info/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Проверяем что userId предоставлен и является числом
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Некорректный ID пользователя' 
      });
    }

    console.log(`👤 Запрос информации о пользователе: ${userId}`);

    // Ищем пользователя в базе данных
    const user = await getUserById(parseInt(userId));

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Пользователь не найден' 
      });
    }

    // Форматируем ответ с информацией о пользователе
    const userInfo = {
      id: user.id,
      email: user.email,
      // Генерируем аватар на основе ID пользователя
      avatar: `https://ui-avatars.com/api/?name=${user.id}&background=4294ff&color=ffffff&bold=true`,
      // Используем ID как имя пользователя для отображения
      displayName: `User${user.id}`,
      is_verified: user.is_verified,
      last_login: user.last_login,
      created_at: user.created_at
    };

    res.json({ 
      success: true,
      user: userInfo
    });

  } catch (error) {
    console.error('❌ Ошибка при получении информации о пользователе:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при получении информации о пользователе' 
    });
  }
});

// ==================== СЛУЖЕБНЫЕ ЭНДПОИНТЫ ====================

// 🗄️ ИНИЦИАЛИЗАЦИЯ ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ
router.get('/init-db', async (req, res) => {
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      res.json({ success: true, message: 'PostgreSQL подключен' });
    } else {
      res.status(500).json({ success: false, message: 'Ошибка подключения к PostgreSQL' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ошибка инициализации БД' });
  }
});

// 🧹 РУЧНАЯ ОЧИСТКА УСТАРЕВШИХ КОДОВ (для администрирования)e
router.post('/cleanup-codes', authenticateToken, async (req, res) => {
  try {
    const cleanedCount = await cleanupExpiredCodes();
    res.json({ 
      success: true, 
      message: `Очищено ${cleanedCount} устаревших кодов` 
    });
  } catch (error) {
    console.error('❌ Ошибка при очистке кодов:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка при очистке кодов' 
    });
  }
});

// ==================== ЭКСПОРТ РОУТЕРА ====================

module.exports = router;