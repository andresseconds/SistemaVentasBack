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
  // 1. AQUI ESTÁN LAS VARIABLES QUE TE DABAN ERROR
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number | ''>(''); 

  // 2. AQUI CARGAMOS LAS MESAS Y LOS PRODUCTOS
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsData, tablesData] = await Promise.all([
          ProductsService.findAll(),
          TablesService.getAllTables()
        ]);
        
        setProducts(productsData.filter(p => p.price > 0));
        setTables(tablesData); 
      } catch (error) {
        console.error('❌ Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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
      alert('¡Venta registrada con éxito!');
      setCart([]);
      setSelectedTableId(''); 
    } catch (error) {
      console.error('❌ Error al registrar la venta:', error);
      alert('Hubo un error al procesar la venta. Asegúrate de que la mesa esté libre.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Caja - Guadalupe Café ☕</h1>
          <p className="text-sm text-gray-500">Terminal de Punto de Venta</p>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* PANEL IZQUIERDO: PRODUCTOS */}
        <div className="w-2/3 p-6 overflow-y-auto">
          {loading ? (
            <p className="text-gray-600">Cargando catálogo y mesas...</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <button 
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-amber-500 transition-all text-left flex flex-col justify-between h-32 active:scale-95"
                >
                  <span className="font-semibold text-gray-700 line-clamp-2">{product.name}</span>
                  <span className="text-amber-600 font-bold mt-2">
                    ${product.price.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PANEL DERECHO: LA CUENTA */}
        <div className="w-1/3 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Cuenta Actual</h2>
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
                      <div className="text-sm text-gray-500">
                        {item.cartQuantity} x ${item.price.toLocaleString()}
                      </div>
                    </div>
                    <span className="font-bold text-gray-800">
                      ${(item.price * item.cartQuantity).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-200">
            
            {/* SELECTOR DE MESAS */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mesa del Cliente
              </label>
              <select 
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-800"
              >
                <option value="" disabled>-- Selecciona una Mesa --</option>
                {tables.map(table => (
                  <option 
                    key={table.id} 
                    value={table.id}
                    disabled={table.status === 'OCCUPIED'} 
                  >
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
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex justify-center items-center"
            >
              {isSubmitting ? 'Procesando...' : 'Cobrar'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}