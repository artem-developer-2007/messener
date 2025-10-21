import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ChatArea from './components/ChatArea';

const Messenger = () => {
  // ==================== СОСТОЯНИЯ КОМПОНЕНТА ====================
  
  // Список контактов пользователя
  const [contacts, setContacts] = useState([]);
  // Текущий активный чат
  const [activeContact, setActiveContact] = useState(null);
  // Поисковый запрос для поиска пользователей
  const [searchTerm, setSearchTerm] = useState('');
  // WebSocket соединение
  const [socket, setSocket] = useState(null);
  // Флаг процесса поиска
  const [isSearching, setIsSearching] = useState(false);
  // Результаты поиска пользователей
  const [searchResults, setSearchResults] = useState([]);
  // Сообщение о статусе поиска
  const [searchMessage, setSearchMessage] = useState('');
  // Информация о текущем пользователе
  const [userInfo, setUserInfo] = useState(null);
  // Пользователи, которые печатают в реальном времени
  const [typingUsers, setTypingUsers] = useState({});

  // Референс для автоматической прокрутки к последнему сообщению
  const messagesEndRef = useRef(null);

  // ==================== WEB SOCKET РЕАЛЬНОГО ВРЕМЕНИ ====================

  // Инициализация WebSocket соединения при монтировании компонента
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    // Проверяем наличие токена и ID пользователя
    if (!token || !userId) {
      console.log('❌ Нет токена или ID пользователя');
      return;
    }

    // Создаем новое WebSocket соединение с токеном авторизации
    const ws = new WebSocket(`ws://localhost:5000?token=${token}`);
    
    // Обработчик успешного подключения
    ws.onopen = () => {
      console.log('✅ WebSocket подключен');
      setSocket(ws);
    };
    
    // Обработчик входящих сообщений
    ws.onmessage = (event) => {
      try {
        // Парсим JSON сообщение от сервера
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('❌ Ошибка парсинга WebSocket сообщения:', error);
      }
    };
    
    // Обработчик закрытия соединения
    ws.onclose = () => {
      console.log('❌ WebSocket отключен');
      setSocket(null);
    };
    
    // Обработчик ошибок соединения
    ws.onerror = (error) => {
      console.error('❌ WebSocket ошибка:', error);
    };

    // Функция очистки при размонтировании компонента
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  // Обработка различных типов WebSocket сообщений
  const handleWebSocketMessage = (message) => {
    console.log('📨 WebSocket сообщение:', message);
    
    switch (message.type) {
      case 'new_message':
        // Новое сообщение в чате
        handleNewMessage(message.data);
        break;
      
      case 'messages_read':
        // Сообщения отмечены как прочитанные
        handleMessagesRead(message.data);
        break;
      
      case 'typing_start':
        // Пользователь начал печатать
        handleTypingStart(message.data);
        break;
      
      case 'typing_stop':
        // Пользователь закончил печатать
        handleTypingStop(message.data);
        break;
      
      case 'connection_established':
        // Подтверждение установки соединения
        console.log('✅ WebSocket соединение установлено');
        break;
      
      default:
        console.log('❓ Неизвестный тип сообщения:', message.type);
    }
  };

  // Обработка нового сообщения от другого пользователя
  const handleNewMessage = (messageData) => {
    const { chatId, senderId, messageText, createdAt } = messageData;
    const currentUserId = parseInt(localStorage.getItem('userId'));
    
    // Обновляем список контактов, добавляя новое сообщение
    setContacts(prevContacts =>
      prevContacts.map(contact => {
        if (contact.id === senderId) {
          // Форматируем новое сообщение
          const newMessage = {
            id: Date.now(),
            text: messageText,
            sender: senderId === currentUserId ? 'user' : 'contact',
            time: new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: senderId === currentUserId, // Свои сообщения сразу помечаем как прочитанные
            chatId: chatId
          };
          
          // Обновляем данные контакта
          const updatedContact = {
            ...contact,
            messages: [...contact.messages, newMessage],
            lastMessage: messageText,
            lastMessageTime: new Date(createdAt)
          };
          
          // Если это активный контакт - обновляем его состояние
          if (activeContact && activeContact.id === senderId) {
            setActiveContact(updatedContact);
            
            // Отмечаем сообщения как прочитанные, если они не от нас
            if (senderId !== currentUserId) {
              markMessagesAsRead(chatId);
            }
          }
          
          return updatedContact;
        }
        return contact;
      })
    );
  };

  // Обработка отметки сообщений как прочитанных
  const handleMessagesRead = (data) => {
    const { chatId, readerId } = data;
    const currentUserId = parseInt(localStorage.getItem('userId'));
    
    // Обновляем статус прочтения только для сообщений не от текущего пользователя
    if (readerId !== currentUserId) {
      setContacts(prevContacts =>
        prevContacts.map(contact => {
          if (contact.chatId === chatId) {
            return {
              ...contact,
              messages: contact.messages.map(msg => ({
                ...msg,
                read: true
              }))
            };
          }
          return contact;
        })
      );
      
      // Обновляем активный контакт если нужно
      if (activeContact && activeContact.chatId === chatId) {
        setActiveContact(prev => ({
          ...prev,
          messages: prev.messages.map(msg => ({
            ...msg,
            read: true
          }))
        }));
      }
    }
  };

  // Обработка начала печати пользователем
  const handleTypingStart = (data) => {
    const { chatId, userId } = data;
    // Добавляем пользователя в список печатающих
    setTypingUsers(prev => ({
      ...prev,
      [chatId]: userId
    }));
  };

  // Обработка окончания печати пользователем
  const handleTypingStop = (data) => {
    const { chatId } = data;
    // Удаляем пользователя из списка печатающих
    setTypingUsers(prev => {
      const newTyping = { ...prev };
      delete newTyping[chatId];
      return newTyping;
    });
  };

  // Утилита для отправки сообщений через WebSocket
  const sendWebSocketMessage = (type, data) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, data }));
    } else {
      console.error('❌ WebSocket не подключен');
    }
  };

  // ==================== ЗАГРУЗКА ДАННЫХ С СЕРВЕРА ====================

  // Загрузка информации о текущем пользователе
  const loadUserInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      
      const response = await axios.get(`http://localhost:5000/api/auth/user-info/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setUserInfo(response.data.user);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки информации о пользователе:', error);
    }
  };

  // Загрузка списка контактов пользователя
  const loadContacts = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get('http://localhost:5000/api/contacts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        // Форматируем контакты с начальными значениями
        const contactsWithMessages = response.data.contacts.map(contact => ({
          ...contact,
          messages: [],
          online: false,
          lastSeen: 'не в сети',
          chatId: null // Будет установлен при первом сообщении
        }));
        
        setContacts(contactsWithMessages);
        
        // Загружаем историю сообщений для каждого контакта
        contactsWithMessages.forEach(contact => {
          loadChatHistory(contact.id);
        });
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки контактов:', error);
    }
  };

  // Загрузка истории сообщений для конкретного контакта
  const loadChatHistory = async (contactId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Получаем список всех чатов пользователя
      const chatResponse = await axios.get('http://localhost:5000/api/chats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (chatResponse.data.success) {
        // Ищем чат с нужным контактом
        const chat = chatResponse.data.chats.find(chat => 
          chat.contact.id === contactId
        );
        
        if (chat) {
          // Загружаем сообщения найденного чата
          const messagesResponse = await axios.get(`http://localhost:5000/api/messages/${chat.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (messagesResponse.data.success) {
            // Форматируем сообщения для отображения
            const formattedMessages = messagesResponse.data.messages.map(msg => ({
              id: msg.id,
              text: msg.text,
              sender: msg.isOwn ? 'user' : 'contact',
              time: new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              read: msg.isRead,
              chatId: chat.id
            }));
            
            // Обновляем контакт с загруженными сообщениями
            setContacts(prevContacts =>
              prevContacts.map(contact =>
                contact.id === contactId
                  ? { 
                      ...contact, 
                      messages: formattedMessages,
                      chatId: chat.id,
                      lastMessage: formattedMessages[formattedMessages.length - 1]?.text || '',
                      lastMessageTime: formattedMessages[formattedMessages.length - 1]?.time || ''
                    }
                  : contact
              )
            );
            
            // Обновляем активный контакт если он выбран
            if (activeContact && activeContact.id === contactId) {
              setActiveContact(prev => ({
                ...prev,
                messages: formattedMessages,
                chatId: chat.id
              }));
            }
          }
        }
      }
    } catch (error) {
      console.error(`❌ Ошибка загрузки истории чата с ${contactId}:`, error);
    }
  };

  // ==================== ПОИСК И ДОБАВЛЕНИЕ КОНТАКТОВ ====================

  // Поиск пользователей по ID или email
  const handleSearchUsers = async () => {
    if (!searchTerm.trim()) {
      setSearchMessage('Пожалуйста, введите ID или email для поиска');
      return;
    }

    setIsSearching(true);
    setSearchMessage('');

    try {
      const token = localStorage.getItem('token');

      const response = await axios.get(
        `http://localhost:5000/api/auth/search-users?searchTerm=${encodeURIComponent(searchTerm)}`, 
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setSearchResults(response.data.users || []);
      } else {
        setSearchResults([]);
        setSearchMessage(response.data.message || 'Пользователи не найдены');
      }
    } catch (error) {
      console.error('❌ Ошибка при поиске пользователей:', error);
      setSearchResults([]);
      
      // Обработка различных типов ошибок
      if (error.response) {
        setSearchMessage(`Ошибка: ${error.response.data.message || error.response.status}`);
      } else if (error.request) {
        setSearchMessage('Нет ответа от сервера');
      } else {
        setSearchMessage('Ошибка подключения');
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Добавление пользователя в контакты
  const handleAddContact = async (user) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.post('http://localhost:5000/api/contacts/add', {
        contactId: user.id
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        // Создаем новый объект контакта
        const newContact = {
          id: user.id,
          name: user.displayName || `User${user.id}`,
          email: user.email,
          avatar: user.avatar,
          online: false,
          lastSeen: 'не в сети',
          messages: [],
          chatId: null
        };

        // Добавляем контакт в список
        setContacts(prevContacts => [...prevContacts, newContact]);
        
        // Очищаем результаты поиска
        setSearchResults([]);
        setSearchTerm('');
        setSearchMessage(`Пользователь ${newContact.name} добавлен!`);
        
        console.log('✅ Контакт добавлен:', newContact);
      } else {
        setSearchMessage(response.data.message || 'Ошибка добавления контакта');
      }
    } catch (error) {
      console.error('❌ Ошибка при добавлении контакта:', error);
      setSearchMessage('Ошибка при добавлении контакта');
    }
  };

  // ==================== УПРАВЛЕНИЕ СООБЩЕНИЯМИ ====================

  // Отправка нового сообщения
  const handleSendMessage = async (contactId, messageText) => {
    if (!messageText.trim()) return;

    try {
      // Получаем или создаем чат
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/chats/get-or-create', {
        contactId: contactId
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const chatId = response.data.chatId;

      console.log('🔍 Проверка перед отправкой:', {
        socketExists: !!socket,
        socketState: socket?.readyState,
        contactId,
        messageText
      });

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.error('❌ WebSocket не доступен!');
        alert('WebSocket соединение потеряно. Перезагрузите страницу.');
        return;
      }

      // Отправляем сообщение через WebSocket для реального времени
      sendWebSocketMessage('send_message', {
        chatId: chatId,
        contactId: contactId,
        messageText: messageText.trim()
      });

      // Локально добавляем сообщение для мгновенного отображения (optimistic update)
      const newMessage = {
        id: Date.now(),
        text: messageText.trim(),
        sender: 'user',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
        chatId: chatId
      };

      // Обновляем список контактов
      setContacts(prevContacts =>
        prevContacts.map(contact =>
          contact.id === contactId
            ? {
                ...contact,
                messages: [...contact.messages, newMessage],
                lastMessage: messageText.trim(),
                lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                chatId: chatId
              }
            : contact
        )
      );

      // Обновляем активный контакт
      if (activeContact && activeContact.id === contactId) {
        setActiveContact(prev => ({
          ...prev,
          messages: [...prev.messages, newMessage],
          chatId: chatId
        }));
      }
    } catch (error) {
      console.error('❌ Ошибка при отправке сообщения:', error);
    }
  };

  // Отметка сообщений как прочитанных
  const markMessagesAsRead = (chatId) => {
    if (chatId) {
      sendWebSocketMessage('mark_as_read', { chatId });
    }
  };

  // ==================== ВСПОМОГАТЕЛЬНЫЕ UX ФУНКЦИИ ====================

  // Автоматическая прокрутка к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Прокручиваем при изменении сообщений
  useEffect(() => {
    scrollToBottom();
  }, [activeContact?.messages]);

  // Защита от перетаскивания изображений
  const handleDragStart = (e) => {
    e.preventDefault();
  };

  // Защита от контекстного меню
  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  // Обработка нажатия Enter в поле поиска
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearchUsers();
    }
  };

  // ==================== ЗАГРУЗКА ДАННЫХ ПРИ ЗАПУСКЕ ====================

  // Загружаем данные при первоначальном монтировании компонента
  useEffect(() => {
    loadUserInfo();
    loadContacts();
  }, []);

  // ==================== КОМПОНЕНТЫ ИНТЕРФЕЙСА ====================

  // Компонент списка контактов (левая панель)
  const ContactsList = () => (
    <div className="w-full md:w-1/3 lg:w-1/4 flex flex-col border-r border-slate-700 bg-slate-900">
      {/* Заголовок и поиск */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <h1 className="text-white font-bold text-lg flex-1">Контакты</h1>
          {userInfo && (
            <div className="text-sm text-slate-400">
              ID: {userInfo.id}
            </div>
          )}
        </div>
        
        {/* Поле поиска и кнопка */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Введите id или email" 
              className="w-full bg-slate-800 text-white rounded-sm pl-3 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>
          
          <button
            onClick={handleSearchUsers}
            disabled={isSearching || !searchTerm.trim()}
            className="bg-gradient-to-r from-blue-400 to-blue-600 disabled:opacity-50 text-white rounded-sm px-3 py-2 transition-colors text-sm hover:cursor-pointer"
          >
            {isSearching ? '...' : 'Найти'}
          </button>
        </div>

        {/* Сообщение о результатах поиска */}
        {searchMessage && (
          <div className={`mt-2 p-2 rounded text-xs ${
            searchMessage.includes('добавлен') 
              ? 'bg-green-500/20 text-green-300' 
              : searchMessage.includes('Найдено')
              ? 'bg-blue-500/20 text-blue-300'
              : 'bg-yellow-500/20 text-yellow-300'
          }`}>
            {searchMessage}
          </div>
        )}
      </div>

      {/* Область результатов и контактов */}
      <div className="overflow-y-auto flex-grow">
        {/* Результаты поиска */}
        {searchResults.length > 0 && (
          <div className="border-b border-slate-600 mb-4">
            <div className="p-3 bg-slate-800/50">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">
                Результаты поиска ({searchResults.length})
              </h3>
            </div>
            {searchResults.map(user => (
              <div 
                key={`search-${user.id}`} 
                className="flex items-center p-3 border-b border-slate-700 cursor-pointer hover:bg-slate-800 transition-all bg-slate-800/30"
                onClick={() => handleAddContact(user)}
              >
                <div className="relative mr-3">
                  <img 
                    src={user.avatar} 
                    alt={user.displayName}
                    className="w-10 h-10 rounded-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-semibold text-white truncate text-sm">
                      {user.displayName}
                    </h3>
                    <span className="text-xs text-blue-400">ID: {user.id}</span>
                  </div>
                  <p className="text-xs text-slate-300 truncate">{user.email}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddContact(user);
                  }}
                  className="ml-2 bg-green-500 hover:bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                  title="Добавить в контакты"
                >
                  <span className="text-xs">+</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Существующие контакты */}
        <div>
          <div className="p-3 bg-slate-800/30">
            <h3 className="text-sm font-semibold text-slate-300">
              Мои контакты ({contacts.length})
            </h3>
          </div>
          
          {contacts.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm">
              {contacts.length === 0 ? 'Нет контактов' : 'Контакты не найдены'}
            </div>
          ) : (
            contacts.map(contact => (
              <div 
                key={contact.id} 
                className={`flex items-center p-3 border-b border-slate-800 cursor-pointer hover:bg-slate-800 transition-all ${
                  activeContact?.id === contact.id ? 'bg-slate-800' : ''
                }`}
                onClick={() => setActiveContact(contact)}
              >
                <div className="relative mr-3">
                  <img 
                    src={contact.avatar} 
                    alt={contact.name}
                    className="w-10 h-10 rounded-full"
                  />
                  {contact.online && (
                    <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 border-2 border-slate-900"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-semibold text-white truncate text-sm">{contact.name}</h3>
                    <span className="text-xs text-slate-400">ID: {contact.id}</span>
                  </div>
                  <p className="text-xs text-slate-300 truncate">
                    {contact.messages.length > 0 
                      ? contact.messages[contact.messages.length - 1].text
                      : 'Нет сообщений'
                    }
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // ==================== ОСНОВНОЙ РЕНДЕР КОМПОНЕНТА ====================

  return (
    <div className="flex h-screen bg-slate-900">
      <ContactsList />
      <ChatArea 
        activeContact={activeContact}
        onSendMessage={handleSendMessage}
        typingUsers={typingUsers}
        sendWebSocketMessage={sendWebSocketMessage}
        messagesEndRef={messagesEndRef}
        onDragStart={handleDragStart}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
};

export default Messenger;