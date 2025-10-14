const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const WebSocket = require('ws');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// Импорт всех функций из database.js
const { 
  pool,
  testConnection,
  upsertUserWithCode,
  verifyCode,
  getUserByEmail,
  getUserById,
  searchUsers,
  cleanupExpiredCodes,
  addContact,
  getUserContacts,
  getOrCreateChat,
  saveMessage,
  getChatMessages,
  getUserChats,
  markMessagesAsRead,
  getChatParticipants,
  areUsersContacts,
  getUnreadMessagesCount
} = require('./database');

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ==================== КОНСТАНТЫ И НАСТРОЙКИ ====================

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const clients = new Map(); // userId -> WebSocket

// ==================== MIDDLEWARE ====================

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Логирование всех запросов
app.use((req, res, next) => {
  console.log(`📨 ${new Date().toISOString()} ${req.method} ${req.url}`);
  if (req.method === 'POST' && req.body) {
    console.log('📦 Body:', { ...req.body, password: '***', verification_code: '***' });
  }
  next();
});

// ==================== WEB SOCKET СЕРВЕР ====================

const setupWebSocket = () => {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    console.log('🔌 Новое WebSocket соединение');

    // Аутентификация через JWT
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      ws.close(1008, 'Токен не предоставлен');
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.userId;
      
      // Сохраняем соединение
      clients.set(userId, ws);
      console.log(`✅ Пользователь ${userId} подключен к WebSocket`);

      // Сохраняем информацию о пользователе в соединении
      ws.userId = userId;
      ws.userEmail = decoded.email;

      // Обработка сообщений
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data);
          await handleWebSocketMessage(ws, message);
        } catch (error) {
          console.error('❌ Ошибка обработки сообщения:', error);
          sendWebSocketError(ws, 'Ошибка обработки сообщения');
        }
      });

      // Обработка отключения
      ws.on('close', () => {
        clients.delete(userId);
        console.log(`❌ Пользователь ${userId} отключен от WebSocket`);
      });

      // Отправляем приветственное сообщение
      sendToUser(userId, {
        type: 'connection_established',
        message: 'WebSocket соединение установлено',
        userId: userId
      });

    } catch (error) {
      console.error('❌ Ошибка аутентификации WebSocket:', error);
      ws.close(1008, 'Недействительный токен');
    }
  });

  console.log('✅ WebSocket сервер запущен');
};

// Обработка WebSocket сообщений
const handleWebSocketMessage = async (ws, message) => {
  const { type, data } = message;
  const userId = ws.userId;

  switch (type) {
    case 'send_message':
      await handleSendMessage(userId, data);
      break;
    
    case 'mark_as_read':
      await handleMarkAsRead(userId, data);
      break;
    
    case 'typing_start':
    case 'typing_stop':
      await handleTyping(userId, type, data);
      break;
    
    default:
      console.log('❌ Неизвестный тип сообщения:', type);
  }
};

// Отправка сообщения через WebSocket
const handleSendMessage = async (senderId, data) => {
  const { chatId, contactId, messageText } = data;
  
  if (!chatId || !messageText) {
    return;
  }

  try {
    // Временно убираем проверку контактов для тестирования
    // const areContacts = await areUsersContacts(senderId, contactId);
    // if (!areContacts) {
    //   console.log('❌ Пользователи не являются контактами');
    //   return;
    // }

    // Сохраняем сообщение в БД
    const saveResult = await saveMessage(chatId, senderId, messageText);
    if (!saveResult.success) {
      console.error('❌ Ошибка сохранения сообщения:', saveResult.error);
      return;
    }

    // Получаем информацию об отправителе
    const sender = await getUserById(senderId);
    
    // Формируем объект сообщения для отправки
    const messageData = {
      id: saveResult.message.id,
      chatId: chatId,
      senderId: senderId,
      senderEmail: sender.email,
      messageText: messageText,
      createdAt: saveResult.message.created_at,
      isRead: false
    };

    // Отправляем сообщение отправителю
    sendToUser(senderId, {
      type: 'new_message',
      data: messageData
    });

    // Отправляем сообщение получателю (если онлайн)
    if (contactId && contactId !== senderId) {
      sendToUser(contactId, {
        type: 'new_message',
        data: messageData
      });
    }

    console.log(`📨 Сообщение отправлено: ${senderId} -> ${contactId}, chat: ${chatId}`);

  } catch (error) {
    console.error('❌ Ошибка отправки сообщения:', error);
  }
};

