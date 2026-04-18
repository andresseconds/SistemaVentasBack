'use client';

import { useEffect, useState } from 'react';
import { ProductsService } from '../services/products.service';
import { OrdersService } from '../services/orders.service';
import { TablesService } from '../services/tables.service'; 
import { Product } from '../services/types';

interface CartItem extends Product {
  cartQuantity: number;
}

// Diccionario para traducir los pagos en pantalla
const PAYMENT_LABELS: Record<string, string> = {
  CASH: '💵 Efectivo',
  CARD: '💳 Tarjeta',
  TRANSFER: '📱 Transferencia'
};

export default function CajaPOS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tables, setTables] = useState<any[]>([]); 
  const [selectedTableId, setSelectedTableId] = useState<number | ''>(''); 
  
  // ESTADOS DEL MODAL DE PAGO (NUEVOS PARA PAGOS DIVIDIDOS)
  const [checkoutModal, setCheckoutModal] = useState<{isOpen: boolean, tableId: number, tableNumber: string} | null>(null);
  const [checkoutTotal, setCheckoutTotal] = useState<number>(0);
  const [checkoutItems, setCheckoutItems] = useState<any[]>([]); 
  
  const [paymentsList, setPaymentsList] = useState<{method: string, amount: number}[]>([]);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState('CASH');
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState<number | ''>('');

  // ESTADOS PARA OPCIÓN B
  const [orderAlias, setOrderAlias] = useState('');
  const [editingOrder, setEditingOrder] = useState<{id: number, tableNumber: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'NUEVA_ORDEN' | 'MESAS_ACTIVAS'>('NUEVA_ORDEN');

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
          item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, cartQuantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prevCart) => {
      return prevCart.map(item => {
        if (item.id === productId) {
          return { ...item, cartQuantity: item.cartQuantity - 1 };
        }
        return item;
      }).filter(item => item.cartQuantity > 0); 
    });
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);

  const handleStartAddingItems = async (tableId: number, tableNumber: string) => {
    try {
      const activeOrder = await OrdersService.getActiveOrderByTable(tableId);
      setEditingOrder({ id: activeOrder.id, tableNumber: tableNumber });
      setSelectedTableId(tableId); 
      setActiveTab('NUEVA_ORDEN'); 
    } catch (error) {
      alert("No se pudo encontrar la orden activa.");
    }
  };

  const cancelEditing = () => {
    setEditingOrder(null);
    setSelectedTableId('');
    setCart([]);
  };

  const handleCheckout = async () => {
    if (!selectedTableId) return alert('Por favor, selecciona una mesa.');
    
    setIsSubmitting(true);
    try {
      const itemsPayload = cart.map(item => ({
        productId: item.id,
        quantity: item.cartQuantity,
        price: item.price
      }));

      if (editingOrder) {
        await OrdersService.addItemsToOrder(editingOrder.id, itemsPayload);
        alert('¡Productos añadidos a la cuenta!');
      } else {
        await OrdersService.createOrder({
          tableId: Number(selectedTableId), 
          alias: orderAlias, 
          items: itemsPayload
        });
        alert('¡Venta enviada a la mesa con éxito!');
      }

      setCart([]);
      setSelectedTableId(''); 
      setOrderAlias('');
      setEditingOrder(null);
      await refreshData(); 
      setActiveTab('MESAS_ACTIVAS'); 
    } catch (error) {
      alert('Hubo un error al procesar el pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- LÓGICA DE PAGOS DIVIDIDOS ---
  const openCheckoutModal = async (tableId: number, tableNumber: string) => {
    setCheckoutModal({ isOpen: true, tableId, tableNumber });
    setCheckoutTotal(0); 
    setCheckoutItems([]); 
    setPaymentsList([]); // Limpiamos pagos anteriores
    setCurrentPaymentAmount('');
    
    try {
      const activeOrder = await OrdersService.getActiveOrderByTable(tableId);
      setCheckoutTotal(activeOrder.total);
      setCheckoutItems(activeOrder.items); 
    } catch (error) {
      console.error('Error al obtener la cuenta:', error);
    }
  };

  const totalPaid = paymentsList.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = checkoutTotal - totalPaid;

  const handleAddPayment = () => {
    const amount = Number(currentPaymentAmount);
    if (!amount || amount <= 0) return;
    if (amount > remainingBalance) {
      return alert('El monto ingresado es mayor al saldo pendiente.');
    }
    
    setPaymentsList([...paymentsList, { method: currentPaymentMethod, amount }]);
    setCurrentPaymentAmount(''); // Limpiamos el input
  };

  const handleRemovePayment = (index: number) => {
    setPaymentsList(paymentsList.filter((_, i) => i !== index));
  };

  const processPayment = async () => {
    if (!checkoutModal) return;
    if (remainingBalance > 0) return alert('Falta dinero para completar el pago.');

    setIsSubmitting(true);
    try {
      await OrdersService.checkoutTable(checkoutModal.tableId, paymentsList);
      alert('¡Mesa liberada y cuenta pagada con éxito!');
      setCheckoutModal(null); 
      await refreshData();
    } catch (error) {
      alert('Hubo un error al intentar cobrar la mesa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const occupiedTables = tables.filter(t => t.status === 'OCCUPIED');

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* HEADER Y VISTA 1 INTACTOS */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Caja - Guadalupe Café ☕</h1>
          <p className="text-sm text-gray-500">Terminal de Punto de Venta</p>
        </div>
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button 
            onClick={() => { setActiveTab('NUEVA_ORDEN'); cancelEditing(); }}
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
        {activeTab === 'NUEVA_ORDEN' && (
          <>
            <div className="w-2/3 p-6 overflow-y-auto">
              {loading ? <p className="text-gray-600">Cargando...</p> : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((product) => (
                    <button 
                      key={product.id} onClick={() => addToCart(product)}
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
              <div className={`p-4 border-b border-gray-200 ${editingOrder ? 'bg-blue-50' : 'bg-gray-50'}`}>
                <h2 className="text-xl font-bold text-gray-800">
                  {editingOrder ? `Añadiendo a Mesa ${editingOrder.tableNumber}` : 'Nueva Cuenta'}
                </h2>
                {editingOrder && <button onClick={cancelEditing} className="text-sm text-red-500 hover:underline mt-1">Cancelar edición</button>}
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {cart.length === 0 ? <p className="text-gray-400 text-center mt-10">Toca un producto para agregarlo</p> : (
                  <ul className="space-y-3">
                    {cart.map((item) => (
                      <li key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div className="flex-1">
                          <span className="font-semibold text-gray-700">{item.name}</span>
                          <div className="text-sm text-gray-500">{item.cartQuantity} x ${item.price.toLocaleString()}</div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-gray-800">${(item.price * item.cartQuantity).toLocaleString()}</span>
                          <button onClick={() => removeFromCart(item.id)} className="bg-red-100 text-red-600 hover:bg-red-200 rounded-full w-8 h-8 font-bold">-</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-200">
                {!editingOrder && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Identificador / Alias</label>
                    <input type="text" placeholder="Ej. Los de la chaqueta roja" value={orderAlias} onChange={(e) => setOrderAlias(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-800 outline-none focus:border-amber-500" />
                  </div>
                )}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mesa del Cliente</label>
                  <select value={selectedTableId} onChange={(e) => setSelectedTableId(Number(e.target.value))} disabled={!!editingOrder} className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-800 disabled:bg-gray-200">
                    <option value="" disabled>-- Selecciona una Mesa --</option>
                    {tables.map(table => (
                      <option key={table.id} value={table.id} disabled={table.status === 'OCCUPIED' && !editingOrder}>
                        {table.number} {table.status === 'OCCUPIED' ? '(🔴 Ocupada)' : '(🟢 Libre)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-between items-center mb-4 text-xl font-bold">
                  <span>{editingOrder ? 'Aumento:' : 'Total:'}</span>
                  <span className="text-amber-600">${total.toLocaleString()}</span>
                </div>
                <button onClick={handleCheckout} disabled={cart.length === 0 || isSubmitting || !selectedTableId} className={`w-full text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-300 transition-colors ${editingOrder ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                  {isSubmitting ? 'Procesando...' : (editingOrder ? 'Confirmar Adición' : 'Enviar Pedido')}
                </button>
              </div>
            </div>
          </>
        )}

        {/* VISTA 2: MESAS ACTIVAS */}
        {activeTab === 'MESAS_ACTIVAS' && (
          <div className="w-full p-6 bg-gray-50 overflow-y-auto relative">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Control de Mesas</h2>
            {occupiedTables.length === 0 ? (
              <div className="text-center mt-20 text-gray-500">
                <p className="text-xl">🎉 Todas las mesas están libres</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {occupiedTables.map(table => {
                  const activeOrder = table.orders?.[0]; 
                  return (
                  <div key={table.id} className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-red-800 text-lg">{table.number}</h3>
                          {activeOrder?.alias && <p className="text-sm text-red-600 font-medium">"{activeOrder.alias}"</p>}
                        </div>
                        <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full">🔴 OCUPADA</span>
                      </div>
                      <div className="p-4 flex flex-col space-y-3">
                        <button onClick={() => handleStartAddingItems(table.id, table.number)} className="w-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-bold py-2 rounded-lg transition-colors flex justify-center items-center gap-2">
                          ➕ Añadir Productos
                        </button>
                      </div>
                    </div>
                    <div className="p-4 border-t border-gray-100 bg-gray-50">
                      <button onClick={() => openCheckoutModal(table.id, table.number)} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors shadow-sm">
                        💳 Ver Cuenta y Cobrar
                      </button>
                    </div>
                  </div>
                )})}
              </div>
            )}

            {/* --- MODAL EMERGENTE DE COBRO DIVIDIDO --- */}
            {checkoutModal && checkoutModal.isOpen && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-[500px] max-w-full">
                  <h3 className="text-2xl font-bold text-gray-800 mb-1">Cobrar {checkoutModal.tableNumber}</h3>
                  <p className="text-gray-500 mb-4 text-sm">Añade pagos hasta completar el total.</p>
                  
                  {/* Resumen Superior */}
                  <div className="bg-gray-800 text-white p-4 rounded-xl flex justify-between items-center mb-6">
                    <div>
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Total de la cuenta</p>
                      <span className="font-bold text-3xl">${checkoutTotal.toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Pendiente</p>
                      <span className={`font-bold text-2xl ${remainingBalance === 0 ? 'text-green-400' : 'text-amber-400'}`}>
                        ${remainingBalance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Controles para añadir pagos */}
                  {remainingBalance > 0 && (
                    <div className="flex space-x-2 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <select 
                        value={currentPaymentMethod}
                        onChange={(e) => setCurrentPaymentMethod(e.target.value)}
                        className="border border-gray-300 rounded-lg p-2 text-gray-700 w-1/3 outline-none"
                      >
                        <option value="CASH">Efectivo</option>
                        <option value="CARD">Tarjeta</option>
                        <option value="TRANSFER">Transf.</option>
                      </select>
                      <input 
                        type="number" 
                        placeholder="Monto..." 
                        value={currentPaymentAmount}
                        onChange={(e) => setCurrentPaymentAmount(Number(e.target.value))}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddPayment()}
                        className="border border-gray-300 rounded-lg p-2 text-gray-800 flex-1 outline-none focus:border-amber-500"
                      />
                      <button 
                        onClick={handleAddPayment}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-4 rounded-lg font-bold transition-colors"
                      >
                        Añadir
                      </button>
                    </div>
                  )}

                  {/* Lista de pagos ingresados */}
                  <div className="mb-6 min-h-[100px] border border-gray-100 rounded-lg p-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Pagos Ingresados</h4>
                    {paymentsList.length === 0 ? (
                      <p className="text-sm text-gray-400 px-2 italic">Aún no se han ingresado pagos.</p>
                    ) : (
                      <ul className="space-y-2">
                        {paymentsList.map((payment, index) => (
                          <li key={index} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-md border border-gray-100">
                            <span className="text-sm font-medium text-gray-700">{PAYMENT_LABELS[payment.method]}</span>
                            <div className="flex items-center space-x-3">
                              <span className="font-bold text-gray-800">${payment.amount.toLocaleString()}</span>
                              <button onClick={() => handleRemovePayment(index)} className="text-red-500 hover:text-red-700 font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-100 transition-colors">
                                ✕
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Botones Finales */}
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => setCheckoutModal(null)}
                      className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={processPayment}
                      disabled={isSubmitting || remainingBalance > 0}
                      className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:text-gray-500"
                    >
                      {isSubmitting ? 'Procesando...' : (remainingBalance === 0 ? '✔ Facturar y Liberar' : 'Completa el pago')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}