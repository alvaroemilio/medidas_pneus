/**
 * PneusMedidas - Módulo de Renderização Canvas v2.0 (Estilo EloShapes)
 *
 * Renderização gráfica precisa e de alta definição (HiDPI / Retina):
 * - Vista Frontal (Corte transversal detalhado: banda de rodagem, flancos e aro)
 * - Vista Lateral (Perfil circular: diâmetro total, aro esportivo e pontos centrais)
 * - Modos de Alinhamento: Pelo Centro ou Pelo Solo (linha de asfalto / ground)
 * - Efeitos neon suaves e retículos de medição esportivos
 *
 * @module TireRenderer
 */
var TireRenderer = (function () {
  "use strict";

  /* ========================================================================
   * CONFIGURAÇÃO VISUAL
   * ======================================================================== */

  var CONFIG = {
    padding: 44,
    lineWidth: 2.2,
    rimLineWidth: 1.5,
    glowBlur: 6,
    gridColor: "rgba(255, 255, 255, 0.035)",
    gridFineColor: "rgba(255, 255, 255, 0.015)",
    centerLineColor: "rgba(0, 229, 255, 0.18)",
    groundLineColor: "rgba(255, 255, 255, 0.25)",
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    monoFont: '"JetBrains Mono", "SF Mono", monospace',
    alignment: "center", // 'center' ou 'ground'
  };

  /**
   * Altera a configuração de alinhamento ('center' ou 'ground')
   */
  function setAlignment(mode) {
    if (mode === "center" || mode === "ground") {
      CONFIG.alignment = mode;
    }
  }

  function getAlignment() {
    return CONFIG.alignment;
  }

  /* ========================================================================
   * UTILITÁRIOS DE CANVAS
   * ======================================================================== */

  function setupHiDPI(canvas) {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    var displayWidth = Math.round(rect.width);
    var displayHeight = Math.round(rect.height);

    if (
      canvas.width !== Math.round(displayWidth * dpr) ||
      canvas.height !== Math.round(displayHeight * dpr)
    ) {
      canvas.width = Math.round(displayWidth * dpr);
      canvas.height = Math.round(displayHeight * dpr);
    }

    var ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
    ctx.scale(dpr, dpr);
    return ctx;
  }

  function clearCanvas(ctx, canvas) {
    var dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  }

  function getLogicalSize(canvas) {
    var dpr = window.devicePixelRatio || 1;
    return {
      width: canvas.width / dpr,
      height: canvas.height / dpr,
    };
  }

  /**
   * Desenha a grade de fundo estilo CAD / telemetria moderna
   */
  function drawGrid(ctx, w, h) {
    var step = 24;
    ctx.save();
    ctx.strokeStyle = CONFIG.gridColor;
    ctx.lineWidth = 0.5;

    ctx.beginPath();
    for (var x = step; x < w; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (var y = step; y < h; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Desenha linhas de centro com retículos cibernéticos sutis
   */
  function drawCrosshairs(ctx, cx, cy, w, h, isGround) {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Eixo vertical central
    ctx.strokeStyle = CONFIG.centerLineColor;
    ctx.beginPath();
    ctx.moveTo(cx, 16);
    ctx.lineTo(cx, h - 16);
    ctx.stroke();

    if (!isGround) {
      // Eixo horizontal central
      ctx.beginPath();
      ctx.moveTo(16, cy);
      ctx.lineTo(w - 16, cy);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Desenha a linha de contato com o solo (quando alinhado por 'ground')
   */
  function drawGroundLine(ctx, groundY, w) {
    ctx.save();
    ctx.strokeStyle = "rgba(0, 229, 255, 0.4)";
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(20, groundY);
    ctx.lineTo(w - 20, groundY);
    ctx.stroke();

    // Hachuras do asfalto
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 24; x < w - 20; x += 14) {
      ctx.moveTo(x, groundY + 1);
      ctx.lineTo(x - 8, groundY + 9);
    }
    ctx.stroke();

    // Etiqueta do solo
    ctx.font = "600 9px " + CONFIG.monoFont;
    ctx.fillStyle = "rgba(0, 229, 255, 0.7)";
    ctx.textAlign = "right";
    ctx.fillText("NÍVEL DO SOLO (BASE)", w - 24, groundY - 6);

    ctx.restore();
  }

  /**
   * Desenha o estado vazio
   */
  function drawEmptyState(canvas, title) {
    var ctx = setupHiDPI(canvas);
    var size = getLogicalSize(canvas);
    clearCanvas(ctx, canvas);
    drawGrid(ctx, size.width, size.height);

    var cx = size.width / 2;
    var cy = size.height / 2;

    ctx.save();
    // Círculo pontilhado
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy - 14, 46, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy - 14, 24, 0, Math.PI * 2);
    ctx.stroke();

    // Texto
    ctx.setLineDash([]);
    ctx.font = "600 13px " + CONFIG.fontFamily;
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.textAlign = "center";
    ctx.fillText(title, cx, cy + 54);

    ctx.font = "11px " + CONFIG.fontFamily;
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillText("Selecione ou adicione pneus à esquerda", cx, cy + 72);
    ctx.restore();
  }

  /* ========================================================================
   * CÁLCULO DE ESCALA UNIFICADA
   * ======================================================================== */

  function calculateScale(visibleTires, areaW, areaH, view) {
    if (visibleTires.length === 0) return 1;

    var maxDiam = 0;
    var maxWidth = 0;

    visibleTires.forEach(function (t) {
      if (t.dimensions.totalDiameter > maxDiam)
        maxDiam = t.dimensions.totalDiameter;
      if (t.dimensions.width > maxWidth) maxWidth = t.dimensions.width;
    });

    if (view === "side") {
      return (Math.min(areaW, areaH) * 0.82) / maxDiam;
    } else {
      var scaleW = (areaW * 0.75) / maxWidth;
      var scaleH = (areaH * 0.82) / maxDiam;
      return Math.min(scaleW, scaleH);
    }
  }

  /* ========================================================================
   * DESENHO DA SEÇÃO TRANSVERSAL (CORTE REALISTA DE PNEU)
   * ======================================================================== */

  /**
   * Desenha o perfil do pneu em corte (ombros arredondados, flancos abaulados, tala do aro)
   */
  function drawTireCrossSectionPath(
    ctx,
    cx,
    centerY,
    widthPx,
    diamPx,
    rimDiamPx,
  ) {
    var halfW = widthPx / 2;
    var halfH = diamPx / 2;
    var halfRimH = rimDiamPx / 2;
    var sidewallPx = halfH - halfRimH;

    var top = centerY - halfH;
    var bottom = centerY + halfH;
    var rimTop = centerY - halfRimH;
    var rimBottom = centerY + halfRimH;

    // Fator de ombro (tread shoulder)
    var shoulderRadius = Math.min(widthPx * 0.12, 14);
    var beadInset = Math.max(widthPx * 0.08, 4);

    ctx.beginPath();

    // TOPO - BANDA DE RODAGEM SUPERIOR
    ctx.moveTo(cx - halfW + shoulderRadius, top);
    // Leve curvatura da banda de rodagem
    ctx.quadraticCurveTo(cx, top - 2, cx + halfW - shoulderRadius, top);
    // Ombro direito superior
    ctx.quadraticCurveTo(cx + halfW, top, cx + halfW, top + shoulderRadius);

    // FLANCO DIREITO SUPERIOR (abaulado para fora)
    var midUpperY = top + sidewallPx * 0.55;
    ctx.bezierCurveTo(
      cx + halfW * 1.04,
      midUpperY,
      cx + halfW * 0.98,
      rimTop - 2,
      cx + halfW - beadInset,
      rimTop,
    );

    // ASSENTO DO ARO SUPERIOR DIREITO
    ctx.lineTo(cx + halfW * 0.45, rimTop);

    // ABERTURA INTERNA DO ARO (espaço da roda)
    ctx.lineTo(cx + halfW * 0.45, rimBottom);

    // ASSENTO DO ARO INFERIOR DIREITO
    ctx.lineTo(cx + halfW - beadInset, rimBottom);

    // FLANCO DIREITO INFERIOR
    var midLowerY = bottom - sidewallPx * 0.55;
    ctx.bezierCurveTo(
      cx + halfW * 0.98,
      rimBottom + 2,
      cx + halfW * 1.04,
      midLowerY,
      cx + halfW,
      bottom - shoulderRadius,
    );

    // Ombro direito inferior
    ctx.quadraticCurveTo(
      cx + halfW,
      bottom,
      cx + halfW - shoulderRadius,
      bottom,
    );

    // BASE - BANDA DE RODAGEM INFERIOR
    ctx.quadraticCurveTo(cx, bottom + 2, cx - halfW + shoulderRadius, bottom);
    // Ombro esquerdo inferior
    ctx.quadraticCurveTo(
      cx - halfW,
      bottom,
      cx - halfW,
      bottom - shoulderRadius,
    );

    // FLANCO ESQUERDO INFERIOR
    ctx.bezierCurveTo(
      cx - halfW * 1.04,
      midLowerY,
      cx - halfW * 0.98,
      rimBottom + 2,
      cx - halfW + beadInset,
      rimBottom,
    );

    // ASSENTO DO ARO INFERIOR ESQUERDO
    ctx.lineTo(cx - halfW * 0.45, rimBottom);

    // ABERTURA INTERNA DO ARO (esquerda)
    ctx.lineTo(cx - halfW * 0.45, rimTop);

    // ASSENTO DO ARO SUPERIOR ESQUERDO
    ctx.lineTo(cx - halfW + beadInset, rimTop);

    // FLANCO ESQUERDO SUPERIOR
    ctx.bezierCurveTo(
      cx - halfW * 0.98,
      rimTop - 2,
      cx - halfW * 1.04,
      midUpperY,
      cx - halfW,
      top + shoulderRadius,
    );

    // Ombro esquerdo superior
    ctx.quadraticCurveTo(cx - halfW, top, cx - halfW + shoulderRadius, top);

    ctx.closePath();
  }

  /**
   * Desenha a seção do aro da roda
   */
  function drawRimSection(ctx, cx, centerY, widthPx, rimDiamPx) {
    var rimWidth = widthPx * 0.72;
    var rimH = rimDiamPx;
    var halfW = rimWidth / 2;
    var halfH = rimH / 2;

    ctx.beginPath();
    ctx.rect(cx - halfW, centerY - halfH, rimWidth, rimH);
    ctx.stroke();

    // Flanges do aro
    ctx.beginPath();
    ctx.moveTo(cx - halfW - 3, centerY - halfH);
    ctx.lineTo(cx + halfW + 3, centerY - halfH);
    ctx.moveTo(cx - halfW - 3, centerY + halfH);
    ctx.lineTo(cx + halfW + 3, centerY + halfH);
    ctx.stroke();
  }

  /* ========================================================================
   * RENDERIZAÇÃO - VISTA FRONTAL (SEÇÃO TRANSVERSAL)
   * ======================================================================== */

  function drawFrontView(canvas, tires) {
    var visibleTires = tires.filter(function (t) {
      return t.visible !== false;
    });
    if (visibleTires.length === 0) {
      drawEmptyState(canvas, "Seção Transversal");
      return;
    }

    var ctx = setupHiDPI(canvas);
    var size = getLogicalSize(canvas);
    clearCanvas(ctx, canvas);
    drawGrid(ctx, size.width, size.height);

    var cx = size.width / 2;
    var scale = calculateScale(
      visibleTires,
      size.width - CONFIG.padding * 2,
      size.height - CONFIG.padding * 2,
      "front",
    );

    var isGround = CONFIG.alignment === "ground";
    var groundY = size.height - 48;
    var defaultCy = size.height / 2;

    if (isGround) {
      drawGroundLine(ctx, groundY, size.width);
    }
    drawCrosshairs(ctx, cx, defaultCy, size.width, size.height, isGround);

    // Desenhar cada pneu sobreposto
    visibleTires.forEach(function (tire, index) {
      var dims = tire.dimensions;
      var wPx = dims.width * scale;
      var diamPx = dims.totalDiameter * scale;
      var rimDiamPx = dims.rimDiameterMm * scale;

      // Calcular o centro Y conforme alinhamento
      var cy = isGround ? groundY - diamPx / 2 : defaultCy;

      ctx.save();
      ctx.strokeStyle = tire.color;
      ctx.lineWidth = CONFIG.lineWidth;
      ctx.shadowColor = tire.color;
      ctx.shadowBlur = CONFIG.glowBlur;

      // Desenhar o corte do pneu
      drawTireCrossSectionPath(ctx, cx, cy, wPx, diamPx, rimDiamPx);
      ctx.stroke();

      // Desenhar aro com menor opacidade
      ctx.shadowBlur = 0;
      ctx.lineWidth = CONFIG.rimLineWidth;
      ctx.globalAlpha = 0.55;
      drawRimSection(ctx, cx, cy, wPx, rimDiamPx);

      // Ponto de centro (estilo eloshapes)
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = tire.color;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // Anotações de cotas do primeiro pneu de referência
    if (visibleTires.length > 0) {
      var ref = visibleTires[0];
      var refW = ref.dimensions.width * scale;
      var refDiam = ref.dimensions.totalDiameter * scale;
      var refCy = isGround ? groundY - refDiam / 2 : defaultCy;

      drawFrontDimensions(ctx, cx, refCy, refW, refDiam, ref, isGround);
    }

    drawMiniBadges(ctx, visibleTires, size.width, size.height);
  }

  function drawFrontDimensions(ctx, cx, cy, wPx, diamPx, refTire, isGround) {
    ctx.save();
    var color = refTire.color;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 1;
    ctx.font = "500 10px " + CONFIG.monoFont;

    // Cota de Largura (topo ou base)
    var topY = cy - diamPx / 2;
    var cotaY = topY - 14;

    ctx.beginPath();
    ctx.moveTo(cx - wPx / 2, topY);
    ctx.lineTo(cx - wPx / 2, cotaY - 4);
    ctx.moveTo(cx + wPx / 2, topY);
    ctx.lineTo(cx + wPx / 2, cotaY - 4);
    ctx.moveTo(cx - wPx / 2, cotaY);
    ctx.lineTo(cx + wPx / 2, cotaY);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = color;
    ctx.fillText(refTire.dimensions.width + " mm", cx, cotaY - 5);

    // Cota de Diâmetro (lateral direita)
    var rightX = cx + wPx / 2 + 18;
    ctx.beginPath();
    ctx.moveTo(cx + wPx / 2 + 4, topY);
    ctx.lineTo(rightX + 6, topY);
    ctx.moveTo(cx + wPx / 2 + 4, topY + diamPx);
    ctx.lineTo(rightX + 6, topY + diamPx);
    ctx.moveTo(rightX, topY);
    ctx.lineTo(rightX, topY + diamPx);
    ctx.stroke();

    ctx.save();
    ctx.translate(rightX + 13, cy);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillStyle = color;
    ctx.fillText("Ø " + refTire.dimensions.totalDiameter + " mm", 0, 0);
    ctx.restore();

    ctx.restore();
  }

  /* ========================================================================
   * RENDERIZAÇÃO - VISTA LATERAL (PERFIL CIRCULAR)
   * ======================================================================== */

  function drawSideView(canvas, tires) {
    var visibleTires = tires.filter(function (t) {
      return t.visible !== false;
    });
    if (visibleTires.length === 0) {
      drawEmptyState(canvas, "Vista Lateral");
      return;
    }

    var ctx = setupHiDPI(canvas);
    var size = getLogicalSize(canvas);
    clearCanvas(ctx, canvas);
    drawGrid(ctx, size.width, size.height);

    var cx = size.width / 2;
    var scale = calculateScale(
      visibleTires,
      size.width - CONFIG.padding * 2,
      size.height - CONFIG.padding * 2,
      "side",
    );

    var isGround = CONFIG.alignment === "ground";
    var groundY = size.height - 48;
    var defaultCy = size.height / 2;

    if (isGround) {
      drawGroundLine(ctx, groundY, size.width);
    }
    drawCrosshairs(ctx, cx, defaultCy, size.width, size.height, isGround);

    // Desenhar cada pneu
    visibleTires.forEach(function (tire, index) {
      var dims = tire.dimensions;
      var outerR = (dims.totalDiameter * scale) / 2;
      var rimR = (dims.rimDiameterMm * scale) / 2;
      var cy = isGround ? groundY - outerR : defaultCy;

      ctx.save();
      ctx.strokeStyle = tire.color;
      ctx.shadowColor = tire.color;
      ctx.shadowBlur = CONFIG.glowBlur;
      ctx.lineWidth = CONFIG.lineWidth;

      // Círculo externo do pneu
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.stroke();

      // Círculo do aro (rim)
      ctx.lineWidth = CONFIG.rimLineWidth;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(cx, cy, rimR, 0, Math.PI * 2);
      ctx.stroke();

      // Raios esportivos finos da roda (5 raios duplos modernos)
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1;
      var numSpokes = 5;
      for (var i = 0; i < numSpokes; i++) {
        var angle = (i * 2 * Math.PI) / numSpokes - Math.PI / 2;
        var rInner = rimR * 0.22;
        var rOuter = rimR * 0.94;
        var spread = 0.08;

        ctx.beginPath();
        ctx.moveTo(
          cx + Math.cos(angle - spread) * rInner,
          cy + Math.sin(angle - spread) * rInner,
        );
        ctx.lineTo(
          cx + Math.cos(angle - spread * 0.5) * rOuter,
          cy + Math.sin(angle - spread * 0.5) * rOuter,
        );
        ctx.moveTo(
          cx + Math.cos(angle + spread) * rInner,
          cy + Math.sin(angle + spread) * rInner,
        );
        ctx.lineTo(
          cx + Math.cos(angle + spread * 0.5) * rOuter,
          cy + Math.sin(angle + spread * 0.5) * rOuter,
        );
        ctx.stroke();
      }

      // Cubo central da roda
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(cx, cy, rimR * 0.18, 0, Math.PI * 2);
      ctx.stroke();

      // Ponto central de alinhamento com a cor do pneu (como no eloshapes!)
      ctx.globalAlpha = 1;
      ctx.fillStyle = tire.color;
      ctx.shadowColor = tire.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // Dimensões do pneu de referência
    if (visibleTires.length > 0) {
      var ref = visibleTires[0];
      var refOuterR = (ref.dimensions.totalDiameter * scale) / 2;
      var refRimR = (ref.dimensions.rimDiameterMm * scale) / 2;
      var refCy = isGround ? groundY - refOuterR : defaultCy;

      drawSideDimensions(ctx, cx, refCy, refOuterR, refRimR, ref, isGround);
    }

    drawMiniBadges(ctx, visibleTires, size.width, size.height);
  }

  function drawSideDimensions(ctx, cx, cy, outerR, rimR, refTire, isGround) {
    ctx.save();
    var color = refTire.color;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.fillStyle = color;
    ctx.lineWidth = 1;
    ctx.font = "500 10px " + CONFIG.monoFont;

    // Cota horizontal inferior de diâmetro se alinhado no centro
    if (!isGround) {
      var yBottom = cy + outerR + 14;
      ctx.beginPath();
      ctx.moveTo(cx - outerR, cy + outerR);
      ctx.lineTo(cx - outerR, yBottom + 4);
      ctx.moveTo(cx + outerR, cy + outerR);
      ctx.lineTo(cx + outerR, yBottom + 4);
      ctx.moveTo(cx - outerR, yBottom);
      ctx.lineTo(cx + outerR, yBottom);
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillText(
        "Ø " +
          refTire.dimensions.totalDiameter +
          " mm (" +
          refTire.dimensions.rim +
          "″)",
        cx,
        yBottom + 13,
      );
    } else {
      // Cota no topo
      var yTop = cy - outerR - 14;
      ctx.beginPath();
      ctx.moveTo(cx - outerR, cy - outerR);
      ctx.lineTo(cx - outerR, yTop - 4);
      ctx.moveTo(cx + outerR, cy - outerR);
      ctx.lineTo(cx + outerR, yTop - 4);
      ctx.moveTo(cx - outerR, yTop);
      ctx.lineTo(cx + outerR, yTop);
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillText(
        "Ø " +
          refTire.dimensions.totalDiameter +
          " mm (" +
          refTire.dimensions.rim +
          "″)",
        cx,
        yTop - 5,
      );
    }

    ctx.restore();
  }

  /* ========================================================================
   * MINI BADGES NO RODAPÉ DO CANVAS
   * ======================================================================== */

  function drawMiniBadges(ctx, tires, w, h) {
    ctx.save();
    var startX = 14;
    var startY = h - 14;
    var curX = startX;

    ctx.font = "600 11px " + CONFIG.monoFont;
    ctx.textBaseline = "middle";

    tires.forEach(function (tire, idx) {
      var label =
        idx +
        1 +
        " · " +
        TireMath.formatTireSize(tire.width, tire.profile, tire.rim);
      var textWidth = ctx.measureText(label).width;
      var pillW = textWidth + 20;
      var pillH = 20;

      // Fundo translúcido
      ctx.fillStyle = "rgba(10, 10, 18, 0.75)";
      ctx.strokeStyle = tire.color;
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.roundRect(curX, startY - pillH / 2, pillW, pillH, 10);
      ctx.fill();
      ctx.stroke();

      // Ponto de cor
      ctx.fillStyle = tire.color;
      ctx.beginPath();
      ctx.arc(curX + 8, startY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Texto
      ctx.fillStyle = "#eaedf3";
      ctx.fillText(label, curX + 16, startY);

      curX += pillW + 8;
    });

    ctx.restore();
  }

  /* ========================================================================
   * API PÚBLICA
   * ======================================================================== */

  function renderAll(frontCanvas, sideCanvas, tires) {
    drawFrontView(frontCanvas, tires);
    drawSideView(sideCanvas, tires);
  }

  return {
    drawFrontView: drawFrontView,
    drawSideView: drawSideView,
    renderAll: renderAll,
    drawEmptyState: drawEmptyState,
    setAlignment: setAlignment,
    getAlignment: getAlignment,
    setupHiDPI: setupHiDPI,
  };
})();