// Отметка сообщений как прочитанных
const handleMarkAsRead = async (userId, data) => {
  const { chatId } = data;
  
  try {
    const result = await markMessagesAsRead(chatId, userId);
    
    // Уведомляем другого участника чата
    const participants = await getChatParticipants(chatId);
    const otherParticipant = participants.find(p => p !== userId);
    
    if (otherParticipant) {
      sendToUser(otherParticipant, {
        type: 'messages_read',
        data: { chatId, readerId: userId }
      });
    }
  } catch (error) {
    console.error('❌ Ошибка отметки сообщений как прочитанных:', error);
  }
};

// Обработка индикатора печати
const handleTyping = async (userId, type, data) => {
  const { chatId, contactId } = data;
  
  // Отправляем уведомление о печати контакту
  if (contactId) {
    sendToUser(contactId, {
      type: type,
      data: { chatId, userId }
    });
  }
};

// Вспомогательные функции WebSocket
const sendToUser = (userId, message) => {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
};

const sendWebSocketError = (ws, errorMessage) => {
  ws.send(JSON.stringify({
    type: 'error',
    data: { message: errorMessage }
  }));
};

// ==================== ФУНКЦИИ АУТЕНТИФИКАЦИИ ====================

// Генерация 6-значного кода
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Генерация JWT токена
const generateToken = (email, userId) => {
  return jwt.sign(
    { 
      email, 
      userId, 
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 часа
    },
    JWT_SECRET
  );
};

// Создание транспортера для email
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

// Проверка валидности email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

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

// Очистка старых кодов
const cleanupOldCodes = async () => {
  try {
    await cleanupExpiredCodes();
  } catch (error) {
    console.error('❌ Ошибка при очистке кодов:', error);
  }
};

// ==================== ЭНДПОИНТЫ АУТЕНТИФИКАЦИИ ====================

