import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authSuccess, logoutUser } from './redux/authSlice';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import BlogDetail from './pages/BlogDetail';
import Editor from './pages/Editor';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import DailyBriefs from './pages/DailyBriefs';
import LeadershipBoard from './pages/LeadershipBoard';
import Profile from './pages/Profile';
import Communities from './pages/Communities';
import AdCenter from './pages/AdCenter';
import Collections from './pages/Collections';
import CollectionDetail from './pages/CollectionDetail';
import CollectionEditor from './pages/CollectionEditor';
import AddToCollectionModal from './components/collections/AddToCollectionModal.jsx';
import api from './utils/api';
import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';

export default function App() {
  const dispatch = useDispatch();

  // Validate session on startup
  useEffect(() => {
    const hasLocalUser = localStorage.getItem('user');
    if (hasLocalUser) {
      api.get('/api/auth/me')
        .then((res) => {
          dispatch(authSuccess({ user: res.data.user }));
        })
        .catch((err) => {
          console.error('Session restore failed:', err);
          dispatch(logoutUser());
        });
    }
  }, [dispatch]);

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <Router>
          <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
            {/* Navigation Bar */}
            <Navbar />
            <AddToCollectionModal />

            {/* Core Layout Routes */}
            <div className="flex-1 w-full">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Auth />} />
                <Route path="/register" element={<Auth />} />
                <Route path="/blog/:slug" element={<BlogDetail />} />
                <Route path="/blog" element={<Navigate to="/" replace />} />
                <Route path="/editor" element={<Editor />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/daily-briefs" element={<DailyBriefs />} />
                <Route path="/leaderboard" element={<LeadershipBoard />} />
                <Route path="/system-admin-sphere" element={<Admin />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/adcenter" element={<AdCenter />} />
                <Route path="/adsense" element={<AdCenter />} />
                <Route path="/profile/:id" element={<Profile />} />
                <Route path="/profile" element={<Navigate to="/dashboard" replace />} />
                <Route path="/communities" element={<Communities />} />
                <Route path="/collections" element={<Collections />} />
                <Route path="/collections/:slug" element={<CollectionDetail />} />
                <Route path="/collections/new" element={<CollectionEditor />} />
                <Route path="/collections/:id/edit" element={<CollectionEditor />} />
                {/* Fallback routes for unknown or removed paths */}
                <Route path="/galaxy" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>

            {/* Footer */}
            <footer className="py-8 border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 text-center text-xs text-slate-400">
              <div className="max-w-7xl mx-auto px-4">
                <p>© {new Date().getFullYear()} BlogSphere — Smart Community Blog Platform. All rights reserved.</p>
              </div>
            </footer>
          </div>
        </Router>
      </MotionConfig>
    </LazyMotion>
  );
}
