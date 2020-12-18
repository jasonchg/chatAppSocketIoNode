const express = require('express')
const path = require('path')
const http = require('http')
const PORT = 3000 || process.env.PORT
const socketio = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = socketio(server)
const formatMessage = require('./utils/messages')
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require('./utils/users')
const botName = 'ChatCord Bot'

// set static folder
app.use(express.static(path.join(__dirname, 'public')))

// run when client connects
io.on('connection', (socket) => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room)

    socket.join(user.room)

    // welcome current user
    socket.emit('message', formatMessage(botName, 'Welcome to ChatCord'))

    // all client except the client who already connected, broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat.`)
      )

    // send users and room info
    io.to(user.room).emit('roomUsers', { room, users: getRoomUsers(user.room) })
  })

  // listen for chatMassage
  socket.on('chatMessage', (msg) => {
    const user = getCurrentUser(socket.id)
    io.to(user.room).emit('message', formatMessage(user.username, msg))
  })

  // run when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id)

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat.`)
      )
      // send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room),
      })
    }
  })
})

server.listen(PORT, () => console.log(`Server running on port ${PORT}`))
