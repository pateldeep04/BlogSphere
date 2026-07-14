import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { authStart, authSuccess, authFailure } from '../redux/authSlice.js';
import { Mail, Lock, User, BookOpen, AlertCircle, Eye, EyeOff } from 'lucide-react';
import api from '../utils/api.js';
import confetti from 'canvas-confetti';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const initialTab = location.pathname === '/register' || searchParams.get('tab') === 'register' ? 'register' : 'login';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    bio: '',
    role: 'reader',
    isPrivate: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [errors, setErrors] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    bio: ''
  });
  const [validated, setValidated] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Sync tab from URL path / search parameter change
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (location.pathname === '/register' || tabParam === 'register') {
      setActiveTab('register');
    } else {
      setActiveTab('login');
    }
    setErrors({ name: '', username: '', email: '', password: '', bio: '' });
    setValidated(false);
  }, [searchParams, location.pathname]);

  const validateForm = () => {
    const tempErrors = { name: '', username: '', email: '', password: '', bio: '' };
    let isValid = true;

    if (activeTab === 'register' && !formData.name.trim()) {
      tempErrors.name = 'Full name is required.';
      isValid = false;
    }

    if (activeTab === 'register' && formData.username.trim() && !/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      tempErrors.username = 'Username can only contain letters, numbers, and underscores.';
      isValid = false;
    }

    if (activeTab === 'register' && !formData.bio.trim()) {
      tempErrors.bio = 'Bio is required.';
      isValid = false;
    } else if (activeTab === 'register' && formData.bio.trim().length < 5) {
      tempErrors.bio = 'Bio must be at least 5 characters long.';
      isValid = false;
    }

    if (!formData.email.trim()) {
      tempErrors.email = 'Email address is required.';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      tempErrors.email = 'Please enter a valid email address (e.g. name@example.com).';
      isValid = false;
    }

    if (!formData.password) {
      tempErrors.password = 'Password is required.';
      isValid = false;
    } else if (formData.password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters long.';
      isValid = false;
    }

    setErrors(tempErrors);
    setValidated(true);
    return isValid;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!validateForm()) {
      return;
    }
    dispatch(authStart());

    try {
      if (activeTab === 'register') {
        // Register API Call
        const res = await api.post('/api/auth/register', formData);
        dispatch(authSuccess({ token: res.data.token, user: res.data.user }));
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
        navigate('/');
      } else {
        // Login API Call
        const res = await api.post('/api/auth/login', {
          email: formData.email,
          password: formData.password
        });
        dispatch(authSuccess({ token: res.data.token, user: res.data.user }));
        navigate('/');
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Something went wrong. Please try again.';
      dispatch(authFailure(errMsg));
      setLocalError(errMsg);
    }
  };

  const handleGoogleCallback = async (response) => {
    dispatch(authStart());
    try {
      const res = await api.post('/api/auth/google', { idToken: response.credential });
      dispatch(authSuccess({ token: res.data.token, user: res.data.user }));
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      navigate('/');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Google Authentication failed. Please try again.';
      dispatch(authFailure(errMsg));
      setLocalError(errMsg);
    }
  };

  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '82594612458-dummy.apps.googleusercontent.com',
          callback: handleGoogleCallback
        });
        const btnContainer = document.getElementById('google-signin-button');
        if (btnContainer) {
          window.google.accounts.id.renderButton(
            btnContainer,
            { 
              theme: document.documentElement.classList.contains('dark') ? 'filled_blue' : 'outline', 
              size: 'large', 
              width: '100%',
              shape: 'pill'
            }
          );
        }
      }
    };

    if (window.google) {
      initializeGoogleSignIn();
    } else {
      const checkScript = setInterval(() => {
        if (window.google) {
          initializeGoogleSignIn();
          clearInterval(checkScript);
        }
      }, 100);
      return () => clearInterval(checkScript);
    }
  }, [activeTab]);

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md p-8 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-xl glass-card animate-fade-in">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center justify-center w-12 h-12 font-bold text-white rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 shadow-lg shadow-primary-500/20 mb-3">
            B
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Join the smart collaborative community blog
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-full mb-6">
          <button
            onClick={() => {
              setActiveTab('login');
              setLocalError('');
              navigate('/login');
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${
              activeTab === 'login'
                ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setActiveTab('register');
              setLocalError('');
              navigate('/register');
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${
              activeTab === 'register'
                ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Register
          </button>
        </div>

        {/* Errors notification */}
        {(localError || error) && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex gap-2 items-center dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{localError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {activeTab === 'register' && (
            <>
              {/* Full Name */}
              <div className="relative">
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Full name"
                  className={`w-full py-2.5 pl-10 pr-4 text-sm border rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100 ${
                    errors.name ? 'is-invalid border-rose-500' : (validated && !errors.name ? 'is-valid border-emerald-500' : '')
                  }`}
                />
                <User className="absolute w-4 h-4 text-slate-400 top-3.5 left-3.5" />
                {errors.name && (
                  <div className="invalid-feedback text-start text-[11px] text-rose-500 mt-1 block">
                    {errors.name}
                  </div>
                )}
              </div>

              {/* Username (Optional) */}
              <div className="relative">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Username (e.g. patel_deep)"
                  className={`w-full py-2.5 pl-10 pr-4 text-sm border rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100 ${
                    errors.username ? 'is-invalid border-rose-500' : ''
                  }`}
                />
                <User className="absolute w-4 h-4 text-slate-400 top-3.5 left-3.5" />
                {errors.username && (
                  <div className="invalid-feedback text-start text-[11px] text-rose-500 mt-1 block">
                    {errors.username}
                  </div>
                )}
              </div>

              {/* Bio (Required) */}
              <div className="relative">
                <input
                  type="text"
                  name="bio"
                  required
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Bio (e.g. Fullstack Engineer) *"
                  className={`w-full py-2.5 pl-10 pr-4 text-sm border rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100 ${
                    errors.bio ? 'is-invalid border-rose-500' : (validated && !errors.bio ? 'is-valid border-emerald-500' : '')
                  }`}
                />
                <BookOpen className="absolute w-4 h-4 text-slate-400 top-3.5 left-3.5" />
                {errors.bio && (
                  <div className="invalid-feedback text-start text-[11px] text-rose-500 mt-1 block">
                    {errors.bio}
                  </div>
                )}
              </div>

              {/* Account Type Selection */}
              <div className="space-y-1 text-start">
                <label className="text-xs font-bold text-slate-400 uppercase">Account Type</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'reader' })}
                    className={`py-2 px-4 rounded-xl border text-xs font-bold transition-all ${
                      formData.role === 'reader'
                        ? 'bg-primary-50 dark:bg-primary-950/20 border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    📖 Reader
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'author' })}
                    className={`py-2 px-4 rounded-xl border text-xs font-bold transition-all ${
                      formData.role === 'author'
                        ? 'bg-primary-50 dark:bg-primary-950/20 border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    ✍️ Writer
                  </button>
                </div>
              </div>

              {/* Profile Privacy Choice */}
              <div className="flex items-center gap-2 py-1 text-start">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={formData.isPrivate}
                  onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                  className="rounded border-slate-350 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isPrivate" className="text-xs font-semibold text-slate-700 dark:text-slate-350 cursor-pointer">
                  Keep Profile / Account Private
                </label>
              </div>
            </>
          )}

          {/* Email Address */}
          <div className="relative">
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="Email address"
              className={`w-full py-2.5 pl-10 pr-4 text-sm border rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100 ${
                errors.email ? 'is-invalid border-rose-500' : (validated && !errors.email ? 'is-valid border-emerald-500' : '')
              }`}
            />
            <Mail className="absolute w-4 h-4 text-slate-400 top-3.5 left-3.5" />
            {errors.email && (
              <div className="invalid-feedback text-start text-[11px] text-rose-500 mt-1 block">
                {errors.email}
              </div>
            )}
          </div>

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              className={`w-full py-2.5 pl-10 pr-10 text-sm border rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100 ${
                errors.password ? 'is-invalid border-rose-500' : (validated && !errors.password ? 'is-valid border-emerald-500' : '')
              }`}
            />
            <Lock className="absolute w-4 h-4 text-slate-400 top-3.5 left-3.5" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute w-4 h-4 text-slate-400 top-3.5 right-3.5 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            {errors.password && (
              <div className="invalid-feedback text-start text-[11px] text-rose-500 mt-1 block">
                {errors.password}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-sm font-semibold rounded-xl text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/10 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : activeTab === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            <span className="relative px-3 bg-white dark:bg-slate-950 text-xs text-slate-400 font-medium">Or continue with</span>
          </div>

          {/* Google Sign-in Button */}
          <div className="w-full flex justify-center">
            <div id="google-signin-button" className="w-full"></div>
          </div>
        </form>
      </div>
    </div>
  );
}
