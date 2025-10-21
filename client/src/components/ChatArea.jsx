import { useState } from 'react';
import picture from '../img/bird.png';

const ChatArea = ({ 
  activeContact, 
  onSendMessage, 
  typingUsers, 
  sendWebSocketMessage,
  messagesEndRef,
  onDragStart,
  onContextMenu 
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Отправка сообщения из текущего чата
  const handleSendMessage = () => {
    if (message.trim() && activeContact) {
      onSendMessage(activeContact.id, message.trim());
      setMessage('');
      
      // Останавливаем индикатор печати после отправки
      if (activeContact.chatId) {
        sendWebSocketMessage('typing_stop', { 
          chatId: activeContact.chatId, 
          contactId: activeContact.id 
        });
      }
    }
  };

  // Обработка нажатия Enter в поле ввода сообщения
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Обработка изменения текста в поле ввода
  const handleInputChange = (e) => {
    setMessage(e.target.value);
    
    // Отправляем индикатор печати при наличии текста
    if (activeContact && activeContact.chatId && e.target.value.trim()) {
      if (!isTyping) {
        setIsTyping(true);
        sendWebSocketMessage('typing_start', { 
          chatId: activeContact.chatId, 
          contactId: activeContact.id 
        });
        
        // Автоматически останавливаем индикатор через 3 секунды
        setTimeout(() => {
          setIsTyping(false);
          sendWebSocketMessage('typing_stop', { 
            chatId: activeContact.chatId, 
            contactId: activeContact.id 
          });
        }, 3000);
      }
    } else if (isTyping) {
      // Останавливаем индикатор если текст удален
      setIsTyping(false);
      sendWebSocketMessage('typing_stop', { 
        chatId: activeContact.chatId, 
        contactId: activeContact.id 
      });
    }
  };

  // Состояние когда чат не выбран
  if (!activeContact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-900 to-orange-900">
        <div className="text-center">
          <div className="w-72 h-72 flex items-center justify-center mx-auto mb-4">
            <img 
              src={picture}
              width={300}
              className='opacity-50'
              onDragStart={onDragStart}
              onContextMenu={onContextMenu}
              alt="Messenger"
            />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Выберите чат</h2>
          <p className="text-slate-400">Начните общение, выбрав контакт из списка</p>
        </div>
      </div>
    );
  }

  // Проверяем, печатает ли сейчас контакт
  const isTypingActive = typingUsers[activeContact.chatId];

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-800 to-slate-900">
      {/* Заголовок чата с информацией о контакте */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold">
                {activeContact.avatar ? (
                  <img 
                    src={activeContact.avatar} 
                    alt={activeContact.name} 
                    className="w-10 h-10 rounded-full"
                    onDragStart={onDragStart}
                    onContextMenu={onContextMenu}
                  />
                ) : (
                  activeContact.name.charAt(0)
                )}
              </div>
              {activeContact.online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-slate-800"></div>
              )}
            </div>
            <div>
              <h2 className="font-bold text-white">{activeContact.name}</h2>
              <p className="text-sm text-slate-300">
                {activeContact.online ? 'online' : `был(а) ${activeContact.lastSeen}`}
                {isTypingActive && 'печатает...'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Область отображения сообщений */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeContact.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex fade-in ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-2 ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-none'
                  : 'bg-slate-700 text-white rounded-bl-none'
              }`}
            >
              <p className="text-sm">{msg.text}</p>
              <div className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'} text-right`}>
                {msg.time}
                {msg.sender === 'user' && (
                  <span className={`ml-1 ${msg.read ? 'text-blue-300' : 'text-blue-200'}`}>
                    {msg.read ? '✓✓' : '✓'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {/* Референс для автоматической прокрутки */}
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода нового сообщения */}
      <div className="bg-slate-800 border-t border-slate-700 p-4">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Message"
              className="w-full bg-slate-700 text-white rounded-sm pl-4 pr-12 py-3 focus:outline-none resize-none"
              rows="1"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="text-white py-3 px-2 rounded-sm bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;