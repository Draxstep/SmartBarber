// src/views/cortes.ts
import { CortesRepository } from '../db/cortesRepository';
import { CitasRepository } from '../db/citasRepository';
import { decryptSensitiveField } from '../crypto/webCrypto';

export async function renderizarHistorialCortes(clienteId: string) {
  const container = document.getElementById('cortes-container');
  if (!container) return;

  container.innerHTML = '<p>Buscando el expediente del cliente...</p>';
  
  const cortesRepo = new CortesRepository();
  const citasRepo = new CitasRepository();
  
  // Obtenemos todos los cortes de este cliente (RF-COR-07)
  const historial = await cortesRepo.getHistorialClienteConCursor(clienteId);

  if (historial.length === 0) {
    container.innerHTML = `
      <div style="padding: 20px; background: #fef2f2; color: #991b1b; border-radius: 8px;">
        No hay cortes registrados en el historial de este cliente.
      </div>`;
    return;
  }

  container.innerHTML = '';
  const passwordSesionActiva = 'ClaveMaestraBarberia2026';

  // Usamos for...of para poder hacer "JOINS" asíncronos y descifrar secuencialmente
  for (const registro of historial) {
    let textoDescifrado = '';
    
    // 1. "JOIN" con la colección de citas para obtener detalles ricos del cliente (RF-COR-01)
    let nombreCliente = 'Cliente de paso';
    let servicioRealizado = 'Servicio general';
    let horaServicio = '--:--';

    if (registro.citaId) {
      const citaOriginal = await citasRepo.getById(registro.citaId);
      if (citaOriginal) {
        nombreCliente = citaOriginal.clienteNombre;
        servicioRealizado = citaOriginal.servicioId;
        horaServicio = citaOriginal.hora;
      }
    }

    // 2. Descifrado de la ficha técnica
    try {
      textoDescifrado = await decryptSensitiveField(
        {
          cipherText: registro.detallesTecnicosCifrados,
          iv: registro.cryptoIv,
          salt: registro.cryptoSalt
        },
        passwordSesionActiva
      );
    } catch (error) {
      console.error(`Fallo al descifrar el corte ${registro.id}:`, error);
      textoDescifrado = '⚠️️ [Información protegida o corrupta]';
    }

    // 3. Renderizado de una tarjeta rica en información
    const card = document.createElement('div');
    card.style.cssText = 'border: 1px solid #e5e7eb; padding: 0; margin-bottom: 16px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);';
    
    card.innerHTML = `
      <!-- Encabezado de la Tarjeta (Datos del Cliente y Servicio) -->
      <div style="background: #949496; color: white; padding: 12px 15px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h3 style="margin: 0; font-size: 1.1em;">👤 ${nombreCliente}</h3>
          <p style="margin: 4px 0 0 0; font-size: 0.85em; color: #1a1a1a;">
            ✂️ ${servicioRealizado} | Atendido por: ${registro.barberoId}
          </p>
        </div>
        <div style="text-align: right;">
          <strong style="display: block; font-size: 1.1em;">🗓️ ${registro.fecha}</strong>
          <span style="font-size: 0.85em; color: #2f3031;">Hora: ${horaServicio}</span>
        </div>
      </div>

      <!-- Cuerpo de la Tarjeta (Finanzas y Detalles Técnicos) -->
      <div style="padding: 15px; background: #ffffff;">
        <div style="display: flex; gap: 15px; margin-bottom: 15px; font-size: 0.9em; color: #374151;">
          <span style="background: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
            💰 Cobrado: $${registro.precioCobrado}
          </span>
          <span style="background: #e5e7eb; color: #374151; padding: 4px 8px; border-radius: 4px;">
            💳 Pago en: ${registro.metodoPago.toUpperCase()}
          </span>
        </div>
        
        <div style="background: #f9fafb; padding: 12px; border-radius: 6px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0 0 5px 0; font-size: 0.85em; color: #6b7280; text-transform: uppercase; font-weight: bold;">
            Notas Clínicas / Técnicas:
          </p>
          <p style="margin: 0; font-size: 0.95em; color: #111827; line-height: 1.5;">
            ${textoDescifrado}
          </p>
        </div>
      </div>
    `;
    
    container.appendChild(card);
  }
}