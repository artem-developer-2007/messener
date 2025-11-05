// client/src/components/ElectronWrapper.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ElectronWrapper = ({ children }) => {
  const [backendUrl, setBackendUrl] = useState('');
  const [isElectron, setIsElectron] = useState(false);
  const [environment, setEnvironment] = useState(null);
  const [showHeader, setShowHeader] = useState(false); // Новое состояние

  useEffect(() => {
    // Проверяем, работаем ли в Electron
    if (window.electronAPI) {
      setIsElectron(true);
      
      // Получаем информацию о среде
      window.electronAPI.getEnvironment().then(env => {
        setEnvironment(env);
        console.log('Electron environment:', env);
        
        // Показываем заголовок только в production или по желанию
        // setShowHeader(!env.isDev); // Раскомментируйте эту строку чтобы скрыть в development
        setShowHeader(false); // Скрываем всегда, или установите true чтобы показывать
      });

      // Получаем URL бэкенда
      window.electronAPI.getBackendUrl().then(url => {
        setBackendUrl(url);
        axios.defaults.baseURL = url;
        console.log('Backend URL set to:', url);
      }).catch(error => {
        console.error('Failed to get backend URL:', error);
        const fallbackUrl = 'http://localhost:3000';
        setBackendUrl(fallbackUrl);
        axios.defaults.baseURL = fallbackUrl;
      });
    } else {
      // В браузере используем стандартный URL
      console.log('Running in browser mode');
      const browserUrl = 'http://localhost:3000';
      setBackendUrl(browserUrl);
      axios.defaults.baseURL = browserUrl;
    }
  }, []);

  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeWindow();
    }
  };

  if (isElectron && !backendUrl) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div>Loading Electron App...</div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Backend: Connecting...
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Показываем заголовок только если showHeader = true */}
      {isElectron && showHeader && (
        <div style={{
          padding: '8px 16px',
          background: '#2d3748',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          WebkitAppRegion: 'drag',
          flexShrink: 0
        }}>
          <div style={{ fontSize: '14px', fontWeight: '500' }}>
            Messenger Desktop {environment?.isDev ? '(Development)' : ''}
          </div>
          <div style={{ display: 'flex', gap: '8px', WebkitAppRegion: 'no-drag' }}>
            <button 
              onClick={handleMinimize}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '16px',
                lineHeight: '1'
              }}
              onMouseOver={(e) => e.target.style.background = '#4a5568'}
              onMouseOut={(e) => e.target.style.background = 'none'}
            >
              _
            </button>
            <button 
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '16px',
                lineHeight: '1'
              }}
              onMouseOver={(e) => e.target.style.background = '#e53e3e'}
              onMouseOut={(e) => e.target.style.background = 'none'}
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* Информация о среде - тоже можно скрыть */}
      {isElectron && environment?.isDev && false && ( // установите false чтобы скрыть
        <div style={{
          padding: '2px 8px',
          background: '#e53e3e',
          color: 'white',
          fontSize: '10px',
          textAlign: 'center',
          flexShrink: 0
        }}>
          Electron Development Mode | Backend: {backendUrl} | Platform: {environment?.platform}
        </div>
      )}
      
      {/* Основной контент */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
};

export default ElectronWrapper;