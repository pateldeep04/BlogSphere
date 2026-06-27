import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../redux/authSlice.js';
import { Bell, Search, Sun, Moon, PenSquare, LogOut, User, Menu, X, ChevronDown, Check } from 'lucide-react';
import api from '../utils/api.js';
import socket from '../utils/socket.js';

export default function Navbar() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  // Sync theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Fetch Notifications & Setup Socket
  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect socket
      socket.connect();
      socket.emit('join_user', user._id);

      // Fetch initial notifications
      api.get('/api/notifications')
        .then((res) => {
          setNotifications(res.data.notifications);
          setUnreadCount(res.data.notifications.filter(n => !n.isRead).length);
        })
        .catch(console.error);

      // Listen for live notifications
      socket.on('notification_received', (newNotif) => {
        setNotifications((prev) => [newNotif, ...prev]);
        setUnreadCount((prev) => prev + 1);
        
        // Custom subtle chimes / sound synthesis
        try {
          const context = new (window.AudioContext || window.webkitAudioContext)();
          const osc = context.createOscillator();
          const gain = context.createGain();
          osc.connect(gain);
          gain.connect(context.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, context.currentTime); // D5
          osc.frequency.setValueAtTime(880.00, context.currentTime + 0.1); // A5
          gain.gain.setValueAtTime(0.05, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.3);
          osc.start();
          osc.stop(context.currentTime + 0.3);
        } catch (e) {
          // Fallback if audio context is blocked
        }
      });
    }

    return () => {
      socket.off('notification_received');
      socket.disconnect();
    };
  }, [isAuthenticated, user]);

  // Click Outside hooks
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    setShowUserMenu(false);
    navigate('/');
  };

  const markNotificationRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <nav className="sticky top-0 z-50 transition-all border-b glass-card">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex items-center justify-center w-10 h-10 font-bold text-white rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 shadow-md shadow-primary-500/20">
                B
              </span>
              <span className="hidden text-xl font-extrabold tracking-tight sm:block bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent dark:from-primary-400 dark:to-indigo-400">
                BlogSphere
              </span>
            </Link>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-md mx-8 my-auto hidden md:block">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles, tags, categories..."
                className="w-full py-2 pl-10 pr-4 text-sm transition-all border rounded-full bg-slate-100 border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white dark:bg-slate-900 dark:border-slate-800 dark:focus:bg-slate-950 text-slate-800 dark:text-slate-100"
              />
              <Search className="absolute w-4 h-4 text-slate-400 top-3 left-3" />
            </form>
          </div>

          {/* User Controls / Auth Links */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 transition-colors rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            {isAuthenticated ? (
              <>
                {/* Publish Button */}
                <Link
                  to="/editor"
                  className="items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-all rounded-full bg-primary-600 hover:bg-primary-700 shadow-md shadow-primary-500/10 hidden sm:flex"
                >
                  <PenSquare className="w-4 h-4" />
                  <span>Write</span>
                </Link>

                {/* Notifications Dropdown */}
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 transition-colors rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
                  >
                    <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 w-80 mt-2 origin-top-right rounded-2xl shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 font-semibold dark:bg-rose-950/30 dark:text-rose-400">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-6 text-center text-slate-400 text-sm">
                            All quiet here! No alerts.
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n._id}
                              onClick={() => markNotificationRead(n._id)}
                              className={`px-4 py-3 flex gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                                !n.isRead ? 'bg-primary-50/40 dark:bg-primary-950/10' : ''
                              }`}
                            >
                              <div className="flex-1">
                                <p className="text-xs text-slate-800 dark:text-slate-200">{n.message}</p>
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                  {new Date(n.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              {!n.isRead && (
                                <div className="w-2 h-2 rounded-full bg-primary-500 self-center" />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-1.5 focus:outline-none"
                  >
                    <img
                      src={user?.profileImage}
                      alt={user?.name}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-primary-500/20"
                    />
                    <ChevronDown className="w-4 h-4 text-slate-500 hidden sm:block" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 w-56 mt-2 origin-top-right rounded-2xl shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
                      </div>
                      
                      <Link
                        to={`/profile/${user?._id}`}
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </Link>

                      <Link
                        to="/dashboard"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Sun className="w-4 h-4" />
                        <span>Author Dashboard</span>
                      </Link>

                      {user?.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <span>Admin Panel</span>
                        </Link>
                      )}

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-t border-slate-100 dark:border-slate-800"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-primary-600"
                >
                  Sign In
                </Link>
                <Link
                  to="/login?tab=register"
                  className="px-4 py-2 text-sm font-semibold text-white rounded-full bg-primary-600 hover:bg-primary-700 shadow-md shadow-primary-500/10"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 md:hidden px-4 pt-2 pb-4 space-y-2">
          <form onSubmit={handleSearch} className="relative py-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full py-2 pl-10 pr-4 text-sm border rounded-full bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-slate-100"
            />
            <Search className="absolute w-4 h-4 text-slate-400 top-5 left-3" />
          </form>

          {isAuthenticated && (
            <Link
              to="/editor"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 w-full justify-center px-4 py-2 text-sm font-semibold text-white rounded-full bg-primary-600 hover:bg-primary-700"
            >
              <PenSquare className="w-4 h-4" />
              <span>Write Article</span>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
