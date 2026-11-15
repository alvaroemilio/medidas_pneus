/**
 * PneusMedidas - Módulo de Cálculos de Pneus
 *
 * Notação de pneu: Largura/Perfil Raro (ex: 185/60 R15)
 * - Largura: largura da banda de rodagem em mm
 * - Perfil: relação entre altura da parede lateral e largura (%)
 * - Aro: diâmetro interno do pneu (polegadas)
 *
 * @module TireMath
 */
var TireMath = (function () {
  "use strict";

  /**
   * Calcula todas as dimensões derivadas de um pneu.
   *
   * @param {number} width   - Largura em mm (ex: 185)
   * @param {number} profile - Perfil/proporção (ex: 60)
   * @param {number} rim     - Diâmetro do aro em polegadas (ex: 15)
   * @returns {Object} Objeto com todas as dimensões calculadas
   */
  function calculateDimensions(width, profile, rim) {
    var sidewallHeight = width * (profile / 100);
    var rimDiameterMm = rim * 25.4;
    var totalDiameter = 2 * sidewallHeight + rimDiameterMm;
    var circumference = Math.PI * totalDiameter;
    var revsPerKm = 1000000 / circumference;

    return {
      width: width,
      profile: profile,
      rim: rim,
      sidewallHeight: round2(sidewallHeight),
      rimDiameterMm: round2(rimDiameterMm),
      totalDiameter: round2(totalDiameter),
      totalRadius: round2(totalDiameter / 2),
      circumference: round2(circumference),
      revsPerKm: round2(revsPerKm),
    };
  }

  /**
   * Compara dois pneus e retorna as diferenças absolutas e percentuais.
   * As diferenças são calculadas como (pneu2 - pneu1).
   *
   * @param {Object} dims1 - Dimensões do pneu base (referência)
   * @param {Object} dims2 - Dimensões do pneu a comparar
   * @returns {Object} Diferenças entre os dois pneus
   */
  function compareTires(dims1, dims2) {
    return {
      diameterDiff: round2(dims2.totalDiameter - dims1.totalDiameter),
      diameterDiffPercent: round2(
        ((dims2.totalDiameter - dims1.totalDiameter) / dims1.totalDiameter) *
          100,
      ),
      widthDiff: dims2.width - dims1.width,
      widthDiffPercent: round2(
        ((dims2.width - dims1.width) / dims1.width) * 100,
      ),
      sidewallDiff: round2(dims2.sidewallHeight - dims1.sidewallHeight),
      sidewallDiffPercent: round2(
        ((dims2.sidewallHeight - dims1.sidewallHeight) / dims1.sidewallHeight) *
          100,
      ),
      circumferenceDiff: round2(dims2.circumference - dims1.circumference),
      circumferenceDiffPercent: round2(
        ((dims2.circumference - dims1.circumference) / dims1.circumference) *
          100,
      ),
      revsPerKmDiff: round2(dims2.revsPerKm - dims1.revsPerKm),
      /**
       * Diferença de velocidade real: se o velocímetro marca X km/h com o pneu1,
       * com o pneu2 a velocidade real será X * (circ2 / circ1).
       * O percentual indica quanto mais rápido (+) ou devagar (-) o carro anda de fato.
       */
      speedDiffPercent: round2(
        ((dims2.circumference - dims1.circumference) / dims1.circumference) *
          100,
      ),
    };
  }

  /**
   * Formata a medida do pneu em string padrão (ex: "185/60 R15").
   *
   * @param {number} width   - Largura
   * @param {number} profile - Perfil
   * @param {number} rim     - Aro
   * @returns {string}
   */
  function formatTireSize(width, profile, rim) {
    return width + "/" + profile + " R" + rim;
  }

  /**
   * Arredonda um número para 2 casas decimais.
   * @param {number} num
   * @returns {number}
   */
  function round2(num) {
    return Math.round(num * 100) / 100;
  }

  /**
   * Formata um número com sinal (+ ou -) e unidade.
   * @param {number} value - Valor numérico
   * @param {string} unit  - Unidade (ex: 'mm', '%')
   * @returns {string}
   */
  function formatDiff(value, unit) {
    if (value === 0) return "0 " + unit;
    var sign = value > 0 ? "+" : "";
    return sign + round2(value) + " " + unit;
  }

  // API pública
  return {
    calculateDimensions: calculateDimensions,
    compareTires: compareTires,
    formatTireSize: formatTireSize,
    formatDiff: formatDiff,
    round2: round2,
  };
})();
