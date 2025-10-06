import { useState } from 'react';
import axios from 'axios';

const ContactsList = ({ contacts, activeContact, setActiveContact, searchTerm, setSearchTerm, onAddContact }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchMessage, setSearchMessage] = useState('');

  // Функция для поиска пользователей на сервере
  const handleSearchUsers = async () => {
    if (!searchTerm.trim()) {
      setSearchMessage('Пожалуйста, введите ID или email для поиска');
      return;
    }

    setIsSearching(true);
    setSearchMessage('');

    try {
      const token = localStorage.getItem('token');
      console.log(`🔍 Поиск: "${searchTerm}", Токен:`, token ? 'есть' : 'нет');

      const response = await axios.get(
        `http://localhost:5000/api/auth/search-users?searchTerm=${encodeURIComponent(searchTerm)}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('📡 Ответ от сервера:', response.data);

      if (response.data.success) {
        setSearchResults(response.data.users || []);
        // setSearchMessage(`Найдено: ${response.data.users.length} пользователей`);
      } else {
        setSearchResults([]);
        setSearchMessage(response.data.message || 'Пользователи не найдены');
      }
    } catch (error) {
      console.error('❌ Ошибка при поиске пользователей:', error);
      setSearchResults([]);
      
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

  // Функция для добавления найденного пользователя в контакты
  const handleAddContact = (user) => {
    console.log('➕ Добавление контакта:', user);
    
    const newContact = {
      id: user.id,
      name: user.displayName || `User${user.id}`,
      email: user.email,
      avatar: user.avatar || `https://ui-avatars.com/api/?name=${user.id}&background=4294ff&color=ffffff&bold=true`,
      online: false,
      lastSeen: 'не в сети',
      messages: []
    };

    onAddContact(newContact);
    
    // Очищаем результаты поиска
    setSearchResults([]);
    setSearchTerm('');
    setSearchMessage(`Пользователь ${newContact.name} добавлен!`);
  };

  // Обработка нажатия Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearchUsers();
    }
  };

  // Фильтрация существующих контактов
  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.id.toString().includes(searchTerm)
  );

  return (
    <div className="w-full md:w-1/5 flex flex-col border-r border-slate-700">
      {/* ЗАГОЛОВОК И ПОИСК */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <h1 className="text-white font-bold text-lg flex-1">Контакты</h1>
        </div>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Введите ID или email..." 
              className="w-full bg-slate-800 text-white rounded-lg pl-3 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>
          
          <button
            onClick={handleSearchUsers}
            disabled={isSearching || !searchTerm.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg px-3 py-2 transition-colors text-sm"
            title="Найти пользователя"
          >
            {isSearching ? '...' : 'Найти чела'}
          </button>
        </div>

        {/* СООБЩЕНИЕ О РЕЗУЛЬТАТАХ ПОИСКА */}
        {searchMessage && (
          <div className={`mt-2 p-2 rounded text-xs ${
            searchMessage.includes('добавлен') 
              ? 'bg-green-500/20 text-green-300' 
              : searchMessage.includes('Найдено')
              ? 'bg-blue-500/20 text-blue-300'
              : searchMessage.includes('Ошибка')
              ? 'bg-red-500/20 text-red-300'
              : 'bg-yellow-500/20 text-yellow-300'
          }`}>
            {searchMessage}
          </div>
        )}
      </div>

      {/* ОБЛАСТЬ РЕЗУЛЬТАТОВ И КОНТАКТОВ */}
      <div className="overflow-y-auto custom-scrollbar flex-grow">
        {/* РЕЗУЛЬТАТЫ ПОИСКА */}
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
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${user.id}&background=4294ff&color=ffffff&bold=true`;
                    }}
                  />
                  <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-slate-400 border border-slate-800"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-semibold text-white truncate text-sm">
                      {user.displayName || `User${user.id}`}
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

        {/* СУЩЕСТВУЮЩИЕ КОНТАКТЫ */}
        <div>
          <div className="p-3 bg-slate-800/30">
            <h3 className="text-sm font-semibold text-slate-300">
              Мои контакты ({filteredContacts.length})
            </h3>
          </div>
          
          {filteredContacts.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm">
              {contacts.length === 0 ? 'Нет контактов' : 'Контакты не найдены'}
            </div>
          ) : (
            filteredContacts.map(contact => (
              <div 
                key={contact.id} 
                className={`flex items-center p-3 border-b border-slate-800 cursor-pointer hover:bg-slate-800 transition-all ${
                  activeContact?.id === contact.id ? 'bg-slate-800 border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => setActiveContact(contact)}
              >
                <div className="relative mr-3">
                  <img 
                    src={contact.avatar} 
                    alt={contact.name}
                    className="w-10 h-10 rounded-full"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${contact.id}&background=4294ff&color=ffffff&bold=true`;
                    }}
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
};

export default ContactsList;