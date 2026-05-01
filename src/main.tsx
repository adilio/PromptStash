import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignIn } from './routes/auth/SignIn';
import { AppLayout } from './routes/app/AppLayout';
import { Dashboard } from './routes/app/Dashboard';
import { PromptView } from './routes/app/PromptView';
import { PromptEditor } from './routes/app/PromptEditor';
import { Settings } from './routes/app/Settings';
import { PublicPrompt } from './routes/public/PublicPrompt';
import { Toaster } from './components/ui/toaster';
import { ErrorBoundary } from './components/ErrorBoundary';
import './app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/p/:slug" element={<PublicPrompt />} />

          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="p/new" element={<PromptEditor />} />
            <Route path="p/:promptId" element={<PromptView />} />
            <Route path="p/:promptId/edit" element={<PromptEditor />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
