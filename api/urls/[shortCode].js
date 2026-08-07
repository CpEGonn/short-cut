import { createApp } from '../../server/src/app.js'

// Vercel resolves this explicit nested function before the catch-all handler.
// It keeps record-detail requests available in production.
export default createApp()
