/**
 * @file inventarioRoutes.js
 * @description Rutas HTTP para catálogo de productos, entradas, salidas y Kardex (CU-016 a CU-019).
 */
import { Router } from 'express';
import { InventarioController } from '../controllers/InventarioController.js';
import { authenticate } from '../../../shared/middlewares/authenticate.js';
import { authorize } from '../../../shared/middlewares/authorize.js';
import { validate } from '../../../shared/middlewares/validate.js';
import {
  createProductoSchema,
  updateProductoSchema,
  entradaInventarioSchema,
  salidaInventarioSchema
} from '../dto/inventarioDto.js';

export const inventarioRouter = Router();
const controller = new InventarioController();

inventarioRouter.use(authenticate);

// 1. Consultas generales de productos, alertas y movimientos (CU-016, CU-019)
inventarioRouter.get('/', controller.list);
inventarioRouter.get('/alertas', controller.getAlertas);
inventarioRouter.get('/movimientos', controller.getMovimientos);
inventarioRouter.get('/:id', controller.getById);
inventarioRouter.get('/:id/kardex', controller.getKardex);

// 2. Gestión de productos (Exclusivo Administrador: CU-016)
inventarioRouter.post(
  '/',
  authorize(['administrador']),
  validate({ body: createProductoSchema }),
  controller.create
);

inventarioRouter.put(
  '/:id',
  authorize(['administrador']),
  validate({ body: updateProductoSchema }),
  controller.update
);

// 3. Registrar entrada de inventario (CU-017, exclusivo Administrador)
inventarioRouter.post(
  '/:id/entradas',
  authorize(['administrador']),
  validate({ body: entradaInventarioSchema }),
  controller.registrarEntrada
);

// 4. Registrar salida de inventario (CU-018, Administrador y Barbero)
inventarioRouter.post(
  '/:id/salidas',
  authorize(['administrador', 'barbero']),
  validate({ body: salidaInventarioSchema }),
  controller.registrarSalida
);
