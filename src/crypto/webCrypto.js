// src/crypto/webCrypto.js

// Conversión segura para ArrayBuffer y TypedArrays
function bufferToBase64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Deriva una CryptoKey AES-GCM a partir de una contraseña y una sal usando PBKDF2
 */
async function deriveEncryptionKey(password, salt) {
  const encoder = new TextEncoder();
  const passwordKeyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKeyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Cifra un texto plano usando una contraseña de usuario
 * @param {string} plainText
 * @param {string} masterPassword
 * @returns {Promise<{cipherText: string, iv: string, salt: string}>}
 */
export async function encryptSensitiveField(plainText, masterPassword) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveEncryptionKey(masterPassword, salt);
  const encodedData = new TextEncoder().encode(plainText);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encodedData
  );

  return {
    cipherText: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt)
  };
}

/**
 * Descifra el payload usando la misma contraseña
 * @param {{cipherText: string, iv: string, salt: string}} payload
 * @param {string} masterPassword
 * @returns {Promise<string>}
 */
export async function decryptSensitiveField(payload, masterPassword) {
  const salt = new Uint8Array(base64ToBuffer(payload.salt));
  const iv = new Uint8Array(base64ToBuffer(payload.iv));
  const encryptedBytes = base64ToBuffer(payload.cipherText);

  const key = await deriveEncryptionKey(masterPassword, salt);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encryptedBytes
  );

  return new TextDecoder().decode(decryptedBuffer);
}
