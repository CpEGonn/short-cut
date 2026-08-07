import { createApp } from '../../server/src/app.js'

// Vercel resolves this explicit nested function before the catch-all handler.
// It forwards the request to the shared Express application, which owns the
// redirect behavior and visit tracking.
export default createApp()
