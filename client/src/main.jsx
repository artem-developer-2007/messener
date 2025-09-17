import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Auth from './Auth.jsx';
import Code from './Code.jsx';
import AuthApp from './TestAnimate.jsx';
import Test from './Test1.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path='/login' element={<Auth />} />
        <Route path='/code' element={<Code />} />
        <Route path='/1' element={<AuthApp />} />
        <Route path='/test' element={<Test />} />
      </Routes>
    </Router>
  </StrictMode>
)
