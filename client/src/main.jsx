import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './Auth.jsx';
import Messenger from './Messenger.jsx';

// Компонент для защиты маршрутов
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path='/login' element={<Auth />} />
        <Route path='/messenger1' element={<Messenger />} />
        <Route 
          path='/messenger'  // УБРАЛИ :userId
          element={
            <ProtectedRoute>
              <Messenger />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  </StrictMode>
)