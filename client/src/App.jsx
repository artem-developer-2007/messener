import { useState } from 'react';
import ContactsList from './components/ContactsList';
import ChatArea from './components/ChatArea';
import Header from './components/Header';

const App = () => {
  const [activeContact, setActiveContact] = useState(null);
  const [contacts, setContacts] = useState([
    {
      id: 1,
      name: "Анна Петрова",
      online: true,
      lastSeen: "только что",
      avatar: null,
      messages: [
        { id: 1, text: "Привет! Как дела?", sender: "contact", time: "10:30", read: true },
        { id: 2, text: "Всё отлично, спасибо! А у тебя?", sender: "user", time: "10:31", read: true },
        { id: 3, text: "Тоже всё хорошо. Что планируешь на выходные?", sender: "contact", time: "10:32", read: true }
      ]
    },
    {
      id: 2,
      name: "Иван Сидоров",
      online: false,
      lastSeen: "2 часа назад",
      avatar: null,
      messages: [
        { id: 1, text: "Напомни, пожалуйста, о встрече завтра", sender: "contact", time: "вчера", read: true },
        { id: 2, text: "Конечно! В 15:00 в центральном офисе", sender: "user", time: "вчера", read: true }
      ]
    },
    {
      id: 3,
      name: "Мария Иванова",
      online: true,
      lastSeen: "только что",
      avatar: null,
      messages: [
        { id: 1, text: "Отправила тебе документы на проверку", sender: "contact", time: "15:45", read: true },
        { id: 2, text: "Получил, спасибо! Посмотрю сегодня вечером", sender: "user", time: "15:46", read: true }
      ]
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  const handleSendMessage = (contactId, messageText) => {
    setContacts(prevContacts => 
      prevContacts.map(contact => 
        contact.id === contactId 
          ? {
              ...contact,
              messages: [
                ...contact.messages,
                {
                  id: contact.messages.length + 1,
                  text: messageText,
                  sender: "user",
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  read: true
                }
              ]
            }
          : contact
      )
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ContactsList 
          contacts={contacts}
          activeContact={activeContact}
          setActiveContact={setActiveContact}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
        <ChatArea 
          activeContact={activeContact}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
};

export default App;