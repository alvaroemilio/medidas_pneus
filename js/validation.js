/**
 * PneusMedidas - Módulo de Validação de Entradas
 *
 * Responsável por:
 * - Validar ranges de largura, perfil e aro
 * - Verificar duplicatas
 * - Sanitizar entradas contra XSS
 * - Fornecer feedback de erro em português
 *
 * @module TireValidation
 */
var TireValidation = (function () {
  "use strict";

  /**
   * Limites válidos para cada parâmetro do pneu.
   * Baseados em medidas reais disponíveis no mercado.
   */
  var LIMITS = {
    width: { min: 125, max: 355, step: 5, label: "Largura" },
    profile: { min: 20, max: 85, step: 5, label: "Perfil" },
    rim: { min: 12, max: 26, step: 0.5, label: "Aro" },
  };

  /** Número máximo de pneus simultâneos na comparação */
  var MAX_TIRES = 6;

  /**
   * Valida o campo de largura.
   * @param {*} value - Valor a validar
   * @returns {{ valid: boolean, error: string|null }}
   */
  function validateWidth(value) {
    var num = parseInt(value, 10);
    if (isNaN(num) || String(value).trim() === "") {
      return { valid: false, error: "Largura deve ser um número válido." };
    }
    if (num < LIMITS.width.min || num > LIMITS.width.max) {
      return {
        valid: false,
        error:
          "Largura deve ser entre " +
          LIMITS.width.min +
          " e " +
          LIMITS.width.max +
          " mm.",
      };
    }
    if (num % LIMITS.width.step !== 0) {
      return {
        valid: false,
        error: "Largura deve ser múltiplo de " + LIMITS.width.step + " mm.",
      };
    }
    return { valid: true, error: null };
  }

  /**
   * Valida o campo de perfil.
   * @param {*} value - Valor a validar
   * @returns {{ valid: boolean, error: string|null }}
   */
  function validateProfile(value) {
    var num = parseInt(value, 10);
    if (isNaN(num) || String(value).trim() === "") {
      return { valid: false, error: "Perfil deve ser um número válido." };
    }
    if (num < LIMITS.profile.min || num > LIMITS.profile.max) {
      return {
        valid: false,
        error:
          "Perfil deve ser entre " +
          LIMITS.profile.min +
          " e " +
          LIMITS.profile.max +
          ".",
      };
    }
    if (num % LIMITS.profile.step !== 0) {
      return {
        valid: false,
        error: "Perfil deve ser múltiplo de " + LIMITS.profile.step + ".",
      };
    }
    return { valid: true, error: null };
  }

  /**
   * Valida o campo de aro.
   * @param {*} value - Valor a validar
   * @returns {{ valid: boolean, error: string|null }}
   */
  function validateRim(value) {
    var num = parseFloat(value);
    if (isNaN(num) || String(value).trim() === "") {
      return { valid: false, error: "Aro deve ser um número válido." };
    }
    if (num < LIMITS.rim.min || num > LIMITS.rim.max) {
      return {
        valid: false,
        error:
          "Aro deve ser entre " +
          LIMITS.rim.min +
          " e " +
          LIMITS.rim.max +
          " polegadas.",
      };
    }
    // Aro pode ser inteiro ou meio (ex: 15, 16.5)
    if (!Number.isInteger(num * 2)) {
      return {
        valid: false,
        error: "Aro deve ser inteiro ou meio (ex: 15, 16.5, 17).",
      };
    }
    return { valid: true, error: null };
  }

  /**
   * Valida todos os campos simultaneamente.
   * @param {*} width   - Largura
   * @param {*} profile - Perfil
   * @param {*} rim     - Aro
   * @returns {{ valid: boolean, errors: string[], results: Object }}
   */
  function validateAll(width, profile, rim) {
    var results = {
      width: validateWidth(width),
      profile: validateProfile(profile),
      rim: validateRim(rim),
    };

    var valid =
      results.width.valid && results.profile.valid && results.rim.valid;
    var errors = [];

    if (!results.width.valid) errors.push(results.width.error);
    if (!results.profile.valid) errors.push(results.profile.error);
    if (!results.rim.valid) errors.push(results.rim.error);

    return { valid: valid, errors: errors, results: results };
  }

  /**
   * Verifica se um pneu com as mesmas medidas já existe na lista.
   * @param {number} width        - Largura
   * @param {number} profile      - Perfil
   * @param {number} rim          - Aro
   * @param {Array}  existingTires - Lista de pneus existentes
   * @returns {boolean}
   */
  function isDuplicate(width, profile, rim, existingTires) {
    return existingTires.some(function (t) {
      return t.width === width && t.profile === profile && t.rim === rim;
    });
  }

  /**
   * Sanitiza um valor de input removendo caracteres não numéricos.
   * Proteção contra injeção de código (XSS).
   * @param {*} value - Valor bruto
   * @returns {string} Valor sanitizado (apenas dígitos e ponto)
   */
  function sanitizeInput(value) {
    return String(value)
      .replace(/[^0-9.]/g, "")
      .substring(0, 6);
  }

  /**
   * Sanitiza texto para inserção segura no DOM.
   * Remove tags HTML e caracteres especiais perigosos.
   * @param {string} text - Texto a sanitizar
   * @returns {string} Texto seguro
   */
  function sanitizeText(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Gera a lista de valores válidos para um select.
   * @param {string} field - Campo ('width', 'profile' ou 'rim')
   * @returns {number[]} Array de valores válidos
   */
  function getValidValues(field) {
    var limit = LIMITS[field];
    if (!limit) return [];
    var values = [];
    for (var v = limit.min; v <= limit.max; v += limit.step) {
      values.push(Math.round(v * 10) / 10); // evitar imprecisão float
    }
    return values;
  }

  // API pública
  return {
    LIMITS: LIMITS,
    MAX_TIRES: MAX_TIRES,
    validateWidth: validateWidth,
    validateProfile: validateProfile,
    validateRim: validateRim,
    validateAll: validateAll,
    isDuplicate: isDuplicate,
    sanitizeInput: sanitizeInput,
    sanitizeText: sanitizeText,
    getValidValues: getValidValues,
  };
})();
