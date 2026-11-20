/**
 * @file InventarioService.js
 * @description Servicio de aplicación para gestión de inventario, kardex y stock (CU-016 a CU-019).
 */
import { ProductoInventario } from '../domain/ProductoInventario.js';
import { InventarioPgRepository } from '../repositories/InventarioPgRepository.js';
import { runTransaction } from '../../../shared/database/transaction.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../../shared/errors/domainErrors.js';
import { pushService } from '../../../services/push.service.js';

export class InventarioService {
  constructor(inventarioRepo = null) {
    this.inventarioRepo = inventarioRepo || new InventarioPgRepository();
  }

  async listProductos(sedeId, { categoria = null, activosSolo = false } = {}) {
    return await this.inventarioRepo.findBySede(sedeId, { categoria, activosSolo });
  }

  async getProductoById(id) {
    const prod = await this.inventarioRepo.findById(id);
    if (!prod) {
      throw new NotFoundError('ProductoInventario', id);
    }
    return prod;
  }

  async getAlertasStock(sedeId) {
    return await this.inventarioRepo.findAlertasStock(sedeId);
  }

  /**
   * Crea un producto y si tiene stock inicial genera el primer movimiento Kardex (CU-016, RF-INV-01).
   */
  async createProducto(data, user) {
    if (user.rol !== 'administrador') {
      throw new ForbiddenError('Solo el Administrador puede registrar nuevos productos en inventario.');
    }

    return await runTransaction(async (client) => {
      const nuevoProducto = new ProductoInventario({
        sedeId: data.sedeId || user.sedeId,
        sku: data.sku || null,
        nombre: data.nombre,
        categoria: data.categoria,
        precioVentaCop: data.precioVentaCop,
        costoUnitarioCop: data.costoUnitarioCop || null,
        stockActual: 0, // Se inicializa en 0 y sube por movimiento
        stockMinimo: data.stockMinimo || 0,
        estado: data.estado || 'activo'
      });

      const guardado = await this.inventarioRepo.saveProducto(nuevoProducto, { client });

      // Si se indicó stock inicial mayor a 0, registrar movimiento inicial para trazabilidad
      if (data.stockInicial && data.stockInicial > 0) {
        await this.inventarioRepo.registrarMovimiento(
          {
            sedeId: guardado.sedeId,
            productoId: guardado.productoId,
            tipo: 'entrada',
            subtipo: 'inventario_inicial',
            cantidad: data.stockInicial,
            costoUnitarioCop: data.costoUnitarioCop || null,
            observacion: 'Carga inicial de inventario',
            usuarioId: user.id
          },
          { client }
        );

        guardado.stockActual = data.stockInicial;
      }

      return guardado;
    });
  }

  async updateProducto(id, data, user) {
    if (user.rol !== 'administrador') {
      throw new ForbiddenError('Solo el Administrador puede editar fichas maestras de productos.');
    }

    const producto = await this.inventarioRepo.findById(id);
    if (!producto) {
      throw new NotFoundError('ProductoInventario', id);
    }

    // Prohibido alterar directamente stockActual en actualización (RF-INV-01)
    const { stockActual, stockInicial, ...allowedData } = data;
    Object.assign(producto, allowedData);

    return await this.inventarioRepo.saveProducto(producto);
  }

  /**
   * Registrar entrada de existencias (CU-017, RF-INV-02, exclusivo Administrador).
   */
  async registrarEntrada(productoId, dto, user) {
    if (user.rol !== 'administrador') {
      throw new ForbiddenError('Solo el Administrador puede registrar entradas de inventario.');
    }

    const producto = await this.inventarioRepo.findById(productoId);
    if (!producto) {
      throw new NotFoundError('ProductoInventario', productoId);
    }

    return await this.inventarioRepo.registrarMovimiento({
      sedeId: user.sedeId,
      productoId,
      tipo: 'entrada',
      subtipo: dto.motivo || 'compra_reposicion',
      cantidad: dto.cantidad,
      costoUnitarioCop: dto.costoUnitarioCop || producto.costoUnitarioCop,
      observacion: dto.observacion || null,
      usuarioId: user.id
    });
  }

  /**
   * Registrar salida de existencias por venta o consumo interno (CU-018, RF-INV-03).
   */
  async registrarSalida(productoId, dto, user) {
    const producto = await this.inventarioRepo.findById(productoId);
    if (!producto) {
      throw new NotFoundError('ProductoInventario', productoId);
    }

    const subtipo = dto.tipo === 'venta_al_publico' ? 'venta_publico' : dto.tipo;
    let precioUnitarioCop = null;
    if (subtipo === 'venta_publico') {
      precioUnitarioCop = producto.precioVentaCop;
    }

    const resultado = await this.inventarioRepo.registrarMovimiento({
      sedeId: user.sedeId,
      productoId,
      tipo: 'salida',
      subtipo,
      cantidad: dto.cantidad,
      precioUnitarioCop,
      metodoPago: dto.metodoPago || null,
      registroCorteId: dto.registroCorteId || null,
      observacion: dto.observacion || null,
      usuarioId: user.id
    });

    // Disparar Notificación Push VAPID si el producto queda en Stock bajo o Agotado (RN-11 / CU-018)
    if (resultado?.producto && resultado.producto.stockActual <= resultado.producto.stockMinimo) {
      pushService
        .notificarAlertaInventario({
          productoId: resultado.producto.productoId,
          nombre: resultado.producto.nombre,
          stockActual: resultado.producto.stockActual,
          stockMinimo: resultado.producto.stockMinimo,
          agotado: resultado.producto.stockActual === 0
        })
        .catch((err) => console.error('Error al despachar Push de alerta de inventario:', err));
    }

    return resultado;
  }

  async getKardex(productoId) {
    await this.getProductoById(productoId);
    return await this.inventarioRepo.getKardexByProducto(productoId);
  }

  async getMovimientos(filters, user) {
    return await this.inventarioRepo.findMovimientosWithFilters({
      sedeId: user.sedeId,
      ...filters
    });
  }
}