// 📧 ОТПРАВКА EMAIL С КОДОМ ПОДТВЕРЖДЕНИЯ
app.post('/api/auth/email', async (req, res) => {
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

    // Сохраняем в PostgreSQL
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #16203b, #ce4a1e); padding: 20px; border-radius: 5px; text-align: center;">
          <h2 style="color: #ffffff;">Код подтверждения</h2>
          <p style="color: #ffffff;">Для завершения аутентификации используйте следующий код:</p>
          
          <div style="padding: 15px; text-align: center; margin: 20px 0;">
            <div style="color: #d17b2b; font-size: 28px; font-weight: bold; letter-spacing: 8px; margin: 0; background-color: white; border-radius: 7px; padding: 15px 10px; display: inline-block; min-width: 200px;">
              ${code}
            </div>
          </div>
          
          <p style="color: #ffffff; font-size: 14px;">
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
app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    // Валидация входных данных
    if (!email || !code) {
      return res.status(400).json({ 
        success: false,
        message: 'Email и код обязательны' 
      });
    }

    // Проверяем код через PostgreSQL
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

// 🔐 ПРОВЕРКА ВАЛИДНОСТИ ТОКЕНА
app.get('/api/auth/verify-token', authenticateToken, (req, res) => {
  res.json({ 
    success: true,
    user: req.user 
  });
});

// 👤 ПОЛУЧЕНИЕ ИНФОРМАЦИИ О ТЕКУЩЕМ ПОЛЬЗОВАТЕЛЕ
app.get('/api/auth/user/:userId', authenticateToken, async (req, res) => {
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
app.get('/api/auth/search-users', authenticateToken, async (req, res) => {
  try {
    const { searchTerm } = req.query;

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
      avatar: `https://ui-avatars.com/api/?name=${user.id}&background=4294ff&color=ffffff&bold=true`,
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
app.get('/api/auth/user-info/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

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
      avatar: `https://ui-avatars.com/api/?name=${user.id}&background=4294ff&color=ffffff&bold=true`,
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

// ==================== ЭНДПОИНТЫ ЧАТОВ И СООБЩЕНИЙ ====================

// ➕ ДОБАВЛЕНИЕ КОНТАКТА
app.post('/api/contacts/add', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.body;
    const userId = req.user.userId;

    if (!contactId) {
      return res.status(400).json({ 
        success: false,
        message: 'ID контакта обязателен' 
      });
    }

    // Нельзя добавить самого себя
    if (userId === contactId) {
      return res.status(400).json({ 
        success: false,
        message: 'Нельзя добавить самого себя в контакты' 
      });
    }

    // Проверяем существование пользователя
    const contactUser = await getUserById(contactId);
    if (!contactUser) {
      return res.status(404).json({ 
        success: false,
        message: 'Пользователь не найден' 
      });
    }

    const result = await addContact(userId, contactId);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Контакт добавлен',
        contact: {
          id: contactUser.id,
          email: contactUser.email,
          displayName: `User${contactUser.id}`,
          avatar: `https://ui-avatars.com/api/?name=${contactUser.id}&background=4294ff&color=ffffff&bold=true`
        }
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Контакт уже добавлен или произошла ошибка' 
      });
    }
  } catch (error) {
    console.error('❌ Ошибка при добавлении контакта:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка при добавлении контакта' 
    });
  }
});

// 📋 ПОЛУЧЕНИЕ КОНТАКТОВ ПОЛЬЗОВАТЕЛЯ
app.get('/api/contacts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const contacts = await getUserContacts(userId);

    const formattedContacts = contacts.map(contact => ({
      id: contact.id,
      email: contact.email,
      displayName: `User${contact.id}`,
      avatar: `https://ui-avatars.com/api/?name=${contact.id}&background=4294ff&color=ffffff&bold=true`,
      created_at: contact.created_at
    }));

    res.json({ 
      success: true, 
      contacts: formattedContacts 
    });
  } catch (error) {
    console.error('❌ Ошибка при получении контактов:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка при получении контактов' 
    });
  }
});

// 💬 ПОЛУЧЕНИЕ ЧАТОВ ПОЛЬЗОВАТЕЛЯ
app.get('/api/chats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const chats = await getUserChats(userId);

    const formattedChats = chats.map(chat => ({
      id: chat.chat_id,
      contact: {
        id: chat.contact_id,
        email: chat.contact_email,
        displayName: `User${chat.contact_id}`,
        avatar: `https://ui-avatars.com/api/?name=${chat.contact_id}&background=4294ff&color=ffffff&bold=true`
      },
      lastMessage: chat.last_message,
      lastMessageTime: chat.last_message_time,
      updatedAt: chat.updated_at
    }));

    res.json({ 
      success: true, 
      chats: formattedChats 
    });
  } catch (error) {
    console.error('❌ Ошибка при получении чатов:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка при получении чатов' 
    });
  }
});

// 📨 ПОЛУЧЕНИЕ СООБЩЕНИЙ ЧАТА
app.get('/api/messages/:chatId', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.userId;

    // Проверяем, что пользователь является участником чата
    const participants = await getChatParticipants(chatId);
    if (!participants.includes(userId)) {
      return res.status(403).json({ 
        success: false,
        message: 'Доступ к чату запрещен' 
      });
    }

    const messages = await getChatMessages(chatId);

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      senderId: msg.sender_id,
      senderEmail: msg.sender_email,
      text: msg.message_text,
      time: msg.created_at,
      isRead: msg.is_read,
      isOwn: msg.sender_id === userId
    }));

    res.json({ 
      success: true, 
      messages: formattedMessages 
    });
  } catch (error) {
    console.error('❌ Ошибка при получении сообщений:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка при получении сообщений' 
    });
  }
});

// 🔢 ПОЛУЧЕНИЕ КОЛИЧЕСТВА НЕПРОЧИТАННЫХ СООБЩЕНИЙ
app.get('/api/messages/unread/count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const unreadCount = await getUnreadMessagesCount(userId);

    res.json({ 
      success: true, 
      unreadCount 
    });
  } catch (error) {
    console.error('❌ Ошибка при получении непрочитанных сообщений:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка при получении непрочитанных сообщений' 
    });
  }
});

