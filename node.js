const express = require('express')
const app = express()
const port = process.env.PORT || 3000;

app.use(express.json())

app.get('/', (req, res) => {
   res.send('WELCOME TO COMPANY VMS!')
})

app.listen(port, () => {
   console.log(`Example app listening on port ${port}`)
})
