// src/views/cortes.js
import { CortesRepository } from '../db/cortesRepository.js';
import { CitasRepository } from '../db/citasRepository.js';
import { decryptSensitiveField, encryptSensitiveField } from '../crypto/webCrypto.js';
import { 
  abrirCamara, 
  detenerCamara, 
  describirErrorCamara, 
  capturarFoto, 
  obtenerUbicacion, 
  describirErrorUbicacion,
  abrirMicrofono,
  crearMedidorDeNivel
} from '../device/dispositivo.js';

let streamActual = null;
let fotoCapturadaBlob = null;
let ubicacionActual = null;
let medidorMicrofono = null;

// URLs de Blob creadas en el DOM que deben liberarse para evitar fugas de memoria (Guía Sesión 10)
let objectUrlsActivas = [];

export async function renderizarHistorialCortes(clienteId = 'cliente-101') {
  const container = document.getElementById('cortes-container');
  if (!container) return;

  // 1. Liberar URLs de objetos temporales anteriores (evita fugas de memoria con Blobs de imágenes)
  objectUrlsActivas.forEach(url => URL.revokeObjectURL(url));
  objectUrlsActivas = [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
      <div>
        <h3 style="margin: 0; font-size: 1.3em;">💈 Expediente Técnico y Registro de Cortes</h3>
        <p style="margin: 4px 0 0 0; color: var(--text); font-size: 0.9em;">
          Fichas técnicas con cifrado WebCrypto, fotos de cortes y geolocalización.
        </p>
      </div>
      <div>
        <button id="btn-nuevo-corte-camara" class="btn-primary">📸 Registrar Corte (Cámara y GPS)</button>
      </div>
    </div>

    <!-- Contenedor del listado -->
    <div id="cortes-cards-list">
      <p>Cargando expediente técnico...</p>
    </div>

    <!-- DIÁLOGO COMPARTIDO DE CÁMARA (Guía Sesión 10: Un solo <dialog> compartido) -->
    <dialog id="dlg-camara" class="modal-content" style="padding: 0; border: none; background: #111827; color: white; max-width: 500px; border-radius: 12px; overflow: hidden;">
      <div style="padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; background: #1f2937;">
        <h4 style="margin: 0; font-size: 1em;">📷 Cámara en Vivo (Foto del Corte)</h4>
        <button id="btn-cerrar-dlg-camara" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer;">&times;</button>
      </div>
      <div style="position: relative; background: #000; text-align: center; min-height: 280px; display: flex; align-items: center; justify-content: center;">
        <video id="video-camara" autoplay playsinline style="width: 100%; max-height: 340px; object-fit: cover;"></video>
        <div id="camara-loading" style="position: absolute; color: #9ca3af; font-size: 0.9em;">Iniciando cámara...</div>
      </div>
      <div style="padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; background: #1f2937;">
        <span id="camara-error-msg" style="color: #f87171; font-size: 0.85em;"></span>
        <div style="display: flex; gap: 8px; margin-left: auto;">
          <button id="btn-cancelar-camara" class="btn-secondary" style="color: white; border-color: #4b5563;">Cancelar</button>
          <button id="btn-capturar-foto" class="btn-primary" style="background: #10b981;">⚪ Capturar Foto</button>
        </div>
      </div>
    </dialog>

    <!-- Modal Formulario para Nuevo Corte -->
    <div id="modal-corte-container"></div>
  `;

  // Configurar el diálogo compartido de cámara
  setupDialogCamara();

  // Botón abrir registro
  document.getElementById('btn-nuevo-corte-camara')?.addEventListener('click', () => {
    abrirModalNuevoCorte();
  });

  await cargarListaCortes();
}

async function cargarListaCortes() {
  const listEl = document.getElementById('cortes-cards-list');
  if (!listEl) return;

  const cortesRepo = new CortesRepository();
  const citasRepo = new CitasRepository();
  
  const historial = await cortesRepo.getHistorialClienteConCursor('cliente-101');

  if (historial.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <p>No hay cortes registrados en el historial todavía.</p>
      </div>`;
    return;
  }

  listEl.innerHTML = '';
  const passwordSesionActiva = 'ClaveMaestraBarberia2026';

  for (const registro of historial) {
    let textoDescifrado = '';
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

    try {
      textoDescifrado = await decryptSensitiveField(
        {
          cipherText: registro.detallesTecnicosCifrados,
          iv: registro.cryptoIv,
          salt: registro.cryptoSalt
        },
        passwordSesionActiva
      );
    } catch {
      textoDescifrado = '⚠️ [Información protegida o clave incorrecta]';
    }

    // Miniatura de la foto tomada con la cámara (si existe el Blob)
    let fotoHtml = '';
    if (registro.fotoBlob) {
      const fotoUrl = URL.createObjectURL(registro.fotoBlob);
      objectUrlsActivas.push(fotoUrl);
      fotoHtml = `
        <div style="margin-top: 12px; display: flex; align-items: center; gap: 12px;">
          <img src="${fotoUrl}" alt="Foto del Corte" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 2px solid var(--border); box-shadow: var(--shadow);">
          <div>
            <span class="badge badge-success">📷 Foto Adjunta (Blob JPEG)</span>
            <small style="display: block; color: var(--text); margin-top: 4px;">Guardada en IndexedDB</small>
          </div>
        </div>
      `;
    }

    // Badge de Ubicación GPS (si existe)
    let ubicacionHtml = '';
    if (registro.ubicacion) {
      ubicacionHtml = `
        <span class="badge badge-info" style="margin-left: 8px;" title="Momento: ${registro.ubicacion.momento || ''}">
          📍 GPS: ${registro.ubicacion.lat.toFixed(4)}, ${registro.ubicacion.lon.toFixed(4)} (±${registro.ubicacion.precision} m)
        </span>
      `;
    }

    const card = document.createElement('div');
    card.style.cssText = 'border: 1px solid var(--border); margin-bottom: 16px; border-radius: 10px; overflow: hidden; background: var(--card-bg); box-shadow: var(--shadow);';
    
    card.innerHTML = `
      <div style="background: var(--bg); padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <h3 style="margin: 0; font-size: 1.15em;">👤 ${nombreCliente}</h3>
          <p style="margin: 4px 0 0 0; font-size: 0.85em; color: var(--text);">
            ✂️ <b>${servicioRealizado}</b> | Atendido por: <i>${registro.barberoId}</i>
            ${ubicacionHtml}
          </p>
        </div>
        <div style="text-align: right;">
          <strong style="display: block; font-size: 1.1em; color: var(--accent);">🗓️ ${registro.fecha}</strong>
          <span style="font-size: 0.85em; color: var(--text);">Hora: ${horaServicio}</span>
        </div>
      </div>

      <div style="padding: 16px;">
        <div style="display: flex; gap: 12px; margin-bottom: 14px; font-size: 0.9em;">
          <span class="badge badge-success">💰 Cobrado: $${Number(registro.precioCobrado || 0).toLocaleString()}</span>
          <span class="badge badge-normal">💳 Pago: ${(registro.metodoPago || 'efectivo').toUpperCase()}</span>
        </div>
        
        <div style="background: var(--bg); padding: 12px; border-radius: 8px; border-left: 4px solid var(--accent);">
          <p style="margin: 0 0 6px 0; font-size: 0.8em; color: var(--text); text-transform: uppercase; font-weight: bold;">
            🔒 Notas Técnicas / Ficha Clínica Cifrada (AES-GCM):
          </p>
          <p style="margin: 0; font-size: 0.95em; color: var(--text-h); line-height: 1.5;">
            ${textoDescifrado}
          </p>
        </div>

        ${fotoHtml}
      </div>
    `;
    listEl.appendChild(card);
  }
}

