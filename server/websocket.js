const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { 
  getOrCreateChat, 
  saveMessage, 
  markMessagesAsRead,
  getUserById 
} = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // userId -> WebSocket
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      console.log('🔌 Новое WebSocket соединение');

      // Аутентификация через JWT
      const token = req.url.split('token=')[1];
      if (!token) {
        ws.close(1008, 'Токен не предоставлен');
        return;
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;
        
        // Сохраняем соединение
        this.clients.set(userId, ws);
        console.log(`✅ Пользователь ${userId} подключен к WebSocket`);

        // Сохраняем информацию о пользователе в соединении
        ws.userId = userId;
        ws.userEmail = decoded.email;

        // Обработка сообщений
        ws.on('message', async (data) => {
          try {
            const message = JSON.parse(data);
            await this.handleMessage(ws, message);
          } catch (error) {
            console.error('❌ Ошибка обработки сообщения:', error);
            this.sendError(ws, 'Ошибка обработки сообщения');
          }
        });

        // Обработка отключения
        ws.on('close', () => {
          this.clients.delete(userId);
          console.log(`❌ Пользователь ${userId} отключен от WebSocket`);
        });

        // Отправляем приветственное сообщение
        this.sendToUser(userId, {
          type: 'connection_established',
          message: 'WebSocket соединение установлено'
        });

      } catch (error) {
        console.error('❌ Ошибка аутентификации WebSocket:', error);
        ws.close(1008, 'Недействительный токен');
      }
    });
  }

  async handleMessage(ws, message) {
    const { type, data } = message;
    const userId = ws.userId;

    switch (type) {
      case 'send_message':
        await this.handleSendMessage(userId, data);
        break;
      
      case 'mark_as_read':
        await this.handleMarkAsRead(userId, data);
        break;
      
      case 'typing_start':
      case 'typing_stop':
        await this.handleTyping(userId, type, data);
        break;
      
      default:
        console.log('❌ Неизвестный тип сообщения:', type);
    }
  }

  async handleSendMessage(senderId, data) {
    const { contactId, messageText } = data;
    
    if (!contactId || !messageText) {
      return;
    }

    try {
      // Получаем или создаем чат
      const chatResult = await getOrCreateChat(senderId, contactId);
      if (!chatResult.success) {
        console.error('❌ Ошибка создания чата:', chatResult.error);
        return;
      }

      // Сохраняем сообщение в БД
      const saveResult = await saveMessage(chatResult.chatId, senderId, messageText);
      if (!saveResult.success) {
        console.error('❌ Ошибка сохранения сообщения:', saveResult.error);
        return;
      }

      // Получаем информацию об отправителе
      const sender = await getUserById(senderId);
      
      // Формируем объект сообщения для отправки
      const messageData = {
        id: saveResult.message.id,
        chatId: chatResult.chatId,
        senderId: senderId,
        senderEmail: sender.email,
        messageText: messageText,
        createdAt: saveResult.message.created_at,
        isRead: false
      };

      // Отправляем сообщение отправителю
      this.sendToUser(senderId, {
        type: 'new_message',
        data: messageData
      });

      // Отправляем сообщение получателю (если онлайн)
      this.sendToUser(contactId, {
        type: 'new_message',
        data: messageData
      });

      console.log(`📨 Сообщение отправлено: ${senderId} -> ${contactId}`);

    } catch (error) {
      console.error('❌ Ошибка отправки сообщения:', error);
    }
  }

  async handleMarkAsRead(userId, data) {
    const { chatId } = data;
    
    try {
      await markMessagesAsRead(chatId, userId);
      
      // Уведомляем другого участника чата
      const chatParticipants = await this.getChatParticipants(chatId);
      const otherParticipant = chatParticipants.find(p => p !== userId);
      
      if (otherParticipant) {
        this.sendToUser(otherParticipant, {
          type: 'messages_read',
          data: { chatId, readerId: userId }
        });
      }
    } catch (error) {
      console.error('❌ Ошибка отметки сообщений как прочитанных:', error);
    }
  }

  async handleTyping(userId, type, data) {
    const { chatId, contactId } = data;
    
    // Отправляем уведомление о печати контакту
    if (contactId) {
      this.sendToUser(contactId, {
        type: type,
        data: { chatId, userId }
      });
    }
  }

  // Вспомогательные методы
  sendToUser(userId, message) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  sendError(ws, errorMessage) {
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: errorMessage }
    }));
  }

  async getChatParticipants(chatId) {
    // Реализация получения участников чата из БД
    // Это упрощенная версия - в реальности нужно делать запрос к БД
    return []; // Заглушка
  }

  // Метод для отправки уведомлений
  broadcastToUsers(userIds, message) {
    userIds.forEach(userId => this.sendToUser(userId, message));
  }
}

module.exports = WebSocketServer;