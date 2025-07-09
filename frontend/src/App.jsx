import React, { useState, useEffect } from 'react';
import { 
  Mic, MicOff, X, Send, Check, Loader2, Volume2, 
  Package, ShoppingCart, AlertCircle, ChevronRight,
  Users, BarChart3, Plus, Edit, Trash2, Search, Calendar,
  TrendingUp, DollarSign, Clock, User
} from 'lucide-react';

export default function TiboAIAssistant() {
  // Estados existentes
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [editingVenta, setEditingVenta] = useState(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [showCatalogo, setShowCatalogo] = useState(false);
  
  // Estados para grabación real de audio
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [isRecordingSupported, setIsRecordingSupported] = useState(true);

  // Nuevo estado para navegación
  const [activeTab, setActiveTab] = useState('tibo');

  // Estados para las nuevas secciones
  const [pedidos, setPedidos] = useState([
    {
      id: 1,
      fecha: '2025-01-27',
      cliente: 'Juan Carlos',
      productos: [
        { producto: 'Tomates almita', cantidad: 20, precio: 5500 }
      ],
      total: 110000,
      estado: 'completado'
    },
    {
      id: 2,
      fecha: '2025-01-27',
      cliente: 'María López',
      productos: [
        { producto: 'Papas', cantidad: 15, precio: 3200 },
        { producto: 'Cebollas', cantidad: 10, precio: 2800 }
      ],
      total: 76000,
      estado: 'pendiente'
    }
  ]);

  const [inventario, setInventario] = useState([
    { id: 1, producto: 'Tomates almita', stock: 50, precio: 5500, categoria: 'Verduras' },
    { id: 2, producto: 'Papas', stock: 30, precio: 3200, categoria: 'Verduras' },
    { id: 3, producto: 'Cebollas', stock: 25, precio: 2800, categoria: 'Verduras' },
    { id: 4, producto: 'Manzanas', stock: 40, precio: 4200, categoria: 'Frutas' }
  ]);

  const [clientes, setClientes] = useState([
    { id: 1, nombre: 'Juan Carlos', telefono: '11-1234-5678', ultimaCompra: '2025-01-27', totalCompras: 5 },
    { id: 2, nombre: 'María López', telefono: '11-8765-4321', ultimaCompra: '2025-01-27', totalCompras: 8 },
    { id: 3, nombre: 'Carlos Mendez', telefono: '11-5555-1234', ultimaCompra: '2025-01-26', totalCompras: 3 }
  ]);

  // API Configuration
  const API_BASE_URL = 'http://localhost:8000';

  // Componentes para cada sección
  const TiboScreen = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-green-900 text-white p-4 shadow-lg">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              {/* Lightning icon verde */}
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path fill="#059669" d="M13 2L3 14h7v8l10-12h-7V2z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-center">tibó v2</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {conversation.map((message, index) => (
          <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            {/* User message */}
            {message.type === 'user' && (
              <div className="bg-blue-500 text-white p-3 rounded-2xl max-w-xs">
                <p className="text-sm">{message.content}</p>
              </div>
            )}
            
            {/* AI message */}
            {message.type === 'ai' && (
              <div className="bg-white rounded-2xl p-3 shadow-sm max-w-xs">
                <p className="text-sm text-gray-800">{message.content}</p>
                
                {/* Action card */}
                {message.action && (
                  <button
                    onClick={() => handleEditAction(message.action)}
                    className="w-full mt-3 p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {message.action.type === 'nueva_venta' ? (
                          <ShoppingCart size={16} className="text-green-600" />
                        ) : (
                          <Package size={16} className="text-green-600" />
                        )}
                        <span className="text-sm font-medium text-green-800">
                          {message.action.type === 'nueva_venta' ? 'Nueva Venta' : 'Ingresar Mercadería'}
                        </span>
                      </div>
                      <ChevronRight size={16} className="text-green-600" />
                    </div>
                    
                    {message.action.type === 'nueva_venta' && (
                      <div className="text-sm text-gray-600">
                        {message.action.data.productos.map((p, i) => (
                          <div key={i}>{p.cantidad}x {p.producto}</div>
                        ))}
                      </div>
                    )}
                  </button>
                )}
              </div>
            )}
            
            {/* System messages */}
            {message.type === 'system' && (
              <div className="text-center">
                <span className="text-sm text-gray-600 bg-gray-200 px-3 py-1 rounded-full">
                  {message.content}
                </span>
                {message.content.includes('Venta generada exitosamente') && (
                  <div className="flex justify-center gap-2 mt-3">
                    <button className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold text-sm">IMPRIMIR</button>
                    <button className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold text-sm">COMPARTIR</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-2">
              <Loader2 size={16} className="animate-spin text-green-500" />
              <span className="text-gray-600">El robot está pensando...</span>
            </div>
          </div>
        )}
      </div>

      {/* Executing State */}
      {isExecuting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-20">
          <div className="w-64 flex flex-col items-center">
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-green-500 animate-loading-bar" style={{width: '40%'}}></div>
            </div>
            <span className="text-green-700 font-medium text-lg">Procesando venta...</span>
          </div>
        </div>
      )}

      {/* Controles */}
      <div className="p-4 bg-white border-t border-gray-200">
        {/* Input de texto */}
        {showTextInput && (
          <div className="mb-3 flex items-center space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Escribí tu mensaje..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={isProcessing || isExecuting}
              autoFocus
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isProcessing || isExecuting}
              className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
        )}
        
        {/* Botones principales */}
        <div className="flex items-center justify-center space-x-4">
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            disabled={isProcessing || isExecuting || !isRecordingSupported}
            className={`w-24 h-24 rounded-full transition-all duration-200 flex items-center justify-center shadow-neomorph \
              ${isListening 
                ? 'bg-red-500 text-white scale-110' 
                : 'bg-green-500 text-white hover:bg-green-600'} \
              disabled:opacity-50`}
            title={!isRecordingSupported ? 'Grabación de audio no soportada' : 'Mantené presionado para grabar'}
          >
            {isListening ? (
              <div className="relative">
                <MicOff size={40} />
                <div className="absolute inset-0 animate-pulse bg-red-300 rounded-full opacity-50"></div>
              </div>
            ) : (
              <Mic size={40} />
            )}
          </button>

          <button
            onClick={() => setShowTextInput(!showTextInput)}
            disabled={isProcessing || isExecuting}
            className={`px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 ${
              showTextInput 
                ? 'bg-green-500 text-white border-green-500' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Chat
          </button>
        </div>
      </div>
    </div>
  );

  const PedidosScreen = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Pedidos</h1>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-600 hover:text-gray-800">
              <Search size={20} />
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-800">
              <Calendar size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Lista de pedidos */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {pedidos.map((pedido) => (
          <div key={pedido.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-800">{pedido.cliente}</h3>
                <p className="text-sm text-gray-600">{pedido.fecha}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">${pedido.total.toLocaleString()}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  pedido.estado === 'completado' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {pedido.estado}
                </span>
              </div>
            </div>
            
            <div className="space-y-1">
              {pedido.productos.map((producto, index) => (
                <div key={index} className="flex justify-between text-sm text-gray-600">
                  <span>{producto.cantidad}x {producto.producto}</span>
                  <span>${(producto.cantidad * producto.precio).toLocaleString()}</span>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end space-x-2 mt-3">
              <button className="p-2 text-blue-600 hover:text-blue-800">
                <Edit size={16} />
              </button>
              <button className="p-2 text-red-600 hover:text-red-800">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const InventarioScreen = () => (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Inventario</h1>
          <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center space-x-2">
            <Plus size={20} />
            <span>Agregar</span>
          </button>
        </div>
      </div>

      {/* Lista de productos */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Filtros hardcodeados */}
        <div className="flex gap-2 mb-4">
          <button className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium text-sm">Más stock</button>
          <button className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium text-sm">Menos stock</button>
          <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium text-sm">Últimos ingresos</button>
        </div>
        {/* Fin filtros */}
        {inventario.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{item.producto}</h3>
                <p className="text-sm text-gray-600">{item.categoria}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-sm text-gray-600">Stock: {item.stock}</span>
                  <span className="text-sm font-medium text-green-600">${item.precio.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-blue-600 hover:text-blue-800">
                  <Edit size={16} />
                </button>
                <button className="p-2 text-red-600 hover:text-red-800">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="mt-3 flex justify-between items-center">
              <div className={`text-sm ${item.stock < 10 ? 'text-red-600' : 'text-green-600'}`}>{item.stock < 10 ? 'Stock bajo' : 'Stock disponible'}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Botón flotante Catálogo digital */}
      <button
        onClick={() => setShowCatalogo(true)}
        className="fixed bottom-24 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center px-5 py-3 gap-2 z-50"
        style={{boxShadow: '0 4px 16px rgba(0,0,0,0.12)'}}
        title="Catálogo digital"
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M4 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a1 1 0 0 1-1.447.894L12 17.118l-4.553 2.776A1 1 0 0 1 6 19V5Zm2 0v13.382l4-2.437 4 2.437V5H6Z"/></svg>
        <span className="font-semibold">Catálogo digital</span>
      </button>
      {/* Pantalla mockup catálogo digital */}
      {showCatalogo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-auto p-6 relative flex flex-col min-h-[60vh]">
            {/* Header catálogo */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Catálogo digital</h2>
              <button onClick={() => setShowCatalogo(false)} className="p-2 text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <p className="text-gray-600 text-sm mb-4">Seleccioná los productos que querés mostrar en tu catálogo digital. Podés fijar precios, ocultar cantidades y compartir el link o imprimir un QR.</p>
            <div className="flex-1 overflow-y-auto space-y-4">
              {inventario.map((item, idx) => (
                <div key={item.id} className="border rounded-lg p-3 flex flex-col gap-2 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">{item.producto}</span>
                    {/* Switch on/off */}
                    <label className="inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-500 transition-all"></div>
                      <div className="absolute w-4 h-4 bg-white rounded-full shadow -ml-8 mt-0.5 peer-checked:translate-x-4 transition-transform"></div>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Precio:</span>
                    <input type="number" defaultValue={item.precio} className="w-24 p-1 border rounded text-sm" />
                    <label className="flex items-center gap-1 ml-4 text-xs text-gray-500">
                      <input type="checkbox" className="accent-blue-500" defaultChecked /> Ocultar cantidad
                    </label>
                  </div>
                </div>
              ))}
            </div>
            {/* Acciones compartir/QR */}
            <div className="flex justify-end gap-2 mt-6">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm flex items-center gap-1"><svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M15 8a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3h8Zm0 2H7a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1Zm2-6a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V5h-2a1 1 0 1 1 0-2h2a3 3 0 0 1 3 3v2a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1ZM5 4a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2H6v2a1 1 0 1 1-2 0V5a3 3 0 0 1 3-3h2a1 1 0 1 1 0 2H6a1 1 0 0 0-1 1v2a1 1 0 1 1-2 0V5a3 3 0 0 1 3-3h2a1 1 0 1 1 0 2H6a1 1 0 0 0-1 1v2a1 1 0 1 1-2 0V5a3 3 0 0 1 3-3h2a1 1 0 1 1 0 2H6a1 1 0 0 0-1 1v2a1 1 0 1 1-2 0V5Z"/></svg> Compartir</button>
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm flex items-center gap-1"><svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M3 3v18h18V3H3Zm16 16H5V5h14v14Zm-2-2v-2h-2v2h2Zm-4 0v-2h-2v2h2Zm-4 0v-2H7v2h2Zm8-4v-2h-2v2h2Zm-4 0v-2h-2v2h2Zm-4 0v-2H7v2h2Zm8-4V7h-2v2h2Zm-4 0V7h-2v2h2Zm-4 0V7H7v2h2Z"/></svg> Imprimir QR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const ClientesScreen = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Clientes</h1>
          <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center space-x-2">
            <Plus size={20} />
            <span>Agregar</span>
          </button>
        </div>
      </div>

      {/* Lista de clientes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {clientes.map((cliente) => (
          <div key={cliente.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <User size={20} className="text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{cliente.nombre}</h3>
                  <p className="text-sm text-gray-600">{cliente.telefono}</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-gray-600">Última compra:</p>
                <p className="text-sm font-medium">{cliente.ultimaCompra}</p>
                <p className="text-xs text-gray-500">{cliente.totalCompras} compras</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-3">
              <button className="p-2 text-blue-600 hover:text-blue-800">
                <Edit size={16} />
              </button>
              <button className="p-2 text-green-600 hover:text-green-800">
                <ShoppingCart size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ReportesScreen = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Reportes</h1>
      </div>

      {/* Métricas */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ventas Hoy</p>
                <p className="text-2xl font-bold text-green-600">$186,000</p>
              </div>
              <DollarSign size={24} className="text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pedidos Hoy</p>
                <p className="text-2xl font-bold text-blue-600">12</p>
              </div>
              <ShoppingCart size={24} className="text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Productos más vendidos</h3>
            <TrendingUp size={20} className="text-green-500" />
          </div>
          
          <div className="space-y-3">
            {[
              { producto: 'Tomates almita', ventas: 45, ingresos: 247500 },
              { producto: 'Papas', ventas: 32, ingresos: 102400 },
              { producto: 'Cebollas', ventas: 28, ingresos: 78400 }
            ].map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{item.producto}</p>
                  <p className="text-sm text-gray-600">{item.ventas} unidades vendidas</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">${item.ingresos.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const BottomNavigator = () => {
    const tabs = [
      { id: 'tibo', label: 'Tibó', icon: Mic },
      { id: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
      { id: 'inventario', label: 'Inventario', icon: Package },
      { id: 'clientes', label: 'Clientes', icon: Users },
      { id: 'reportes', label: 'Reportes', icon: BarChart3 },
    ];

    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50 max-w-xl mx-auto">
        <div className="flex justify-around items-center">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                activeTab === id 
                  ? 'text-green-600 bg-green-50' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs mt-1">{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Inicializar grabación de audio al montar el componente
  useEffect(() => {
    const checkAudioSupport = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('MediaDevices API not supported');
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            volume: 1.0
          } 
        });
        
        // Detener el stream de prueba
        stream.getTracks().forEach(track => track.stop());
        
        setIsRecordingSupported(true);
      } catch (error) {
        console.error('Audio recording not supported:', error);
        setIsRecordingSupported(false);
      }
    };

    checkAudioSupport();
  }, []);

  // Llamar al backend real para procesar texto
  const processTextWithBackend = async (text) => {
    try {
      const response = await fetch(`${API_BASE_URL}/process-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return convertBackendResponseToUI(result);
    } catch (error) {
      console.error('Error calling backend:', error);
      return {
        type: 'query',
        message: 'Hubo un error procesando tu solicitud. ¿Podés intentar de nuevo?'
      };
    }
  };

  // Llamar al backend real para procesar audio
  const processAudioWithBackend = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.wav');

      const response = await fetch(`${API_BASE_URL}/process-audio`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return convertBackendResponseToUI(result);
    } catch (error) {
      console.error('Error calling backend:', error);
      return {
        type: 'query',
        message: 'Hubo un error procesando el audio. ¿Podés intentar de nuevo?'
      };
    }
  };

  // Convertir respuesta del backend al formato que espera la UI
  const convertBackendResponseToUI = (backendResponse) => {
    if (backendResponse.status === 'error') {
      return {
        type: 'query',
        message: `Error: ${backendResponse.error}`
      };
    }

    const order = backendResponse.order;
    
    if (order.tipo === 'orden') {
      // Convertir items del backend al formato de la UI
      const productos = order.items.map(item => ({
        producto: item.producto,
        cantidad: item.cantidad,
        precio: item.precio_unitario || 0
      }));

      return {
        type: 'action',
        message: `Perfecto, procesé tu pedido. Detecté ${productos.length} producto${productos.length > 1 ? 's' : ''} para ${order.cliente || 'el cliente'}. Tocá la tarjeta para editarla.`,
        action: {
          type: 'nueva_venta',
          data: {
            fecha: new Date().toISOString().split('T')[0],
            cliente: order.cliente || '',
            productos: productos,
            costoEnvase: 0,
            // Información adicional del backend
            transcript: backendResponse.transcript,
            ticketId: backendResponse.ticket_id,
            processingTime: backendResponse.processing_time_ms
          }
        }
      };
    } else if (order.tipo === 'ingreso') {
      return {
        type: 'action',
        message: 'Perfecto, voy a registrar el ingreso de mercadería. Tocá la tarjeta para editarla.',
        action: {
          type: 'ingresar_mercaderia',
          data: {
            producto: order.items[0]?.producto || 'Producto',
            cantidad: `${order.items[0]?.cantidad || 1} ${order.items[0]?.unidad || 'unidades'}`,
            proveedor: order.proveedor || 'Proveedor',
            precio: order.items[0]?.precio_unitario ? `$${order.items[0].precio_unitario}` : '$0'
          }
        }
      };
    } else {
      return {
        type: 'query',
        message: backendResponse.transcript ? 
          `Transcripción: "${backendResponse.transcript}". No pude identificar si es una venta o ingreso de mercadería.` :
          'No pude entender la solicitud. ¿Podés ser más específico?'
      };
    }
  };

  const handleSendMessage = async (text = inputText) => {
    if (!text.trim()) return;

    const userMessage = { type: 'user', content: text };
    setConversation(prev => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);

    try {
      // Llamar al backend real
      const response = await processTextWithBackend(text);
      const aiMessage = { type: 'ai', content: response.message, action: response.action };
      
      setConversation(prev => [...prev, aiMessage]);
      
      if (response.action) {
        setPendingAction(response.action);
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage = { 
        type: 'ai', 
        content: 'Hubo un error procesando tu mensaje. ¿Podés intentar de nuevo?' 
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!editingVenta) return;
    
    setIsExecuting(true);
    setShowBottomSheet(false);
    
    // Simular ejecución de acción
    setTimeout(() => {
      const successMessage = {
        type: 'system',
        content: '✅ Venta generada exitosamente'
      };
      
      setConversation(prev => [...prev, successMessage]);
      setEditingVenta(null);
      setPendingAction(null);
      setIsExecuting(false);
    }, 2000);
  };

  const handleEditAction = (action) => {
    if (action.type === 'nueva_venta') {
      setEditingVenta(action.data);
      setShowBottomSheet(true);
    }
  };

  const handleCancelEdit = () => {
    setShowBottomSheet(false);
    setEditingVenta(null);
    setPendingAction(null);
    
    const cancelMessage = {
      type: 'system',
      content: '❌ Venta cancelada'
    };
    setConversation(prev => [...prev, cancelMessage]);
  };

  const addProductToVenta = () => {
    setEditingVenta(prev => ({
      ...prev,
      productos: [...prev.productos, { producto: '', cantidad: 1, precio: 0 }]
    }));
  };

  const updateProduct = (index, field, value) => {
    setEditingVenta(prev => ({
      ...prev,
      productos: prev.productos.map((p, i) => 
        i === index ? { ...p, [field]: value } : p
      )
    }));
  };

  const removeProduct = (index) => {
    setEditingVenta(prev => ({
      ...prev,
      productos: prev.productos.filter((_, i) => i !== index)
    }));
  };

  // Iniciar grabación real de audio
  const startRecording = async () => {
    if (!isRecordingSupported) {
      alert('Tu navegador no soporta grabación de audio');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          volume: 1.0
        } 
      });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      });
      
      const chunks = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: recorder.mimeType });
        await handleAudioRecording(audioBlob);
        
        // Detener el stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsListening(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('No se pudo acceder al micrófono. Por favor, da permisos de audio.');
    }
  };

  // Detener grabación
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsListening(false);
    }
  };

  // Procesar audio grabado
  const handleAudioRecording = async (audioBlob) => {
    setIsProcessing(true);
    
    try {
      // Mostrar mensaje de transcripción
      const userMessage = { type: 'user', content: '🎙️ Audio grabado' };
      setConversation(prev => [...prev, userMessage]);

      // Enviar al backend
      const response = await processAudioWithBackend(audioBlob);
      const aiMessage = { type: 'ai', content: response.message, action: response.action };
      
      setConversation(prev => [...prev, aiMessage]);
      
      if (response.action) {
        setPendingAction(response.action);
      }
      
    } catch (error) {
      console.error('Error processing audio:', error);
      const errorMessage = { 
        type: 'ai', 
        content: 'Hubo un error procesando el audio. ¿Podés intentar de nuevo?' 
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderCurrentScreen = () => {
    switch (activeTab) {
      case 'tibo':
        return <TiboScreen />;
      case 'pedidos':
        return <PedidosScreen />;
      case 'inventario':
        return <InventarioScreen />;
      case 'clientes':
        return <ClientesScreen />;
      case 'reportes':
        return <ReportesScreen />;
      default:
        return <TiboScreen />;
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-xl mx-auto bg-white relative">
      {/* Contenido principal */}
      <div className="flex-1 overflow-hidden pb-16">
        {renderCurrentScreen()}
      </div>

      {/* Bottom Navigator */}
      <BottomNavigator />

      {/* Bottom Sheet para editar venta */}
      {showBottomSheet && editingVenta && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleCancelEdit}></div>
          
          <div className="relative bg-white rounded-t-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">Editar Venta</h2>
              <button onClick={handleCancelEdit} className="p-2 text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Fecha y Cliente */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={editingVenta.fecha}
                    onChange={(e) => setEditingVenta(prev => ({ ...prev, fecha: e.target.value }))}
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                  <input
                    type="text"
                    value={editingVenta.cliente}
                    onChange={(e) => setEditingVenta(prev => ({ ...prev, cliente: e.target.value }))}
                    placeholder="Nombre del cliente"
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Productos */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Productos</label>
                  <button
                    onClick={addProductToVenta}
                    className="px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                  >
                    + Agregar
                  </button>
                </div>
                
                <div className="space-y-3">
                  {editingVenta.productos.map((producto, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-gray-700">Producto {index + 1}</span>
                        {editingVenta.productos.length > 1 && (
                          <button
                            onClick={() => removeProduct(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={producto.producto}
                          onChange={(e) => updateProduct(index, 'producto', e.target.value)}
                          placeholder="Nombre del producto"
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Cantidad</label>
                            <input
                              type="number"
                              value={producto.cantidad}
                              onChange={(e) => updateProduct(index, 'cantidad', parseInt(e.target.value) || 0)}
                              min="1"
                              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Precio unitario</label>
                            <input
                              type="number"
                              value={producto.precio}
                              onChange={(e) => updateProduct(index, 'precio', parseFloat(e.target.value) || 0)}
                              step="0.01"
                              min="0"
                              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Costo Envase */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo envase (opcional)
                </label>
                <input
                  type="number"
                  value={editingVenta.costoEnvase}
                  onChange={(e) => setEditingVenta(prev => ({ ...prev, costoEnvase: parseFloat(e.target.value) || 0 }))}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-700">Total:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${(editingVenta.productos.reduce((total, p) => total + (p.cantidad * p.precio), 0) + editingVenta.costoEnvase).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex space-x-3">
              <button
                onClick={handleCancelEdit}
                className="flex-1 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAction}
                className="flex-1 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
              >
                Confirmar Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
