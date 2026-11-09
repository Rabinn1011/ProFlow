import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
// Bundled rather than loaded from Google Fonts: the CSP only allows same-origin fonts.
import '@fontsource-variable/inter/wght.css'
import '@fontsource/instrument-serif/latin-400-italic.css'
import './index.css'
import App from './App.tsx'
import { store } from './store'
import { queryClient } from './services/queryClient'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
)
