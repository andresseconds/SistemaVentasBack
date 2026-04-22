import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 1. Unificamos la fuente de la verdad: Usamos la IP de tu .env.local
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    // 2. Nos conectamos dinámicamente a la URL del BackEnd
    const socketInstance = io(API_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5
    });

    socketInstance.on('bienvenida', (data) => {
      alert(data.mensaje); // Si sale esta alerta en la tablet, ¡ESTÁS CONECTADO!
    });

    socketInstance.on('connect', () => {
      console.log("🟢 ¡Socket Conectado con éxito a:", API_URL);
      setIsConnected(true);
    });

    socketInstance.on('connect_error', (err) => {
      console.error("🔴 Error de socket (revisa Firewall o URL):", err.message);
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