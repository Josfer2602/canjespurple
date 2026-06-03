import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import React from 'react';
import AdminDashboard from './pages/AdminDashboard';
import AdminProjects from './pages/AdminProjects';
import AdminInventory from './pages/AdminInventory';
import AdminRules from './pages/AdminRules';
import AdminPoints from './pages/AdminPoints';
import AdminStaff from './pages/AdminStaff';
import AdminProjectConfig from './pages/AdminProjectConfig';
import AdminRedemptions from './pages/AdminRedemptions';
import AdminVisits from './pages/AdminVisits';
import VisitForm from './pages/VisitForm';
import RedemptionForm from './pages/RedemptionForm';
import StaffHome from './pages/StaffHome';
import StaffHistory from './pages/StaffHistory';
import Login from './pages/Login';
import ClientScanner from './pages/ClientScanner';
import PdvHome from './pages/PdvHome';
import { Toaster } from 'react-hot-toast';
import './index.css'

// Simple Auth Guard inline
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'PDV') return <Navigate to="/pdv" replace />;
    const isAdminType = ['ADMIN', 'CLIENTE', 'SUPERVISOR'].includes(user.role);
    return <Navigate to={isAdminType ? '/admin' : '/staff'} replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '16px',
            background: '#333',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            padding: '16px 24px'
          },
          success: { style: { background: '#00bcd4' } },
          error: { style: { background: '#ef4444' } },
        }}
      />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Public B2B2C Scanner Route */}
          <Route path="/qr/:pointId" element={<ClientScanner />} />

          {/* PDV Approval Tray Route */}
          <Route path="/pdv" element={<ProtectedRoute allowedRoles={['PDV']}><PdvHome /></ProtectedRoute>} />

          {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN', 'CLIENTE', 'SUPERVISOR']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/asistencias" element={<ProtectedRoute allowedRoles={['ADMIN', 'CLIENTE', 'SUPERVISOR']}><AdminVisits /></ProtectedRoute>} />
        <Route path="/admin/proyectos" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminProjects /></ProtectedRoute>} />
        <Route path="/admin/reglas" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminRules /></ProtectedRoute>} />
        <Route path="/admin/inventario" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR']}><AdminInventory /></ProtectedRoute>} />
        <Route path="/admin/puntos" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminPoints /></ProtectedRoute>} />
        <Route path="/admin/personal" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminStaff /></ProtectedRoute>} />
        <Route path="/admin/config" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminProjectConfig /></ProtectedRoute>} />
        <Route path="/admin/ajustes" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminProjectConfig /></ProtectedRoute>} />
        <Route path="/admin/canjes" element={<ProtectedRoute allowedRoles={['ADMIN', 'CLIENTE', 'SUPERVISOR']}><AdminRedemptions /></ProtectedRoute>} />

        {/* Staff Routes */}
        <Route path="/staff" element={<ProtectedRoute allowedRoles={['STAFF']}><StaffHome /></ProtectedRoute>} />
        <Route path="/visita/iniciar" element={<ProtectedRoute allowedRoles={['STAFF']}><VisitForm /></ProtectedRoute>} />
        <Route path="/canje/nuevo" element={<ProtectedRoute allowedRoles={['STAFF']}><RedemptionForm /></ProtectedRoute>} />
        <Route path="/canjes/historial" element={<ProtectedRoute allowedRoles={['STAFF']}><StaffHistory /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
    </>);
}

export default App;
