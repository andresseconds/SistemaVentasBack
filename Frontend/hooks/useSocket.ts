import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 1. Detectamos automáticamente la IP de donde viene la página
    // Si abres la web en la tablet, esto será '192.168.1.22'
    // Si la abres en la PC, esto será 'localhost'
    const IP_FIJA = '192.168.1.100';
    const serverUrl = `http://${IP_FIJA}:3000`;

    console.log("Intentando conectar socket a:", serverUrl);

    const socketInstance = io(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: true,
      path: '/socket.io/',
    });

    socketInstance.on('bienvenida', (data) => {
      alert(data.mensaje); // Si sale esta alerta en la tablet, ¡ESTÁS CONECTADO!
    });

    socketInstance.on('connect', () => {
      console.log("¡Socket Conectado con éxito!");
      setIsConnected(true);
    });

    socketInstance.on('connect_error', (err) => {
      console.error("Error de socket (revisa Firewall puerto 3000):", err.message);
    });

    socketInstance.on('disconnect', () => {
      console.log("Socket desconectado");
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return { socket, isConnected };
};