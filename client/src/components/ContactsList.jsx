const ContactsList = ({ contacts, activeContact, setActiveContact, searchTerm, setSearchTerm }) => {
  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLastMessage = (contact) => {
    return contact.messages.length > 0 
      ? contact.messages[contact.messages.length - 1].text
      : 'Нет сообщений';
  };

  const getLastMessageTime = (contact) => {
    return contact.messages.length > 0 
      ? contact.messages[contact.messages.length - 1].time
      : '';
  };

  return (
    <div className="w-full md:w-1/5 flex flex-col border-r border-slate-700">
      <div className="p-4 border-b border-slate-700">
        <div className="relative flex gap-3">
          <h1>...</h1>
          <input 
            type="text" 
            placeholder="Поиск контактов..." 
            className="w-full bg-slate-800 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <i className="fas fa-search absolute left-8 top-3 text-slate-400"></i>
        </div>
      </div>
      
      <div className="overflow-y-auto custom-scrollbar flex-grow">
        {filteredContacts.map(contact => (
          <div 
            key={contact.id} 
            className={`flex items-center p-4 border-b border-slate-800 cursor-pointer hover:bg-slate-800 transition-all ${
              activeContact?.id === contact.id ? 'bg-slate-800 border-l-4 border-l-blue-500' : ''
            }`}
            onClick={() => setActiveContact(contact)}
          >
            <div className="relative mr-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold">
                {contact.avatar ? (
                  <img src={contact.avatar} alt={contact.name} className="w-12 h-12 rounded-full" />
                ) : (
                  contact.name.charAt(0)
                )}
              </div>
              {contact.online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-slate-900"></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-semibold text-white truncate">{contact.name}</h3>
                <span className="text-xs text-slate-400">{getLastMessageTime(contact)}</span>
              </div>
              <p className="text-sm text-slate-300 truncate">{getLastMessage(contact)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContactsList;