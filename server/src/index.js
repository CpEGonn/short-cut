import { createApp } from './app.js'

const port = Number(process.env.PORT ?? 3000)

try {
  const app = createApp()

  app.listen(port, () => {
    console.log(`ShortCut API listening on http://localhost:${port}`)
  })
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
