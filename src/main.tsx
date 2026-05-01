import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { SignIn } from './routes/auth/SignIn';
import { AppLayout } from './routes/app/AppLayout';
import { Dashboard } from './routes/app/Dashboard';
import { PromptView } from './routes/app/PromptView';
import { PromptEditor } from './routes/app/PromptEditor';
import { Settings } from './routes/app/Settings';
import { PublicPrompt } from './routes/public/PublicPrompt';
import { InviteAccept } from './routes/public/InviteAccept';
import { Toaster } from './components/ui/toaster';
import { ErrorBoundary } from './components/ErrorBoundary';
import { queryClient } from './lib/queryClient';
import './app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/p/:slug" element={<PublicPrompt />} />
            <Route path="/invite/:token" element={<InviteAccept />} />

            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="f/:folderId" element={<Dashboard />} />
              <Route path="prompts/new" element={<PromptEditor />} />
              <Route path="p/new" element={<PromptEditor />} />
              <Route path="p/:promptId" element={<PromptView />} />
              <Route path="p/:promptId/edit" element={<PromptEditor />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
          <Toaster />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