// ==================== СЛУЖЕБНЫЕ ЭНДПОИНТЫ ====================

// 💬 ПОЛУЧЕНИЕ ИЛИ СОЗДАНИЕ ЧАТА
app.post('/api/chats/get-or-create', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.body;
    const userId = req.user.userId;

    if (!contactId) {
      return res.status(400).json({ 
        success: false,
        message: 'ID контакта обязателен' 
      });
    }

    // Получаем или создаем чат
    const chatResult = await getOrCreateChat(userId, contactId);
    
    if (chatResult.success) {
      res.json({ 
        success: true, 
        chatId: chatResult.chatId,
        isNew: chatResult.isNew
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Ошибка при создании чата' 
      });
    }
  } catch (error) {
    console.error('❌ Ошибка при получении/создании чата:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка при создании чата' 
    });
  }
});

// 🗄️ ИНИЦИАЛИЗАЦИЯ ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ
app.get('/api/init-db', async (req, res) => {
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

// 🧹 РУЧНАЯ ОЧИСТКА УСТАРЕВШИХ КОДОВ
app.post('/api/cleanup-codes', authenticateToken, async (req, res) => {
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

// 🩺 ПРОВЕРКА ЗДОРОВЬЯ СЕРВЕРА
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Сервер работает нормально',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    websocketConnections: clients.size
  });
});

// ==================== ТЕСТОВЫЕ ЭНДПОИНТЫ ====================

// ПРОСТОЙ ЭНДПОИНТ ДЛЯ ТЕСТИРОВАНИЯ EMAIL
app.post('/api/auth/simple-email', (req, res) => {
  console.log('✅ Простой эндпоинт вызван! Email:', req.body.email);
  res.json({ 
    success: true, 
    message: 'Тестовый ответ от сервера!',
    code: '123456'
  });
});

// ТЕСТОВЫЙ ЭНДПОИНТ
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'Сервер работает!',
    timestamp: new Date().toISOString()
  });
});

// ==================== ОБРАБОТКА ОШИБОК ====================

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('❌ Ошибка сервера:', err);
  res.status(500).json({
    success: false,
    message: 'Внутренняя ошибка сервера'
  });
});

// Обработка несуществующих маршрутов
app.use((req, res) => {
  console.log(`❌ Маршрут не найден: ${req.method} ${req.url}`);
  res.status(404).json({ 
    success: false,
    message: 'Страница не найдена' 
  });
});

// ==================== ЗАПУСК СЕРВЕРА ====================

// Проверка подключения к БД при старте сервера
const initializeDatabase = async () => {
  console.log('🔍 Проверка подключения к PostgreSQL...');
  const isConnected = await testConnection();
  if (isConnected) {
    console.log('✅ База данных успешно подключена');
    
    // Запускаем периодическую очистку старых кодов (каждые 30 минут)
    setInterval(cleanupOldCodes, 30 * 60 * 1000);
    console.log('✅ Запущена периодическая очистка кодов');
  } else {
    console.log('❌ Проблемы с подключением к базе данных');
  }
};

// ЗАПУСК СЕРВЕРА
server.listen(PORT, async () => {
  await initializeDatabase();
  setupWebSocket();
  
  console.log(`\nСервер успешно запущен!`);
  console.log(`Порт: ${PORT}`);
  console.log(`HTTP API: http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
  console.log(`CORS: http://localhost:5173`);
  console.log(`   Доступные эндпоинты:`);
  console.log(`   GET  /api/test`);
  console.log(`   GET  /api/health`);
  console.log(`   POST /api/auth/email`);
  console.log(`   POST /api/auth/verify-code`);
  console.log(`   GET  /api/auth/search-users`);
  console.log(`   POST /api/contacts/add`);
  console.log(`   GET  /api/contacts`);
  console.log(`   GET  /api/chats`);
  console.log(`   GET  /api/messages/:chatId`);
  console.log(`\nWebSocket события: send_message, mark_as_read, typing_start/stop`);
  console.log(`\nГотов к работе!`);
});