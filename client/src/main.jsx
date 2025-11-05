import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './Auth.jsx';
import Messenger from './Messenger.jsx';
<<<<<<< HEAD
import ElectronWrapper from './components/ElectronWrapper.jsx';

// Компонент для защиты маршрутов
const ProtectedRouteMess = ({ children }) => {
=======

// Компонент для защиты маршрутов
const ProtectedRoute = ({ children }) => {
>>>>>>> 0dd18585cf3beb9146e60a185cd7943f679b8751
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

<<<<<<< HEAD
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
=======
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path='/login' element={<Auth />} />
        <Route path='/messenger1' element={<Messenger />} />
        <Route 
          path='/messenger'
          element={
            <ProtectedRoute>
              <Messenger />
            </ProtectedRoute>
>>>>>>> 0dd18585cf3beb9146e60a185cd7943f679b8751
          } 
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
<<<<<<< HEAD
  );
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
=======
  </StrictMode>
)
>>>>>>> 0dd18585cf3beb9146e60a185cd7943f679b8751
