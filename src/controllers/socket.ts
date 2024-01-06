import { Server, Socket } from 'socket.io';

export const io = new Server();

io.on('connection', (socket: Socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });

    // Add your socket event listeners here

});
