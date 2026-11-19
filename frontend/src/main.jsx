import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import OverViewPage from './OverViewPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <OverViewPage />
  </StrictMode>,
)
