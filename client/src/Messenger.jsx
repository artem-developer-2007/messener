import { useState, useEffect } from 'react';
import ContactsList from './components/ContactsList';
import ChatArea from './components/ChatArea';

const Messenger = () => {
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ЗАГРУЗКА КОНТАКТОВ ИЗ LOCALSTORAGE ПРИ ЗАПУСКЕ
  useEffect(() => {
    const savedContacts = localStorage.getItem('messengerContacts');
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    }
  }, []);

  // СОХРАНЕНИЕ КОНТАКТОВ В LOCALSTORAGE ПРИ ИЗМЕНЕНИИ
  useEffect(() => {
    localStorage.setItem('messengerContacts', JSON.stringify(contacts));
  }, [contacts]);

  // ФУНКЦИЯ ДОБАВЛЕНИЯ НОВОГО КОНТАКТА
  const handleAddContact = (newContact) => {
    // Проверяем, существует ли уже контакт с таким ID
    const contactExists = contacts.some(contact => contact.id === newContact.id);
    
    if (!contactExists) {
      setContacts(prevContacts => [...prevContacts, newContact]);
      return true;
    } else {
      console.log('Контакт уже существует');
      return false;
    }
  };

  // ФУНКЦИЯ ОТПРАВКИ СООБЩЕНИЯ
  const handleSendMessage = (contactId, messageText) => {
    const newMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    setContacts(prevContacts =>
      prevContacts.map(contact =>
        contact.id === contactId
          ? {
              ...contact,
              messages: [...contact.messages, newMessage]
            }
          : contact
      )
    );

    // Если активный контакт - обновляем его тоже
    if (activeContact && activeContact.id === contactId) {
      setActiveContact(prev => ({
        ...prev,
        messages: [...prev.messages, newMessage]
      }));
    }

    // Здесь можно добавить логику отправки сообщения на сервер
    console.log(`Отправка сообщения контакту ${contactId}: ${messageText}`);
  };

  return (
    <div className="flex h-screen bg-slate-900">
      <ContactsList
        contacts={contacts}
        activeContact={activeContact}
        setActiveContact={setActiveContact}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onAddContact={handleAddContact}
      />
      <ChatArea
        activeContact={activeContact}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default Messenger;