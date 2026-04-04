// src/app/page.tsx
'use client';
import { useSocketContext } from '@/context/SocketContext';

export default function SalesPage() {
  const { socket, isConnected } = useSocketContext();

  const handleSendOrder = () => {
    if (socket && isConnected) {
      socket.emit('crear-orden', {
        mesa: 1,
        items: [{ nombre: 'Tinto', precio: 3000 }],
        total: 3000,
      });
      console.log("Orden enviada al server");
    }
  };

  return (
    <div className="p-10">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Guadalupe Café POS</h1>
        <span className={`px-3 py-1 rounded-full text-white ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
          {isConnected ? 'En línea' : 'Desconectado'}
        </span>
      </div>

      <button 
        onClick={handleSendOrder}
        className="mt-10 bg-orange-600 text-white p-6 rounded-2xl shadow-lg hover:bg-orange-700"
      >
        ☕ Enviar Tinto (Prueba)
      </button>
    </div>
  );
}