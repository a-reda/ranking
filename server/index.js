const express = require('express')
const next = require('next')
const mongoose = require('mongoose')
const api = require('./api')

const auth = require('basic-auth')

require('dotenv').config()

const dev = process.env.v !== 'production'
const port = process.env.PORT || 8000
const ROOT_URL = dev ? `http://localhost:${port}` : 'https://www.scoreza.it/'

let MONGO_URL = process.env.MONGO_URL

// Mongo Atlas connection string
// MONGO_URL = 'mongodb+srv://ranking:ranking1@scorezacluster-dt96q.mongodb.net/?retryWrites=true&w=majority'
process.env.offline = false
mongoose.connect(MONGO_URL, { useNewUrlParser: true, dbName: 'belliga' }).catch( (err) => {
  // if(err) {
    console.error('ERROR! -> ', err)

    process.env.offline = true
  // }
})
console.log('NO WAY OUT')
const app = next({ dev })
const handle = app.getRequestHandler()

function isAuthenticated(req, res, next) {
  const credentials = auth(req)
  if (credentials && credentials.name === 'john' && credentials.pass === 'secret') {
    return next()
  }
  // IF A USER ISN'T LOGGED IN, THEN REDIRECT THEM SOMEWHERE
  res.statusCode = 401
  res.setHeader('WWW-Authenticate', 'Basic realm="Scoreza Access"')
  res.end('Access denied')
}


app.prepare().then(() => {
  const server = express()

  server.use(express.static('public'))

  server.use(express.json())

  api(server)
  console.log('PREPARE')
  server.get('/users/:slug', (req, res) => {
    console.log('GOT SOME HONEY')
    return app.render(req, res, `/users/update`, { slug: req.params.slug })
  })

  server.get('/match/:slug', (req, res) => {
    return app.render(req, res, `/matches/detail`, { slug: req.params.slug })
  })

  server.get('/admin*', isAuthenticated, (req, res) => {
    return handle(req, res)
  })

  // give all Nextjs's request to Nextjs server
  server.get('*', (req, res) => {
    handle(req, res)
  })


  server.listen(port, (err) => {
    if (err) throw err
    console.info(`> Ready on ${ROOT_URL}`)
  })
})
