const { Pool } = require('pg');
require('dotenv').config();

// Создаем пул соединений с PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'your_database_name',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
});

// Функция для проверки подключения
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL подключен успешно');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к PostgreSQL:', error.message);
    return false;
  }
};

// Функция для создания/обновления пользователя и кода
const upsertUserWithCode = async (email, verificationCode, codeExpiresAt) => {
  try {
    const query = `
      INSERT INTO email (email, verification_code, code_expires_at, is_verified, login_attempts)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) 
      DO UPDATE SET 
        verification_code = EXCLUDED.verification_code,
        code_expires_at = EXCLUDED.code_expires_at,
        is_verified = EXCLUDED.is_verified,
        login_attempts = EXCLUDED.login_attempts,
        created_at = CASE 
          WHEN email.id IS NULL THEN NOW() 
          ELSE email.created_at 
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
        [email]
      );
      return { success: false, message: 'Неверный код или код истек' };
    }
    
    const user = checkResult.rows[0];
    
    // Проверяем количество попыток
    if (user.login_attempts >= 5) {
      return { success: false, message: 'Слишком много неудачных попыток. Запросите новый код.' };
    }
    
    // Если код верный - обновляем статус пользователя
    const updateQuery = `
      UPDATE email 
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

// Функция для получения пользователя по email
const getUserByEmail = async (email) => {
  try {
    const result = await pool.query(
      'SELECT * FROM email WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Ошибка при получении пользователя:', error);
    return null;
  }
};

// Функция для получения пользователя по ID
const getUserById = async (userId) => {
  try {
    const result = await pool.query(
      'SELECT id, email, is_verified, last_login, created_at FROM email WHERE id = $1',
      [userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Ошибка при получении пользователя по ID:', error);
    return null;
  }
};

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
    
    return result.rows;
  } catch (error) {
    console.error('❌ Ошибка при поиске пользователей:', error);
    return [];
  }
};

// Функция для очистки устаревших кодов
const cleanupExpiredCodes = async () => {
  try {
    const result = await pool.query(
      'UPDATE email SET verification_code = NULL, code_expires_at = NULL WHERE code_expires_at < NOW()'
    );
    console.log(`🧹 Очищено ${result.rowCount} устаревших кодов`);
    return result.rowCount;
  } catch (error) {
    console.error('❌ Ошибка при очистке кодов:', error);
    return 0;
  }
};

module.exports = {
  pool,
  testConnection,
  upsertUserWithCode,
  verifyCode,
  getUserByEmail,
  getUserById,
  searchUsers,
  cleanupExpiredCodes
};