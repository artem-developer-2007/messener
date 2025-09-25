import { useState, useRef, useEffect } from 'react';
import picture from '../img/robot.png'

const ChatArea = ({ activeContact, onSendMessage }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeContact?.messages]);

  const handleSendMessage = () => {
    if (message.trim() && activeContact) {
      onSendMessage(activeContact.id, message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

    const handleDragStart = (e) => {
    e.preventDefault();
  };

  //
  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  if (!activeContact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-72 h-72 flex items-center justify-center mx-auto mb-4">
            <img src={picture}
            className='opacity-25'
            onDragStart={handleDragStart}
            onContextMenu={handleContextMenu}/>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Выберите чат</h2>
          <p className="text-slate-400">Начните общение, выбрав контакт из списка</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-800 to-slate-900">
      {/* Заголовок чата */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold">
                {activeContact.avatar ? (
                  <img src={activeContact.avatar} alt={activeContact.name} className="w-10 h-10 rounded-full" />
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
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button className="p-2 rounded-full hover:bg-slate-700 transition-colors">
              <i className="fas fa-phone text-slate-300"></i>
            </button>
            <button className="p-2 rounded-full hover:bg-slate-700 transition-colors">
              <i className="fas fa-video text-slate-300"></i>
            </button>
            <button className="p-2 rounded-full hover:bg-slate-700 transition-colors">
              <i className="fas fa-ellipsis-v text-slate-300"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Область сообщений */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
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
                  <i className={`ml-1 fas fa-${msg.read ? 'check-double text-blue-300' : 'check'}`}></i>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода сообщения */}
      <div className="bg-slate-800 border-t border-slate-700 p-4">
        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-full hover:bg-slate-700 transition-colors">
            <i className="fas fa-plus text-slate-300"></i>
          </button>
          <button className="p-2 rounded-full hover:bg-slate-700 transition-colors">
            <i className="fas fa-paperclip text-slate-300"></i>
          </button>
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Введите сообщение..."
              className="w-full bg-slate-700 text-white rounded-2xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows="1"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <i className="fas fa-paper-plane text-white"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;