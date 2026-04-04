'use client';
import React, { createContext, useContext, ReactNode } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Socket } from 'socket.io-client';

interface SocketContextProps{
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextProps>({
    socket: null,
    isConnected: false,
});

export const SocketProvider = ({ children }: { children: ReactNode}) => {
    //Usamos hook que ya tiene la IP 192.168.1.100 y el puerto 3000
    const { socket, isConnected } = useSocket();

    return(
        <SocketContext.Provider value={{ socket, isConnected}}>
            { children }
        </SocketContext.Provider>
    );
};

export const useSocketContext = () => useContext(SocketContext);