import { io } from 'socket.io-client';

// Standard fallback: during dev socket server is on 5000, in prod it's on current origin
const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;

export const socket = io(socketUrl, {
  autoConnect: false
});

export default socket;
