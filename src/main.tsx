import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { SignIn } from './routes/auth/SignIn';
import { AuthCallback } from './routes/auth/AuthCallback';
import { ResetPassword } from './routes/auth/ResetPassword';
import { AppLayout } from './routes/app/AppLayout';
import { Dashboard } from './routes/app/Dashboard';
import { PromptView } from './routes/app/PromptView';
import { PromptEditor } from './routes/app/PromptEditor';
import { Settings } from './routes/app/Settings';
import { BundleList } from './routes/app/BundleList';
import { BundleEditor } from './routes/app/BundleEditor';
import { Learn } from './routes/app/Learn';
import { LearnConcept } from './routes/app/LearnConcept';
import { PublicPrompt } from './routes/public/PublicPrompt';
import { InviteAccept } from './routes/public/InviteAccept';
import { Toaster } from './components/ui/toaster';
import { ErrorBoundary } from './components/ErrorBoundary';
import { queryClient } from './lib/queryClient';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import './app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/p/:slug" element={<PublicPrompt />} />
            <Route path="/invite/:token" element={<InviteAccept />} />

            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="f/:folderId" element={<Dashboard />} />
              <Route path="prompts/new" element={<PromptEditor />} />
              <Route path="p/new" element={<PromptEditor />} />
              <Route path="p/:promptId" element={<PromptView />} />
              <Route path="p/:promptId/edit" element={<PromptEditor />} />
              <Route path="bundles" element={<BundleList />} />
              <Route path="bundles/new" element={<BundleEditor />} />
              <Route path="bundles/:bundleId" element={<BundleEditor />} />
              <Route path="settings" element={<Settings />} />
              <Route path="learn" element={<Learn />} />
              <Route path="learn/:conceptId" element={<LearnConcept />} />
            </Route>
          </Routes>
          <Toaster />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
