// Frontend/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ProductsService } from '../services/products.service';
import { OrdersService } from '../services/orders.service';
import { TablesService, Table } from '../services/tables.service'; 
import { Product } from '../services/types';

interface CartItem extends Product {
  cartQuantity: number;
}

export default function CajaPOS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number | ''>(''); 
  
  // NUEVO ESTADO PARA LAS PESTAÑAS
  const [activeTab, setActiveTab] = useState<'NUEVA_ORDEN' | 'MESAS_ACTIVAS'>('NUEVA_ORDEN');

  // Función para recargar los datos (útil después de crear o pagar una orden)
  const refreshData = async () => {
    setLoading(true);
    try {
      const [productsData, tablesData] = await Promise.all([
        ProductsService.findAll(),
        TablesService.getAllTables()
      ]);
      setProducts(productsData.filter(p => p.price > 0));
      setTables(tablesData);
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, cartQuantity: 1 }];
    });
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);

  const handleCheckout = async () => {
    if (!selectedTableId) {
      alert('Por favor, selecciona una mesa antes de cobrar.');
      return;
    }
    setIsSubmitting(true);
    try {
      const orderPayload = {
        tableId: Number(selectedTableId), 
        paymentMethod: 'CASH',
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.cartQuantity,
          price: item.price
        }))
      };
      await OrdersService.createOrder(orderPayload);
      alert('¡Venta enviada a la mesa con éxito!');
      setCart([]);
      setSelectedTableId(''); 
      await refreshData(); // Recargamos para que la mesa pase a rojo (Ocupada)
      setActiveTab('MESAS_ACTIVAS'); // Llevamos al mesero a ver sus mesas
    } catch (error) {
      alert('Hubo un error al procesar la venta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // NUEVA FUNCIÓN PARA LIBERAR MESAS
  const handleReleaseTable = async (tableId: number, tableNumber: string) => {
    const confirm = window.confirm(`¿Estás seguro de cerrar la cuenta y liberar la Mesa ${tableNumber}?`);
    if (!confirm) return;

    try {
      await OrdersService.checkoutTable(tableId);
      alert('¡Mesa liberada y cuenta pagada con éxito!');
      await refreshData(); // Recargamos para que la mesa vuelva a estar verde (Libre)
    } catch (error) {
      console.error('Error al liberar la mesa:', error);
      alert('Hubo un error al intentar liberar la mesa.');
    }
  };

  // Filtramos las mesas ocupadas para la pestaña de "Mesas Activas"
  const occupiedTables = tables.filter(t => t.status === 'OCCUPIED');

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Caja - Guadalupe Café ☕</h1>
          <p className="text-sm text-gray-500">Terminal de Punto de Venta</p>
        </div>
        
        {/* NAVEGACIÓN DE PESTAÑAS */}
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button 
            onClick={() => setActiveTab('NUEVA_ORDEN')}
            className={`px-6 py-2 rounded-md font-semibold transition-colors ${activeTab === 'NUEVA_ORDEN' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Tomar Pedido
          </button>
          <button 
            onClick={() => setActiveTab('MESAS_ACTIVAS')}
            className={`px-6 py-2 rounded-md font-semibold transition-colors ${activeTab === 'MESAS_ACTIVAS' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Mesas Activas ({occupiedTables.length})
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        
        {/* VISTA 1: NUEVA ORDEN (LO QUE YA TENÍAMOS) */}
        {activeTab === 'NUEVA_ORDEN' && (
          <>
            <div className="w-2/3 p-6 overflow-y-auto">
              {loading ? (
                <p className="text-gray-600">Cargando...</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((product) => (
                    <button 
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-amber-500 transition-all text-left flex flex-col justify-between h-32 active:scale-95"
                    >
                      <span className="font-semibold text-gray-700 line-clamp-2">{product.name}</span>
                      <span className="text-amber-600 font-bold mt-2">${product.price.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-1/3 bg-white border-l border-gray-200 flex flex-col">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Nueva Cuenta</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {cart.length === 0 ? (
                  <p className="text-gray-400 text-center mt-10">Toca un producto para agregarlo</p>
                ) : (
                  <ul className="space-y-3">
                    {cart.map((item) => (
                      <li key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <div>
                          <span className="font-semibold text-gray-700">{item.name}</span>
                          <div className="text-sm text-gray-500">{item.cartQuantity} x ${item.price.toLocaleString()}</div>
                        </div>
                        <span className="font-bold text-gray-800">${(item.price * item.cartQuantity).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mesa del Cliente</label>
                  <select 
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-800"
                  >
                    <option value="" disabled>-- Selecciona una Mesa --</option>
                    {tables.map(table => (
                      <option key={table.id} value={table.id} disabled={table.status === 'OCCUPIED'}>
                        {table.number} {table.status === 'OCCUPIED' ? '(🔴 Ocupada)' : '(🟢 Libre)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-between items-center mb-4 text-xl font-bold">
                  <span>Total:</span>
                  <span className="text-amber-600">${total.toLocaleString()}</span>
                </div>
                <button 
                  onClick={handleCheckout} 
                  disabled={cart.length === 0 || isSubmitting || !selectedTableId} 
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Procesando...' : 'Enviar Pedido'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* VISTA 2: MESAS ACTIVAS (NUEVO GESTOR) */}
        {activeTab === 'MESAS_ACTIVAS' && (
          <div className="w-full p-6 bg-gray-50 overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Control de Mesas</h2>
            {occupiedTables.length === 0 ? (
              <div className="text-center mt-20 text-gray-500">
                <p className="text-xl">🎉 Todas las mesas están libres</p>
                <p className="text-sm mt-2">No hay clientes por cobrar en este momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {occupiedTables.map(table => (
                  <div key={table.id} className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
                    <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
                      <h3 className="font-bold text-red-800 text-lg">Mesa {table.number}</h3>
                      <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full">
                        🔴 OCUPADA
                      </span>
                    </div>
                    <div className="p-6 flex flex-col space-y-4">
                      <p className="text-gray-600 text-sm">
                        Esta mesa tiene un pedido en curso. Para permitir que nuevos clientes se sienten, debes cerrar la cuenta.
                      </p>
                      <button
                        onClick={() => handleReleaseTable(table.id, table.number)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors shadow-sm"
                      >
                        💳 Cobrar y Liberar Mesa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}