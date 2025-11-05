const { Pool } = require('pg');
require('dotenv').config();

<<<<<<< HEAD
// Пул для соединения с Potgres
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'messenger_db',
=======
// Создаем пул соединений с PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'your_database_name',
>>>>>>> 0dd18585cf3beb9146e60a185cd7943f679b8751
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
});

<<<<<<< HEAD
// Функции БД

// F1 для проверки подключения
=======
// Функция для проверки подключения
>>>>>>> 0dd18585cf3beb9146e60a185cd7943f679b8751
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL подключен успешно');
    client.release();
    return true;
  } catch (error) {
<<<<<<< HEAD
    console.error('Ошибка подключения к PostgreSQL:', error.message);
=======
    console.error('❌ Ошибка подключения к PostgreSQL:', error.message);
>>>>>>> 0dd18585cf3beb9146e60a185cd7943f679b8751
    return false;
  }
};

<<<<<<< HEAD
// F2 для создания/обновления пользователя и кода
const upsertUserWithCode = async (email, verificationCode, codeExpiresAt) => {
  try {
    const query = `
      INSERT INTO users (email, verification_code, code_expires_at, is_verified, login_attempts)
=======
// Функция для создания/обновления пользователя и кода
const upsertUserWithCode = async (email, verificationCode, codeExpiresAt) => {
  try {
    const query = `
      INSERT INTO email (email, verification_code, code_expires_at, is_verified, login_attempts)
>>>>>>> 0dd18585cf3beb9146e60a185cd7943f679b8751
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) 
      DO UPDATE SET 
        verification_code = EXCLUDED.verification_code,
        code_expires_at = EXCLUDED.code_expires_at,
        is_verified = EXCLUDED.is_verified,
        login_attempts = EXCLUDED.login_attempts,
        created_at = CASE 
<<<<<<< HEAD
          WHEN users.id IS NULL THEN NOW() 
          ELSE users.created_at 
=======
          WHEN email.id IS NULL THEN NOW() 
          ELSE email.created_at 
>>>>>>> 0dd18585cf3beb9146e60a185cd7943f679b8751
        END
      RETURNING id, email, verification_code, code_expires_at, is_verified;
    `;
    
    const values = [email, verificationCode, codeExpiresAt, false, 0];
    
    const result = await pool.query(query, values);
    return { success: true, user: result.rows[0] };
    
  } catch (error) {
    console.error('❌ Ошибка при upsert пользователя:', error);
    return { success: false, error: error.message };
  }
};

<<<<<<< HEAD
// F3 для проверки кода
const verifyCode = async (email, code) => {
  try {
    // КОД СУЩЕСТВУЕТ И НЕ ИСТЕК
    const query = `
      SELECT id, email, verification_code, code_expires_at, login_attempts, is_verified
      FROM users 
      WHERE email = $1 AND verification_code = $2 AND code_expires_at > NOW()
    `;

    const values = [email, code]
    
    const checkResult = await pool.query(query, values);
    
    if (checkResult.rows.length === 0) {
      // ИНКРЕМЕНТ ПОПЫТОК
      await pool.query(
        'UPDATE users SET login_attempts = login_attempts + 1 WHERE email = $1',
=======
// Функция для проверки кода
const verifyCode = async (email, code) => {
  try {
    // Сначала проверяем существует ли код и не истек ли срок
    const checkQuery = `
      SELECT id, email, verification_code, code_expires_at, login_attempts, is_verified
      FROM email 
      WHERE email = $1 AND verification_code = $2 AND code_expires_at > NOW()
    `;
    
    const checkResult = await pool.query(checkQuery, [email, code]);
    
    if (checkResult.rows.length === 0) {
      // Увеличиваем счетчик попыток если пользователь существует
      await pool.query(
        'UPDATE email SET login_attempts = login_attempts + 1 WHERE email = $1',
>>>>>>> 0dd18585cf3beb9146e60a185cd7943f679b8751
        [email]
      );
      return { success: false, message: 'Неверный код или код истек' };
    }
    
    const user = checkResult.rows[0];
    
<<<<<<< HEAD
    // ПРОВЕРКА КОЛИЧЕСТВА ПОПЫТОК
=======
    // Проверяем количество попыток
>>>>>>> 0dd18585cf3beb9146e60a185cd7943f679b8751
    if (user.login_attempts >= 5) {
      return { success: false, message: 'Слишком много неудачных попыток. Запросите новый код.' };
    }
    
    // Если код верный - обновляем статус пользователя
    const updateQuery = `
<<<<<<< HEAD
      UPDATE users 
=======
      UPDATE email 
>>>>>>> 0dd18585cf3beb9146e60a185cd7943f679b8751
      SET is_verified = true, login_attempts = 0, last_login = NOW()
      WHERE email = $1
      RETURNING id, email, is_verified, last_login
    `;
    
    const updateResult = await pool.query(updateQuery, [email]);
    
    return { 
      success: true, 
      message: 'Код подтвержден успешно!',
      user: updateResult.rows[0]
    };
    
  } catch (error) {
    console.error('❌ Ошибка при проверке кода:', error);
    return { success: false, error: error.message };
  }
};

<<<<<<< HEAD
// ПОЛЬЗОВАТЕЛЯ МОЖНО БДЕТ НАЙТИ ПО ID И ПО EMAIL
// F4 для получения пользователя по email
const getUserByEmail = async (email) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
=======
// Функция для получения пользователя по email
const getUserByEmail = async (email) => {
  try {
    const result = await pool.query(
      'SELECT * FROM email WHERE email = $1',
>>>>>>> 0dd18585cf3beb9146e60a185cd7943f679b8751
      [email]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Ошибка при получении пользователя:', error);
    return null;
  }
};

<<<<<<< HEAD
// F5 для получения пользователя по ID
const getUserById = async (userId) => {
  try {
    const result = await pool.query(
      'SELECT id, email, is_verified, last_login, created_at FROM users WHERE id = $1',
=======
// Функция для получения пользователя по ID
const getUserById = async (userId) => {
  try {
    const result = await pool.query(
      'SELECT id, email, is_verified, last_login, created_at FROM email WHERE id = $1',
>>>>>>> 0dd18585cf3beb9146e60a185cd7943f679b8751
      [userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Ошибка при получении пользователя по ID:', error);
    return null;
  }
};

<<<<<<< HEAD
// F6 для поиска пользователей по ID или email
// F6 для поиска пользователей по ID или email - ТОЧНЫЕ СОВПАДЕНИЯ
const searchUsers = async (searchTerm) => {
  try {
    const query = `
      SELECT id, email, is_verified, last_login, created_at 
      FROM users
      WHERE id::text = $1 OR email = $1
      LIMIT 10
    `;
    
    const result = await pool.query(query, [searchTerm]);
=======
// Функция для поиска пользователей по ID или email
const searchUsers = async (searchTerm) => {
  try {
    // Ищем пользователей по ID (если searchTerm - число) или по email
    const query = `
      SELECT id, email, is_verified, last_login, created_at 
      FROM email 
      WHERE id::text = $1 OR email ILIKE $2
      LIMIT 10
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const result = await pool.query(query, [searchTerm, searchPattern]);
    
>>>>>>> 0dd18585cf3beb9146e60a185cd7943f679b8751
    return result.rows;
  } catch (error) {
    console.error('❌ Ошибка при поиске пользователей:', error);
    return [];
  }
};

