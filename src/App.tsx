import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { client } from './lib/apolloClient';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { VideosPage } from './pages/VideosPage';
import { PlaylistsPage } from './pages/PlaylistsPage';
import { LoginPage } from './pages/LoginPage';
import { TagsPage } from './pages/TagsPage';
import { ReportPage } from './pages/ReportPage';
import { MmrPage } from './pages/MmrPage';
import { RoulettePage } from './pages/RoulettePage';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <Navbar />
    {children}
  </>
);

export default function App() {
  return (
    <ApolloProvider client={client}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/videos" replace />} />
            <Route
              path="/videos"
              element={<AppLayout><VideosPage /></AppLayout>}
            />
            <Route
              path="/playlists"
              element={<AppLayout><PlaylistsPage /></AppLayout>}
            />
            <Route
              path="/tags"
              element={<AppLayout><TagsPage /></AppLayout>}
            />
            <Route
              path="/report"
              element={<AppLayout><ReportPage /></AppLayout>}
            />
            <Route 
              path="/mmr" 
              element={<AppLayout><MmrPage /></AppLayout>} 
            />
            <Route 
              path="/roulette"
              element={<AppLayout><RoulettePage /></AppLayout>}
            />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ApolloProvider>
  );
}
