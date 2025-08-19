/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, signupUser } from '../utils/auth';

export default function AuthPage() {
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
              rolePath = '/vendor/summary';
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
          rolePath = '/vendor/summary';
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

  return (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
    <div className="flex items-center mb-8">
      <img
        src="/src/assets/cynox_logo.svg" 
        alt="Cynox Security Logo"
        className="h-12 w-12 mr-3"
      />
      <h1 className="text-3xl font-bold text-center">CYNOX SECURITY LLP</h1>
    </div>

    <div className="w-full max-w-md bg-white shadow-lg p-8 rounded-lg">
      <h2 className="text-2xl font-bold text-center mb-6">
        {isLogin ? 'Login' : 'Sign Up'}
      </h2>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {successMessage && <p className="text-green-600 text-sm mb-4">{successMessage}</p>}

      <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-4">
        {!isLogin && (
          <>
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 bg-white border-gray-600"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 bg-white border-gray-600"
            >
              <option value="VENDOR">VENDOR</option>
              <option value="CLIENT">CLIENT</option>
            </select>
          </>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border rounded px-3 py-2 bg-white border-gray-600"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border rounded px-3 py-2 bg-white border-gray-600"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          {isLogin ? 'Login' : 'Sign Up'}
        </button>
      </form>

      <p className="text-center text-sm mt-4">
        {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
            setSuccessMessage('');
          }}
          className="text-blue-600 font-semibold bg-white hover:underline border-blue-600"
        >
          {isLogin ? 'Sign Up' : 'Login'}
        </button>
      </p>
    </div>
  </div>
  );
}
