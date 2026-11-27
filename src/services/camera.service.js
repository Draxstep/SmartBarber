/**
 * SmartBarber - Servicio Desacoplado de Captura Fotográfica y Manejo de Cámara WebRTC
 * Conforme a Clean Architecture, SOLID (Single Responsibility), WCAG 2.1 AA y RNF de datos.
 * Maneja permisos, stream en vivo, instantánea sobre canvas, compresión WebP/JPEG <= 2MB,
 * fallback para archivos locales y liberación obligatoria de hardware.
 */

let activeStreams = new Set();

// Liberación garantizada de hardware si el usuario minimiza el navegador o cambia de pestaña
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cameraService.stopAllCameras();
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cameraService.stopAllCameras();
  });
}

export const cameraService = {
  /**
   * Verifica si el entorno del navegador soporta MediaDevices y getUserMedia.
   */
  isCameraSupported() {
    return Boolean(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    );
  },

  /**
   * Inicia el stream de video en un elemento <video>.
   * @param {HTMLVideoElement} videoElement
   * @param {Object} [options]
   * @param {'user'|'environment'} [options.facingMode='user']
   * @param {number} [options.width=1280]
   * @param {number} [options.height=720]
   * @returns {Promise<{ ok: boolean, stream: MediaStream }>}
   */
  async startCamera(videoElement, { facingMode = 'user', width = 1280, height = 720 } = {}) {
    if (!this.isCameraSupported()) {
      throw new Error('Tu navegador o dispositivo no soporta la API de cámara WebRTC. Utiliza la opción de subir archivo.');
    }

    if (!videoElement) {
      throw new Error('Elemento de video no proporcionado para la vista previa de la cámara.');
    }

    // Si ya tiene un stream activo, detenerlo previamente
    this.stopCamera(videoElement);

    const constraints = {
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: width },
        height: { ideal: height }
      },
      audio: false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = stream;
      videoElement.setAttribute('playsinline', 'true');
      videoElement.muted = true;

      await videoElement.play().catch(() => {});
      activeStreams.add(stream);

      return { ok: true, stream };
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Permiso de acceso a la cámara denegado. Permite el acceso a la cámara en los ajustes del navegador o sube una imagen.');
      }
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('No se detectó ninguna cámara disponible en tu dispositivo.');
      }
      if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        throw new Error('La cámara está siendo utilizada por otra aplicación.');
      }
      throw new Error('No fue posible iniciar la cámara: ' + (err.message || 'Error desconocido'));
    }
  },

  /**
   * Detiene el stream y libera el hardware de la cámara obligatoriamente.
   * @param {HTMLVideoElement} videoElement
   */
  stopCamera(videoElement) {
    if (!videoElement) return;

    const stream = videoElement.srcObject;
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      activeStreams.delete(stream);
    }
    videoElement.srcObject = null;
  },

  /**
   * Detiene todas las cámaras activas registradas en la aplicación.
   */
  stopAllCameras() {
    activeStreams.forEach((stream) => {
      try {
        if (typeof stream.getTracks === 'function') {
          stream.getTracks().forEach((track) => track.stop());
        }
      } catch (_) {}
    });
    activeStreams.clear();
  },

  /**
   * Captura el frame actual del video sobre un canvas, lo redimensiona y comprime a WebP/JPEG <= 2MB.
   * Apaga la cámara automáticamente al capturar.
   * @param {HTMLVideoElement} videoElement
   * @param {Object} [options]
   * @param {number} [options.maxWidth=800]
   * @param {number} [options.maxHeight=800]
   * @param {number} [options.quality=0.85]
   * @param {'image/webp'|'image/jpeg'} [options.format='image/webp']
   * @returns {{ ok: boolean, dataUrl: string, width: number, height: number, sizeBytes: number }}
   */
  capturePhoto(videoElement, { maxWidth = 480, maxHeight = 480, quality = 0.80, format = 'image/webp' } = {}) {
    if (!videoElement || !videoElement.videoWidth) {
      throw new Error('El flujo de video no está listo para capturar.');
    }

    const srcW = videoElement.videoWidth;
    const srcH = videoElement.videoHeight;

    // Calcular dimensiones proporcionales manteniendo aspect ratio
    let targetW = srcW;
    let targetH = srcH;

    if (targetW > maxWidth || targetH > maxHeight) {
      const ratio = Math.min(maxWidth / targetW, maxHeight / targetH);
      targetW = Math.round(targetW * ratio);
      targetH = Math.round(targetH * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { alpha: false });

    // Dibujar frame
    ctx.drawImage(videoElement, 0, 0, targetW, targetH);

    // Exportar con compresión
    let dataUrl = canvas.toDataURL(format, quality);

    // Fallback a JPEG si el navegador no soporta exportación nativa a WebP
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    // Calcular tamaño binario aproximado
    const sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);

    // Liberar hardware inmediatamente
    this.stopCamera(videoElement);

    return {
      ok: true,
      dataUrl,
      width: targetW,
      height: targetH,
      sizeBytes
    };
  },

  /**
   * Procesa un archivo de imagen local (input file), redimensionándolo a <= 800px y comprimiéndolo a <= 2MB.
   * @param {File} file
   * @param {Object} [options]
   * @returns {Promise<{ ok: boolean, dataUrl: string, width: number, height: number, sizeBytes: number }>}
   */
  async processImageFile(file, { maxWidth = 480, maxHeight = 480, quality = 0.80 } = {}) {
    if (!file) throw new Error('No se seleccionó ningún archivo de imagen.');

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Formato de imagen inválido. Solo se admiten archivos JPG, PNG o WebP.');
    }

    // Límite de seguridad de entrada: 10 MB antes de procesar
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('El archivo seleccionado es demasiado grande (> 10MB). Elige una imagen más liviana.');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let targetW = img.naturalWidth || img.width;
        let targetH = img.naturalHeight || img.height;

        if (targetW > maxWidth || targetH > maxHeight) {
          const ratio = Math.min(maxWidth / targetW, maxHeight / targetH);
          targetW = Math.round(targetW * ratio);
          targetH = Math.round(targetH * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, targetW, targetH);

        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        let sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);

        // Si excede 512 KB, recomprimir con menor calidad para respetar Cache Budget
        if (sizeBytes > 512 * 1024) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.65);
          sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
        }

        resolve({
          ok: true,
          dataUrl,
          width: targetW,
          height: targetH,
          sizeBytes
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('No fue posible cargar y decodificar el archivo de imagen.'));
      };

      img.src = objectUrl;
    });
  }
};
