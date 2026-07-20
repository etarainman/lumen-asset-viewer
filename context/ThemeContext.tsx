import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ViewerTheme = 'light' | 'dark';

interface ThemeContextValue {
  viewerTheme: ViewerTheme;
  setViewerTheme: (theme: ViewerTheme) => void;
  toggleViewerTheme: () => void;
}

const VIEWER_THEME_KEY = 'ambiflo-viewer-theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

const getInitialViewerTheme = (): ViewerTheme => {
  try {
    return localStorage.getItem(VIEWER_THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [viewerTheme, setViewerTheme] = useState<ViewerTheme>(getInitialViewerTheme);

  useEffect(() => {
    document.documentElement.dataset.viewerTheme = viewerTheme;
    try {
      localStorage.setItem(VIEWER_THEME_KEY, viewerTheme);
    } catch {
      // The selected theme still applies for this session if storage is unavailable.
    }
  }, [viewerTheme]);

  const toggleViewerTheme = useCallback(() => {
    setViewerTheme(current => current === 'dark' ? 'light' : 'dark');
  }, []);

  const value = useMemo(() => ({
    viewerTheme,
    setViewerTheme,
    toggleViewerTheme
  }), [viewerTheme, toggleViewerTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
