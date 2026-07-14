import { io } from 'socket.io-client';

// Standard fallback: during dev socket server is on 5000, in prod it's on current origin
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname.startsWith('192.168.') ||
                window.location.hostname.startsWith('10.') ||
                window.location.hostname.startsWith('172.');
const socketUrl = isLocal ? `http://${window.location.hostname}:5000` : window.location.origin;

export const socket = io(socketUrl, {
  autoConnect: false
});

export default socket;
