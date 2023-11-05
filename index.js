const express = require('express')
const app = express()
const port = 5000

app.get('/', (req, res) => {
  res.send('Grow Barter Server running ...')
})

app.listen(port, () => {
  console.log(`Grow Barter Server running on port ${port}`)
})