// Configuración del <dialog> de cámara compartido
function setupDialogCamara() {
  const dlg = document.getElementById('dlg-camara');
  const video = document.getElementById('video-camara');
  const btnCerrar = document.getElementById('btn-cerrar-dlg-camara');
  const btnCancelar = document.getElementById('btn-cancelar-camara');
  const btnCapturar = document.getElementById('btn-capturar-foto');
  const errorMsg = document.getElementById('camara-error-msg');
  const loading = document.getElementById('camara-loading');

  const cerrarYDetener = () => {
    detenerCamara(streamActual);
    streamActual = null;
    if (dlg && dlg.open) dlg.close();
  };

  btnCerrar?.addEventListener('click', cerrarYDetener);
  btnCancelar?.addEventListener('click', cerrarYDetener);

  // Escuchar evento 'close' del <dialog> (también disparado con tecla ESC)
  dlg?.addEventListener('close', () => {
    detenerCamara(streamActual);
    streamActual = null;
  });

  btnCapturar?.addEventListener('click', async () => {
    if (!video || !streamActual) return;
    try {
      fotoCapturadaBlob = await capturarFoto(video, 640);
      cerrarYDetener();
      // Actualizar vista previa en el formulario
      actualizarPreviewFoto();
    } catch (e) {
      console.error('Error al capturar foto:', e);
    }
  });
}

