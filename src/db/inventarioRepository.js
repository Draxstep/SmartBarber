// src/db/inventarioRepository.js
import { openSmartBarberDB } from './database.js';

export class InventarioRepository {
  // CREATE PRODUCTO / INSUMO
  async createProducto(producto) {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('productos', 'readwrite');
      const store = tx.objectStore('productos');
      const request = store.add(producto);

      request.onsuccess = () => resolve(producto.id);
      request.onerror = () => reject(request.error);
    });
  }

  // READ ALL PRODUCTOS
  async getAllProductos() {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('productos', 'readonly');
      const store = tx.objectStore('productos');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // GET PRODUCTO POR ID
  async getProductoById(id) {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('productos', 'readonly');
      const store = tx.objectStore('productos');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // UPDATE PRODUCTO
  async updateProducto(producto) {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('productos', 'readwrite');
      const store = tx.objectStore('productos');
      const request = store.put(producto);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // DELETE PRODUCTO
  async deleteProducto(id) {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('productos', 'readwrite');
      const store = tx.objectStore('productos');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // OBTENER PRODUCTOS CON ALERTA DE STOCK MÍNIMO (RF-INV-03)
  async getProductosBajoStock() {
    const productos = await this.getAllProductos();
    return productos.filter(p => Number(p.stockActual) <= Number(p.stockMinimo));
  }

  // BÚSQUEDA DINÁMICA POR NOMBRE, CATEGORÍA O CÓDIGO DE BARRAS (RF-INV-07)
  async buscarProductos(termino, tipoFiltro = 'todos') {
    const productos = await this.getAllProductos();
    const cleanTerm = (termino || '').toLowerCase().trim();

    return productos.filter(p => {
      const matchTipo = tipoFiltro === 'todos' || p.tipo === tipoFiltro;
      if (!matchTipo) return false;

      if (!cleanTerm) return true;

      const matchNombre = (p.nombre || '').toLowerCase().includes(cleanTerm);
      const matchCat = (p.categoria || '').toLowerCase().includes(cleanTerm);
      const matchCod = (p.codigoBarras || '').toLowerCase().includes(cleanTerm);

      return matchNombre || matchCat || matchCod;
    });
  }

  /**
   * REGISTRO ATÓMICO EN KARDEX + ACTUALIZACIÓN DE STOCK (RF-INV-02 / RF-INV-04)
   * Tipos: 'entrada' | 'salida_venta' | 'salida_consumo' | 'salida_merma' | 'ajuste'
   */
  async registrarMovimientoKardex({
    productoId,
    tipo,
    cantidad,
    motivo,
    responsable = 'Administrador',
    costo = 0,
    proveedor = ''
  }) {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['productos', 'kardex'], 'readwrite');
      const prodStore = tx.objectStore('productos');
      const kardexStore = tx.objectStore('kardex');

      const prodRequest = prodStore.get(productoId);

      prodRequest.onsuccess = () => {
        const producto = prodRequest.result;
        if (!producto) {
          reject(new Error(`Producto no encontrado con ID: ${productoId}`));
          return;
        }

        const stockAnterior = Number(producto.stockActual) || 0;
        const cant = Number(cantidad) || 0;
        let nuevoStock = stockAnterior;

        if (tipo === 'entrada') {
          nuevoStock = stockAnterior + cant;
        } else if (tipo === 'salida_venta' || tipo === 'salida_consumo' || tipo === 'salida_merma') {
          if (stockAnterior < cant) {
            console.warn(`Stock insuficiente para ${producto.nombre}. El stock quedará en 0.`);
            nuevoStock = Math.max(0, stockAnterior - cant);
          } else {
            nuevoStock = stockAnterior - cant;
          }
        } else if (tipo === 'ajuste') {
          // Conteo físico: la cantidad ingresada es el stock real verificado
          nuevoStock = cant;
        }

        // 1. Actualizar producto
        producto.stockActual = nuevoStock;
        if (costo && tipo === 'entrada') {
          producto.costo = Number(costo);
        }
        prodStore.put(producto);

        // 2. Insertar entrada en Kardex
        const hoy = new Date().toISOString().split('T')[0];
        const hora = new Date().toTimeString().split(' ')[0].substring(0, 5);
        const kardexEntry = {
          id: 'kardex-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          productoId,
          productoNombre: producto.nombre,
          tipoProducto: producto.tipo,
          tipo,
          cantidad: cant,
          stockAnterior,
          stockNuevo: nuevoStock,
          motivo: motivo || (tipo === 'entrada' ? 'Compra de inventario' : 'Movimiento de inventario'),
          responsable,
          proveedor: proveedor || '',
          fecha: hoy,
          hora,
          timestamp: Date.now()
        };

        kardexStore.add(kardexEntry);
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // CONSULTAR MOVIMIENTOS KARDEX (TODOS O POR PRODUCTO)
  async getMovimientosKardex(productoId = null) {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kardex', 'readonly');
      const store = tx.objectStore('kardex');
      const request = store.getAll();

      request.onsuccess = () => {
        let list = request.result || [];
        if (productoId) {
          list = list.filter(m => m.productoId === productoId);
        }
        // Ordenar del más reciente al más antiguo
        list.sort((a, b) => b.timestamp - a.timestamp);
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // EXPORTAR KARDEX A CSV (RF-INV-07)
  async exportarKardexCSV() {
    const movimientos = await this.getMovimientosKardex();
    if (movimientos.length === 0) return null;

    const headers = ['Fecha', 'Hora', 'Producto', 'Tipo', 'Cantidad', 'Stock Anterior', 'Stock Nuevo', 'Responsable', 'Motivo'];
    const rows = movimientos.map(m => [
      `"${m.fecha}"`,
      `"${m.hora || ''}"`,
      `"${(m.productoNombre || '').replace(/"/g, '""')}"`,
      `"${m.tipo}"`,
      m.cantidad,
      m.stockAnterior,
      m.stockNuevo,
      `"${(m.responsable || '').replace(/"/g, '""')}"`,
      `"${(m.motivo || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return csvContent;
  }
}
