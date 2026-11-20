/**
 * @file SesionUsuario.js
 * @description Entidad de Dominio que representa una sesión activa en el Backoffice.
 */
export class SesionUsuario {
  /**
   * @param {object} params
   * @param {string} params.sesionId
   * @param {string} params.usuarioId
   * @param {string} params.tokenHash
   * @param {string|null} [params.direccionIp]
   * @param {string|null} [params.agenteUsuario]
   * @param {Date} [params.ultimaActividadEn]
   * @param {Date} params.expiraEn
   * @param {Date|null} [params.revocadaEn]
   * @param {Date} [params.creadoEn]
   */
  constructor({
    sesionId,
    usuarioId,
    tokenHash,
    direccionIp = null,
    agenteUsuario = null,
    ultimaActividadEn = new Date(),
    expiraEn,
    revocadaEn = null,
    creadoEn = new Date()
  }) {
    this.sesionId = sesionId;
    this.usuarioId = usuarioId;
    this.tokenHash = tokenHash;
    this.direccionIp = direccionIp;
    this.agenteUsuario = agenteUsuario;
    this.ultimaActividadEn = ultimaActividadEn instanceof Date ? ultimaActividadEn : new Date(ultimaActividadEn);
    this.expiraEn = expiraEn instanceof Date ? expiraEn : new Date(expiraEn);
    this.revocadaEn = revocadaEn ? new Date(revocadaEn) : null;
    this.creadoEn = creadoEn instanceof Date ? creadoEn : new Date(creadoEn);
  }

  isRevocada() {
    return this.revocadaEn !== null;
  }

  isExpirada(ahora = new Date()) {
    return this.expiraEn.getTime() <= ahora.getTime();
  }

  isValida(ahora = new Date()) {
    return !this.isRevocada() && !this.isExpirada(ahora);
  }
}
