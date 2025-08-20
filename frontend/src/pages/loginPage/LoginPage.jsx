/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, signupUser } from '../../utils/auth';
import "./style.css";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('VENDOR');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const cachedToken = localStorage.getItem('authToken');
    const cachedUser = JSON.parse(localStorage.getItem('authUser'));

    if (cachedToken && cachedUser) {
      try {
        const payload = JSON.parse(atob(cachedToken.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();

        if (!isExpired) {
          if (cachedUser.approved === false) {
            setError('Your account is not approved by admin yet.');
            return;
          }

          let rolePath = '/';
          switch (cachedUser.role) {
            case 'COMPANY':
              rolePath = '/company/summary';
              break;
            case 'CLIENT':
              rolePath = '/client/summary';
              break;
            case 'VENDOR':
            case 'ADMIN':
              rolePath = '/vendor/summary';
              break;
            default:
              rolePath = '/';
              break;
          }
          navigate(rolePath, { replace: true });
        } else {
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
        }
      } catch {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      }
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const { success, error: loginError, user, token } = await loginUser(email, password);
    console.log('Login response:', { success, error: loginError, user, token });

    if (success) {
      if (!user.VerificationStatus === "APPROVED") {
        setError('Your account is not approved by admin yet.');
        return;
      }

      localStorage.setItem('authToken', token);
      localStorage.setItem('authUser', JSON.stringify(user));

      let rolePath = '/';
      switch (user.role) {
        case 'COMPANY':
          rolePath = '/company/summary';
          break;
        case 'CLIENT':
          rolePath = '/client/summary';
          break;
        case 'VENDOR':
        case 'ADMIN':
          rolePath = '/vendor/summary';
          break;
        default:
          rolePath = '/';
          break;
      }
      navigate(rolePath, { replace: true });
    } else {
      setError(loginError || 'Login failed');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const signupData = { name, email, password, role: role.toUpperCase() };
    const { success, error: signupError } = await signupUser(signupData);

    if (success) {
      setSuccessMessage('Signup successful! Wait for admin approval.');
      setIsLogin(true);
      setName('');
      setEmail('');
      setPassword('');
    } else {
      setError(signupError || 'Signup failed.');
    }
  };

  const inputContainerClass = "relative mb-5";
  const labelClass = "absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 transition-all duration-300 pointer-events-none";
  const inputClass = "w-full border rounded-lg px-4 py-3 bg-gray-50 text-gray-800 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 peer";
  const activeLabelClass = "text-xs top-2 -translate-y-0 text-blue-600 font-semibold bg-gray-50 px-1";

  return (
    <>
      <div className="min-h-screen flex flex-col items-center custom-gradient p-4">
        {/* Header aligned to the top with a subtle animation */}
        <div className="flex items-center mt-12 mb-8 fade-in-up" style={{ animationDelay: '0.2s' }}>
          <img
            src="/src/assets/cynox_logo.svg"
            alt="Cynox Security Logo"
            className="h-20 w-20 mr-4"
          />
          <h1 className="text-4xl font-bold text-gray-800 tracking-tight">CYNOX SECURITY LLP</h1>
        </div>

        {/* Form container centered on its own with a subtle animation and elevated style */}
        <div className="flex flex-col flex-grow items-center justify-center w-full fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="w-full max-w-md bg-white shadow-2xl p-10 rounded-xl transform transition-all duration-300 hover:scale-105">
            <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
              {isLogin ? 'Welcome Back' : 'Join Us'}
            </h2>

            {error && <p className="text-red-600 text-sm text-center mb-4 p-2 rounded-lg bg-red-50 border border-red-200">{error}</p>}
            {successMessage && <p className="text-green-600 text-sm text-center mb-4 p-2 rounded-lg bg-green-50 border border-green-200">{successMessage}</p>}

            <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-5">
              {!isLogin && (
                <>
                  <div className="relative group">
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full border rounded-lg px-4 py-3 bg-gray-50 text-gray-800 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-transparent"
                      placeholder="Full Name"
                    />
                    <label htmlFor="name" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 transition-all duration-300 pointer-events-none label">Full Name</label>
                  </div>
                  <div className="relative group">
                    <select
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      required
                      className="w-full border rounded-lg px-4 py-3 bg-gray-50 text-gray-800 appearance-none cursor-pointer transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" disabled hidden>Select Role</option>
                      <option value="VENDOR">VENDOR</option>
                      <option value="CLIENT">CLIENT</option>
                    </select>
                    <label htmlFor="role" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 transition-all duration-300 pointer-events-none label">Role</label>
                  </div>
                </>
              )}

              <div className="relative group">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border rounded-lg px-4 py-3 bg-gray-50 text-gray-800 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-transparent"
                  placeholder="Email"
                />
                <label htmlFor="email" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 transition-all duration-300 pointer-events-none label">Email</label>
              </div>
              <div className="relative group">
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border rounded-lg px-4 py-3 bg-gray-50 text-gray-800 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-transparent"
                  placeholder="Password"
                />
                <label htmlFor="password" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 transition-all duration-300 pointer-events-none label">Password</label>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg shadow-md transition-all duration-300 hover:bg-blue-700 hover:scale-105"
              >
                {isLogin ? 'Login' : 'Sign Up'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-6">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccessMessage('');
                }}
                className="text-blue-600 font-semibold transition-colors hover:text-blue-800 hover:underline bg-white"
              >
                {isLogin ? 'Sign Up' : 'Login'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}