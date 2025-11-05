import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './Auth.jsx';
import Messenger from './Messenger.jsx';
import ElectronWrapper from './components/ElectronWrapper.jsx';

// Компонент для защиты маршрутов
const ProtectedRouteMess = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

// Компонент-обертка для Electron
const AppWithElectron = ({ children }) => {
  // Если мы в Electron, оборачиваем в ElectronWrapper
  if (window.electronAPI) {
    return <ElectronWrapper>{children}</ElectronWrapper>;
  }
  
  // В браузере - просто возвращаем children
  return children;
};

// Основной компонент приложения
const App = () => {
  return (
    <Router>
      <Routes>
        <Route 
          path='/login' 
          element={
            <AppWithElectron>
              <Auth />
            </AppWithElectron>
          } 
        />
        <Route 
          path='/messenger1' 
          element={
            <AppWithElectron>
              <Messenger />
            </AppWithElectron>
          } 
        />
        <Route 
          path='/messenger'
          element={
            <ProtectedRouteMess>
              <AppWithElectron>
                <Messenger />
              </AppWithElectron>
            </ProtectedRouteMess>
          } 
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);