async function iniciarFlujoCamara() {
  const dlg = document.getElementById('dlg-camara');
  const video = document.getElementById('video-camara');
  const errorMsg = document.getElementById('camara-error-msg');
  const loading = document.getElementById('camara-loading');

  if (errorMsg) errorMsg.innerText = '';
  if (loading) loading.style.display = 'block';

  try {
    // Pedir permiso y abrir cámara DENTRO del clic (Guía Sesión 10)
    streamActual = await abrirCamara('environment');
    if (video) {
      video.srcObject = streamActual;
    }
    if (loading) loading.style.display = 'none';
    if (dlg) dlg.showModal();
  } catch (err) {
    if (loading) loading.style.display = 'none';
    const msg = describirErrorCamara(err);
    alert(`⚠️ Cámara: ${msg}`);
    console.warn('Error al abrir cámara:', err);
  }
}

function actualizarPreviewFoto() {
  const previewContainer = document.getElementById('preview-foto-corte');
  if (!previewContainer) return;

  if (fotoCapturadaBlob) {
    const url = URL.createObjectURL(fotoCapturadaBlob);
    previewContainer.innerHTML = `
      <div style="position: relative; display: inline-block;">
        <img src="${url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 2px solid #10b981;">
        <button id="btn-quitar-foto" type="button" style="position: absolute; top: -6px; right: -6px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-size: 12px; line-height: 1;">&times;</button>
      </div>
      <small style="display: block; color: #10b981; font-weight: bold; margin-top: 4px;">✅ Foto lista para guardar (${(fotoCapturadaBlob.size / 1024).toFixed(1)} KB)</small>
    `;
    document.getElementById('btn-quitar-foto')?.addEventListener('click', () => {
      fotoCapturadaBlob = null;
      actualizarPreviewFoto();
    });
  } else {
    previewContainer.innerHTML = '<span style="color: var(--text); font-size: 0.85em;">Sin foto adjunta</span>';
  }
}

