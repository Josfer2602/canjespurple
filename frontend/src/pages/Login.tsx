import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2 } from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.png';

import toast from 'react-hot-toast';

/**
 * Componente LoginPage
 * 
 * Punto de entrada principal para la autenticación de usuarios.
 * Recopila credenciales (email/contraseña), se comunica con la API de autenticación,
 * y redirige al usuario a la vista correspondiente según su rol (Admin o Staff)
 * guardando datos clave (token y usuario) en el almacenamiento local.
 */
const LoginPage: React.FC = () => {
  // Manejo del estado local para los campos del formulario y el feedback de red
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // Bloquea el botón e interfaz al cargar
  const [error, setError] = useState(''); // Muestra mensajes de error en credenciales/conexión
  const navigate = useNavigate(); // Hook para cambiar de vista tras un login exitoso


  /**
   * handleLogin
   * Se ejecuta al enviar el formulario.
   * Evita la recarga por defecto e intenta iniciar sesión.
   * Dependiendo de la respuesta setea variables locales o errores.
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Previene recargar la página en submit
    setLoading(true);
    setError('');

    try {
      // 1. Intentamos login real interactuando con el endpoint Auth de nuestro backend
      const response = await api.post('/auth/login', { email, password });

      // Extraemos información clave devuelta por nuestra API
      const { token, user, project } = response.data;

      // Persistimos los datos localmente para uso en próximas visitas y comprobaciones de permisos
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (project) {
        localStorage.setItem('project', JSON.stringify(project));
      }

      // Notificamos al usuario del éxito
      toast.success(`¡Bienvenido, ${user.fullName}!`);

      // Redirigimos dependiendo del rol (Admins a dashboard de control, Staff a su operación en campo)
      if (user.role === 'PDV') {
        navigate('/pdv');
      } else if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
        navigate('/admin');
      } else {
        navigate('/staff');
      }

    } catch (err: any) {
      console.error(err);
      // Validar si es un error de autorización (datos incorrectos)
      if (err.response?.status === 401) {
        setError('Credenciales incorrectas');
      } else {
        // Fallback genérico por si no hay conexión al backend
        setError('Servidor no disponible. Revisa conexión y Backend.');
      }
    } finally {
      // Siempre detenemos el spinner de carga
      setLoading(false);
    }
  };

  return (
    // Contenedor principal que centra los objetos y provee fondo
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-6 pb-20">
      
      {/* Contenedor central (logo, títulos y tarjeta de formulario) */}
      <div className="w-full max-w-md space-y-8 animate-in">
        
        {/* Cabecera, logo y branding y titulo de app */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/10 mb-6 border border-slate-100">
            <img src={logo} alt="Logo" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic">BTL SaaS</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">Gestión & Auditoría</p>
        </div>

        {/* Tarjeta translúcida principal con el Formulario de inicio de sesión */}
        <div className="glass-card p-10 space-y-6 relative overflow-hidden backdrop-blur-2xl">
          {/* Adorno decorativo superior derecho */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Campo correo electrónico */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="email"
                  className="form-input pl-12"
                  placeholder="staff@purplebtl.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="password"
                  className="form-input pl-12"
                  placeholder="btl12345"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Componente condicional: Si hay error muestra este recuadro rojizo */}
            {error && (
              <div className="bg-red-50 text-red-600 text-[10px] font-extrabold p-4 rounded-2xl border border-red-100 uppercase animate-shake">
                ⚠️ {error}
              </div>
            )}

            {/* Botón de envío que muestra un loader si el estado loading = true */}
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-brand-teal text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-teal/20 hover:scale-[1.02] active:scale-95 transition-all text-xs flex items-center justify-center gap-3 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Conectar al sistema'}
            </button>
          </form>
        </div>

        {/* Footer/Copyright */}
        <div className="text-center">
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter">
            Purple BTL &copy; 2026 • Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
