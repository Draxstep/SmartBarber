/**
 * @file syncRoutes.js
 * @description Receptor idempotente de sincronización en segundo plano (POST /api/v1/sync/outbox).
 * Procesa mutaciones offline del Backoffice bajo transacciones ACID con registro en sync_idempotencia.
 */
import { Router } from 'express';
import { authenticate } from '../../../shared/middlewares/authenticate.js';
import { getDatabasePool } from '../../../shared/database/connection.js';
import { CorteService } from '../../cortes/services/CorteService.js';
import { CitaService } from '../services/CitaService.js';
import { InventarioService } from '../../inventario/services/InventarioService.js';
import { BarberoService } from '../../barberos/services/BarberoService.js';

export const syncRouter = Router();

const corteService = new CorteService();
const citaService = new CitaService();
const inventarioService = new InventarioService();
const barberoService = new BarberoService();

/**
 * Receptor idempotente para cola Outbox
 */
syncRouter.post('/outbox', authenticate, async (req, res, next) => {
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    const { idCambio, tipo, payload } = req.body;

    if (!idCambio || !tipo || !payload) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OUTBOX_PAYLOAD',
          message: 'Se requiere idCambio (UUID), tipo de operación y payload.'
        }
      });
    }

    // 1. Verificación de Idempotencia: ¿Ya fue procesado previamente este UUID?
    const checkDup = await client.query(
      'SELECT respuesta_json FROM sync_idempotencia WHERE id_cambio = $1 LIMIT 1',
      [idCambio]
    );

    if (checkDup.rows.length > 0) {
      console.log(`🔁 [SYNC IDEMPOTENCIA]: idCambio ${idCambio} detectado como duplicado. Retornando respuesta previa.`);
      return res.status(200).json({
        success: true,
        ok: true,
        duplicado: true,
        data: checkDup.rows[0].respuesta_json
      });
    }

    // 2. Procesar la mutación según el tipo encolado
    let resultado = null;

    switch (tipo) {
      case 'CREAR_CORTE_WALKIN': {
        resultado = await corteService.registrarWalkIn(payload, req.user);
        break;
      }

      case 'COMPLETAR_CITA': {
        const { citaId, ...corteData } = payload;
        resultado = await corteService.convertirCitaACorte(citaId, corteData, req.user);
        break;
      }

      case 'CAMBIAR_ESTADO_CITA': {
        const { citaId, ...estadoData } = payload;
        resultado = await citaService.cambiarEstado(citaId, estadoData, req.user);
        break;
      }

      case 'MOVIMIENTO_INVENTARIO': {
        const { productoId, tipo: tipoMov, ...movData } = payload;
        if (tipoMov === 'entrada') {
          resultado = await inventarioService.registrarEntrada(productoId, movData, req.user);
        } else {
          resultado = await inventarioService.registrarSalida(productoId, { tipo: tipoMov, ...movData }, req.user);
        }
        break;
      }

      case 'CREAR_BLOQUEO': {
        resultado = await barberoService.crearBloqueo(payload, req.user.id);
        break;
      }

      default: {
        return res.status(422).json({
          success: false,
          error: {
            code: 'UNSUPPORTED_SYNC_OPERATION',
            message: `Tipo de operación '${tipo}' no soportada para sincronización offline.`
          }
        });
      }
    }

    // 3. Registrar idCambio en sync_idempotencia para blindaje definitivo contra reintentos
    await client.query(
      `INSERT INTO sync_idempotencia (id_cambio, usuario_id, tipo_operacion, respuesta_json, creado_en)
       VALUES ($1, $2, $3, $4, NOW())`,
      [idCambio, req.user.id, tipo, JSON.stringify(resultado)]
    );

    console.log(`✅ [SYNC PROCESADO]: idCambio ${idCambio} (${tipo}) aplicado y registrado.`);

    return res.status(200).json({
      success: true,
      ok: true,
      duplicado: false,
      data: resultado
    });
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
});