// Formulario Modal para Crear Nuevo Corte
function abrirModalNuevoCorte() {
  const modalContainer = document.getElementById('modal-corte-container');
  if (!modalContainer) return;

  fotoCapturadaBlob = null;
  ubicacionActual = null;

  modalContainer.innerHTML = `
    <div class="modal-overlay" id="modal-corte">
      <div class="modal-content">
        <div class="modal-header">
          <h3>📸 Nuevo Registro Técnico de Corte</h3>
          <button class="modal-close" id="close-corte-modal">&times;</button>
        </div>
        <form id="form-nuevo-corte" class="modal-form">
          <div class="form-group">
            <label>Cliente *</label>
            <input type="text" id="corte-cliente" required value="Carlos Morales" placeholder="Nombre del cliente">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Barbero *</label>
              <input type="text" id="corte-barbero" required value="barbero-01">
            </div>
            <div class="form-group">
              <label>Precio Cobrado ($) *</label>
              <input type="number" id="corte-precio" required value="25000">
            </div>
          </div>
          <div class="form-group">
            <label>Método de Pago</label>
            <select id="corte-pago">
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia (Nequi/Daviplata)</option>
              <option value="tarjeta">Tarjeta Débito/Crédito</option>
            </select>
          </div>
          <div class="form-group">
            <label>Notas Clínicas y Técnicas (Se guardarán cifradas) *</label>
            <textarea id="corte-notas" rows="3" required placeholder="Ej: Degradado con cuchilla 1.5, cliente con dermatitis en la nuca..."></textarea>
          </div>

          <!-- SECCIÓN DE DISPOSITIVO: CÁMARA, UBICACIÓN Y MICRÓFONO (Sesión 10) -->
          <div style="background: var(--bg); padding: 14px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 14px;">
            <p style="margin: 0 0 10px 0; font-size: 0.85em; font-weight: bold; color: var(--text-h);">
              📱 Dispositivo y Hardware (Cámara, GPS y Audio):
            </p>
            
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;">
              <button type="button" id="btn-abrir-camara-form" class="btn-secondary" style="font-size: 0.85em;">
                📷 Tomar Foto con Cámara
              </button>
              <button type="button" id="btn-adjuntar-gps" class="btn-secondary" style="font-size: 0.85em;">
                📍 Capturar Ubicación GPS
              </button>
              <button type="button" id="btn-probar-microfono" class="btn-secondary" style="font-size: 0.85em;">
                🎙️ Medir Ruido Local
              </button>
            </div>

            <!-- Previews -->
            <div id="preview-foto-corte" style="margin-bottom: 8px;">
              <span style="color: var(--text); font-size: 0.85em;">Sin foto adjunta</span>
            </div>
            <div id="preview-gps-corte" style="font-size: 0.85em; color: var(--text);">
              Ubicación GPS no capturada
            </div>
            <div id="preview-mic-corte" style="display: none; font-size: 0.85em; margin-top: 6px;">
              Nivel de ruido ambiental: <span id="mic-nivel-val" style="font-weight: bold; color: var(--accent);">0%</span>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" id="cancel-corte-modal">Cancelar</button>
            <button type="submit" class="btn-primary">Guardar Expediente Cifrado</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const close = () => {
    if (medidorMicrofono) {
      medidorMicrofono.cerrar();
      medidorMicrofono = null;
    }
    modalContainer.innerHTML = '';
  };

  document.getElementById('close-corte-modal')?.addEventListener('click', close);
  document.getElementById('cancel-corte-modal')?.addEventListener('click', close);

  // Botón Tomar Foto
  document.getElementById('btn-abrir-camara-form')?.addEventListener('click', () => {
    iniciarFlujoCamara();
  });

  // Botón GPS Geolocation
  document.getElementById('btn-adjuntar-gps')?.addEventListener('click', async () => {
    const gpsPreview = document.getElementById('preview-gps-corte');
    if (gpsPreview) gpsPreview.innerText = 'Buscando satélites GPS...';

    try {
      const pos = await obtenerUbicacion({ altaPrecision: true, timeoutMs: 8000 });
      ubicacionActual = pos;
      if (gpsPreview) {
        gpsPreview.innerHTML = `
          <span style="color: #10b981; font-weight: bold;">
            📍 Lat: ${pos.lat.toFixed(5)}, Lon: ${pos.lon.toFixed(5)} (Margen: ±${pos.precision} m)
          </span>
        `;
      }
    } catch (err) {
      const msg = describirErrorUbicacion(err);
      if (gpsPreview) gpsPreview.innerText = `⚠️ ${msg}`;
    }
  });

  // Botón Micrófono (Demostración Web Audio Analyser de la guía Sesión 10)
  document.getElementById('btn-probar-microfono')?.addEventListener('click', async () => {
    const micBox = document.getElementById('preview-mic-corte');
    const micVal = document.getElementById('mic-nivel-val');

    if (medidorMicrofono) {
      medidorMicrofono.cerrar();
      medidorMicrofono = null;
      if (micBox) micBox.style.display = 'none';
      return;
    }

    try {
      const streamMic = await abrirMicrofono();
      medidorMicrofono = crearMedidorDeNivel(streamMic);
      if (micBox) micBox.style.display = 'block';

      const interval = setInterval(() => {
        if (!medidorMicrofono) {
          clearInterval(interval);
          return;
        }
        const nivel = medidorMicrofono.leer();
        if (micVal) micVal.innerText = `${Math.round(nivel * 100)}%`;
      }, 150);
    } catch (err) {
      alert('No se pudo acceder al micrófono: ' + err.message);
    }
  });

  // Guardar Corte
  document.getElementById('form-nuevo-corte')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const notas = document.getElementById('corte-notas').value.trim();
    const passwordBarbero = 'ClaveMaestraBarberia2026';
    
    // Cifrar notas sensibles con PBKDF2 + AES-GCM (Ley 1581)
    const cifrado = await encryptSensitiveField(notas, passwordBarbero);

    const cortesRepo = new CortesRepository();
    const nuevoCorte = {
      id: 'corte-' + Date.now(),
      clienteId: 'cliente-101',
      barberoId: document.getElementById('corte-barbero').value.trim(),
      fecha: new Date().toISOString().split('T')[0],
      precioCobrado: Number(document.getElementById('corte-precio').value) || 25000,
      metodoPago: document.getElementById('corte-pago').value,
      detallesTecnicosCifrados: cifrado.cipherText,
      cryptoIv: cifrado.iv,
      cryptoSalt: cifrado.salt,
      fotoBlob: fotoCapturadaBlob, // Blob binario guardado directamente en IndexedDB
      ubicacion: ubicacionActual   // Coordenadas GPS
    };

    await cortesRepo.create(nuevoCorte);
    close();
    await renderizarHistorialCortes('cliente-101');
  });
}