<<<<<<< HEAD
// F7 для очистки устаревших кодов
const cleanupExpiredCodes = async () => {
  try {
    const result = await pool.query(
      'UPDATE users SET verification_code = NULL, code_expires_at = NULL WHERE code_expires_at < NOW()'
=======
// Функция для очистки устаревших кодов
const cleanupExpiredCodes = async () => {
  try {
    const result = await pool.query(
      'UPDATE email SET verification_code = NULL, code_expires_at = NULL WHERE code_expires_at < NOW()'
>>>>>>> 0dd18585cf3beb9146e60a185cd7943f679b8751
    );
    console.log(`🧹 Очищено ${result.rowCount} устаревших кодов`);
    return result.rowCount;
  } catch (error) {
    console.error('❌ Ошибка при очистке кодов:', error);
    return 0;
  }
};

<<<<<<< HEAD
// ==================== ФУНКЦИИ ДЛЯ ЧАТОВ И СООБЩЕНИЙ ====================

// F8 Добавление контакта
const addContact = async (userId, contactId) => {
  try {
    const query = `
      INSERT INTO user_contacts (user_id, contact_id) 
      VALUES ($1, $2), ($2, $1)
      ON CONFLICT (user_id, contact_id) DO NOTHING
      RETURNING id
    `;
    
    const result = await pool.query(query, [userId, contactId]);
    return { success: true, contact: result.rows[0] };
  } catch (error) {
    console.error('❌ Ошибка при добавлении контакта:', error);
    return { success: false, error: error.message };
  }
};

// F9 Удаление контакта из друзей для себя
const deleteContact = async (userId, contactId) => {
  try {
    const query = `
      DELETE FROM user_contacts
      WHERE (user_id = $1 AND contact_id = $2)
         OR (user_id = $2 AND contact_id = $1)
    `;
    
    const result = await pool.query(query, [userId, contactId]);
    return { 
      success: true, 
      deletedCount: result.rowCount,
      message: `Удалено ${result.rowCount} связей контакта` 
    };
  } catch (error) {
    console.error('❌ Ошибка при удалении контакта:', error);
    return { success: false, error: error.message };
  }
};

// F9 Удаление контакта из друзей для обоих
const deleteContactTwo = async (userId, contactId) => {
  try {
    const query = `
      INSERT INTO user_contacts (user_id, contact_id) 
      VALUES ($1, $2), ($2, $1)
      ON CONFLICT (user_id, contact_id) DO NOTHING
      RETURNING id
    `;
    
    const result = await pool.query(query, [userId, contactId]);
    return { success: true, contact: result.rows[0] };
  } catch (error) {
    console.error('❌ Ошибка при удалении контакта:', error);
    return { success: false, error: error.message };
  }
};

// F9 Получение контактов пользователя
const getUserContacts = async (userId) => {
  try {
    const query = `
      SELECT u.id, u.email, uc.created_at
      FROM users u
      INNER JOIN user_contacts uc ON u.id = uc.contact_id
      WHERE uc.user_id = $1
      ORDER BY uc.created_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error('❌ Ошибка при получении контактов:', error);
    return [];
  }
};

// F10 Создание или получение чата
const getOrCreateChat = async (user1Id, user2Id) => {
  try {
    // Ищем существующий чат между двумя пользователями
    const findQuery = `
      SELECT c.id 
      FROM chats c
      INNER JOIN chat_participants cp1 ON c.id = cp1.chat_id AND cp1.user_id = $1
      INNER JOIN chat_participants cp2 ON c.id = cp2.chat_id AND cp2.user_id = $2
      LIMIT 1
    `;
    
    const findResult = await pool.query(findQuery, [user1Id, user2Id]);
    
    if (findResult.rows.length > 0) {
      return { success: true, chatId: findResult.rows[0].id, isNew: false };
    }
    
    // Создаем новый чат
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Создаем чат
      const chatResult = await client.query(
        'INSERT INTO chats DEFAULT VALUES RETURNING id'
      );
      const chatId = chatResult.rows[0].id;
      
      // Добавляем участников
      await client.query(
        'INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2), ($1, $3)',
        [chatId, user1Id, user2Id]
      );
      
      await client.query('COMMIT');
      
      return { success: true, chatId, isNew: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Ошибка при создании чата:', error);
    return { success: false, error: error.message };
  }
};

// F11 сообщения
const saveMessage = async (chatId, senderId, messageText) => {
  try {
    const query = `
      INSERT INTO messages (chat_id, sender_id, message_text) 
      VALUES ($1, $2, $3) 
      RETURNING id, created_at
    `;
    
    const result = await pool.query(query, [chatId, senderId, messageText]);
    
    // Обновляем время последнего сообщения в чате
    await pool.query(
      'UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [chatId]
    );
    
    return { 
      success: true, 
      message: {
        id: result.rows[0].id,
        chat_id: chatId,
        sender_id: senderId,
        message_text: messageText,
        created_at: result.rows[0].created_at
      }
    };
  } catch (error) {
    console.error('❌ Ошибка при сохранении сообщения:', error);
    return { success: false, error: error.message };
  }
};

// F12 Получение истории сообщений
const getChatMessages = async (chatId, limit = 50) => {
  try {
    const query = `
      SELECT 
        m.id,
        m.sender_id,
        m.message_text,
        m.created_at,
        m.is_read,
        u.email as sender_email
      FROM messages m
      INNER JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [chatId, limit]);
    return result.rows.reverse(); // Возвращаем в хронологическом порядке
  } catch (error) {
    console.error('❌ Ошибка при получении сообщений:', error);
    return [];
  }
};

// F13 Получение чатов пользователя
const getUserChats = async (userId) => {
  try {
    const query = `
      SELECT 
        c.id as chat_id,
        c.updated_at,
        u.id as contact_id,
        u.email as contact_email,
        (SELECT message_text FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
      FROM chats c
      INNER JOIN chat_participants cp ON c.id = cp.chat_id
      INNER JOIN users u ON (
        u.id != $1 AND 
        u.id IN (SELECT user_id FROM chat_participants WHERE chat_id = c.id AND user_id != $1)
      )
      WHERE cp.user_id = $1
      ORDER BY c.updated_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error('❌ Ошибка при получении чатов:', error);
    return [];
  }
};

// F14 Отметка сообщений как прочитанных
const markMessagesAsRead = async (chatId, userId) => {
  try {
    const query = `
      UPDATE messages 
      SET is_read = true 
      WHERE chat_id = $1 AND sender_id != $2 AND is_read = false
    `;
    
    const result = await pool.query(query, [chatId, userId]);
    return { success: true, updatedCount: result.rowCount };
  } catch (error) {
    console.error('❌ Ошибка при отметке сообщений как прочитанных:', error);
    return { success: false, error: error.message };
  }
};

// F15 Получение участников чата
const getChatParticipants = async (chatId) => {
  try {
    const query = `
      SELECT user_id 
      FROM chat_participants 
      WHERE chat_id = $1
    `;
    
    const result = await pool.query(query, [chatId]);
    return result.rows.map(row => row.user_id);
  } catch (error) {
    console.error('❌ Ошибка при получении участников чата:', error);
    return [];
  }
};

// F16 Проверка, являются ли пользователи контактами
const areUsersContacts = async (user1Id, user2Id) => {
  try {
    const query = `
      SELECT id 
      FROM user_contacts 
      WHERE user_id = $1 AND contact_id = $2
    `;
    
    const result = await pool.query(query, [user1Id, user2Id]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('❌ Ошибка при проверке контактов:', error);
    return false;
  }
};

// F17 Получение непрочитанных сообщений пользователя
const getUnreadMessagesCount = async (userId) => {
  try {
    const query = `
      SELECT COUNT(*) as unread_count
      FROM messages m
      INNER JOIN chat_participants cp ON m.chat_id = cp.chat_id
      WHERE cp.user_id = $1 AND m.sender_id != $1 AND m.is_read = false
    `;
    
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].unread_count);
  } catch (error) {
    console.error('❌ Ошибка при получении непрочитанных сообщений:', error);
    return 0;
  }
};

// ==================== ЭКСПОРТ ВСЕХ ФУНКЦИЙ ====================

module.exports = {
  // Основной пул
  pool,
  
  // Функции аутентификации
=======
module.exports = {
  pool,
>>>>>>> 0dd18585cf3beb9146e60a185cd7943f679b8751
  testConnection,
  upsertUserWithCode,
  verifyCode,
  getUserByEmail,
  getUserById,
  searchUsers,
<<<<<<< HEAD
  cleanupExpiredCodes,
  
  // Функции чатов и сообщений
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
=======
  cleanupExpiredCodes
>>>>>>> 0dd18585cf3beb9146e60a185cd7943f679b8751
};