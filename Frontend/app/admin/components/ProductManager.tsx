'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Package, AlertTriangle, Save, X, Search } from 'lucide-react';

interface Category {
    id: number;
    name: string;
}

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    categoryId: number;
    category?: { name: string };
}

export default function ProductManager() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: 0,
        cost: 0,
        stock: 0,
        minStock: 5,
        categoryId: ''
    });

    // Asegúrate de tener NEXT_PUBLIC_API_URL=http://tu-ip:3000 en tu archivo .env.local
    const API_URL = process.env.NEXT_PUBLIC_API_URL;

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [prodRes, catRes] = await Promise.all([
                fetch(`${API_URL}/products`),
                fetch(`${API_URL}/categories`)
            ]);
            const [prods, cats] = await Promise.all([prodRes.json(), catRes.json()]);
            setProducts(prods);
            setCategories(cats);
        } catch (error) {
            console.error("Error cargando datos:", error);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.categoryId) return alert("Selecciona una categoría");

        try {
            const response = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    price: Number(formData.price),
                    cost: Number(formData.cost),
                    stock: Number(formData.stock),
                    minStock: Number(formData.minStock),
                    categoryId: Number(formData.categoryId)
                })
            });

            if (response.ok) {
                setIsModalOpen(false);
                setFormData({ name: '', description: '', price: 0, cost: 0, stock: 0, minStock: 5, categoryId: '' });
                fetchInitialData();
            } else {
                alert("Hubo un error al guardar. Revisa los datos.");
            }
        } catch (error) {
            alert("Error de conexión al servidor");
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Package className="text-amber-600" /> Inventario de Productos
                    </h2>
                    <p className="text-gray-500 text-sm">Gestiona existencias, costos y precios de venta.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 active:scale-95"
                >
                    <Plus size={20} /> Nuevo Producto
                </button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar por nombre..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-gray-800 font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="p-4 text-xs font-bold text-gray-400 uppercase">Producto</th>
                            <th className="p-4 text-xs font-bold text-gray-400 uppercase">Categoría</th>
                            <th className="p-4 text-xs font-bold text-gray-400 uppercase text-right">Precio</th>
                            <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Stock</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredProducts.map(product => {
                            // 👇 MAGIA AQUÍ: Buscamos el nombre de la categoría en la lista que ya descargamos
                            const matchedCategory = categories.find(c => c.id === product.categoryId);
                            const displayCategoryName = matchedCategory ? matchedCategory.name : (product.category?.name || 'S/C');

                            return (
                                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-gray-700">{product.name}</div>
                                        <div className="text-xs text-gray-400">{product.description || 'Sin descripción'}</div>
                                    </td>
                                    <td className="p-4">
                                        {/* 👇 Usamos nuestra nueva variable displayCategoryName */}
                                        <span className="bg-gray-100 text-gray-800 text-[10px] font-bold px-2 py-1 rounded uppercase">
                                            {displayCategoryName}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-bold text-amber-600">
                                        ${product.price.toLocaleString()}
                                    </td>
                                    <td className="p-4">
                                        <div className={`flex items-center justify-center gap-1 font-bold text-sm ${product.stock <= product.minStock ? 'text-red-500' : 'text-green-600'}`}>
                                            {product.stock <= product.minStock && <AlertTriangle size={14} />}
                                            {product.stock}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-400 italic">
                                    No hay productos que coincidan con la búsqueda.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800">Registrar Item</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nombre del Producto/Insumo</label>
                                {/* 👇 text-gray-800 */}
                                <input required type="text" className="w-full border-b-2 border-gray-200 p-2 outline-none focus:border-amber-500 transition-colors text-lg font-bold text-gray-800 bg-transparent"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Categoría</label>
                                {/* 👇 text-gray-800 */}
                                <select required className="w-full border-b-2 border-gray-200 p-2 outline-none focus:border-amber-500 bg-white text-gray-800 font-medium"
                                    value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })}>
                                    <option value="">Seleccionar...</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Precio de Venta</label>
                                {/* Este ya tenía text-amber-600, le ponemos bg-transparent */}
                                <input required type="number" className="w-full border-b-2 border-gray-200 p-2 outline-none focus:border-amber-500 font-bold text-amber-600 bg-transparent text-lg"
                                    value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Costo de Compra</label>
                                {/* 👇 text-gray-800 */}
                                <input required type="number" className="w-full border-b-2 border-gray-200 p-2 outline-none focus:border-amber-500 text-gray-800 bg-transparent font-medium"
                                    value={formData.cost} onChange={e => setFormData({ ...formData, cost: Number(e.target.value) })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Stock Actual</label>
                                    {/* 👇 text-gray-800 */}
                                    <input required type="number" className="w-full border-b-2 border-gray-200 p-2 outline-none focus:border-amber-500 text-gray-800 bg-transparent font-medium"
                                        value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Stock Mínimo</label>
                                    {/* 👇 text-gray-800 */}
                                    <input required type="number" className="w-full border-b-2 border-gray-200 p-2 outline-none focus:border-amber-500 text-gray-800 bg-transparent font-medium"
                                        value={formData.minStock} onChange={e => setFormData({ ...formData, minStock: Number(e.target.value) })} />
                                </div>
                            </div>

                            <div className="md:col-span-2 mt-4 flex gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 py-4 bg-amber-600 text-white rounded-xl font-bold shadow-lg hover:bg-amber-700 flex items-center justify-center gap-2 transition-all active:scale-95">
                                    <Save size={20} /> Guardar Producto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}