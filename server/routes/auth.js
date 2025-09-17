const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Хранилище кодов (в production используйте Redis или DB)
const emailCodes = new Map();

// Генерация 6-значного кода
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Создание транспортера для email сервера
const createTransporter = () => {
  return nodemailer.createTransport({ // ← createTransport вместо createTransporter
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

// Проверка валидности email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Очистка старых кодов
function cleanupOldCodes() {
  const now = Date.now();
  const tenMinutesAgo = now - (10 * 60 * 1000);
  
  for (let [email, data] of emailCodes.entries()) {
    if (data.createdAt < tenMinutesAgo) {
      emailCodes.delete(email);
      console.log(`Cleaned up expired code for: ${email}`);
    }
  }
}

// Отправка email с кодом
router.post('/email', async (req, res) => {
  try {
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

    // Генерация и сохранение кода
    const code = generateCode();
    emailCodes.set(email, {
      code,
      createdAt: Date.now(),
      attempts: 0
    });

    // Очистка старых кодов
    cleanupOldCodes();

    // Настройка транспортера - ИСПРАВЛЕНО!
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

    // Отправка (в production режиме)
  // Отправка письма ВСЕГДА (и в development, и в production)
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to: ${email}`);
    
    // Дополнительно логируем для development
    if (process.env.NODE_ENV !== 'production') {
      console.log('=== DEVELOPMENT INFO ===');
      console.log('📧 Email:', email);
      console.log('🔢 Code:', code);
      console.log('=======================');
    }
    
  } catch (sendError) {
    console.error('❌ Email sending failed:', sendError);
    throw sendError; // Перебрасываем ошибку для обработки выше
  }

    res.json({ 
      success: true,
      message: 'Код отправлен на вашу почту',
      code: process.env.NODE_ENV === 'production' ? null : code
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

    // Успешная проверка
    emailCodes.delete(email);

    res.json({ 
      success: true,
      message: 'Код подтвержден успешно! ✅',
      token: 'your-jwt-token-here'
    });

  } catch (error) {
    console.error('Code verification error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при проверке кода' 
    });
  }
});

module.exports = router;