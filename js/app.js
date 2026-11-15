/**
 * PneusMedidas — Controlador Principal
 *
 * Gerencia o estado da aplicação, coordena a interação entre
 * formulários, lista de pneus, renderização Canvas e tabela comparativa.
 * Persiste o estado em localStorage.
 *
 * @module App
 */
var App = (function () {
  "use strict";

  /* ========================================================================
   * ESTADO
   * ======================================================================== */

  var state = {
    tires: [],
    colors: ["#00FFFF", "#FF00FF", "#FFFF00", "#00FF88", "#FF8800", "#FF4444"],
    nextId: 1,
  };

  /** Presets de medidas populares para adição rápida */
  var PRESETS = [
    { width: 175, profile: 70, rim: 13 },
    { width: 185, profile: 65, rim: 15 },
    { width: 185, profile: 60, rim: 15 },
    { width: 195, profile: 55, rim: 15 },
    { width: 195, profile: 65, rim: 15 },
    { width: 205, profile: 55, rim: 16 },
    { width: 215, profile: 50, rim: 17 },
    { width: 225, profile: 45, rim: 17 },
    { width: 225, profile: 40, rim: 18 },
    { width: 235, profile: 35, rim: 19 },
  ];

  var STORAGE_KEY = "pneusmedidas_state";

  /* ========================================================================
   * REFERÊNCIAS AO DOM
   * ======================================================================== */

  var dom = {};

  function cacheDom() {
    dom.form = document.getElementById("tireForm");
    dom.inputWidth = document.getElementById("inputWidth");
    dom.inputProfile = document.getElementById("inputProfile");
    dom.inputRim = document.getElementById("inputRim");
    dom.errorWidth = document.getElementById("errorWidth");
    dom.errorProfile = document.getElementById("errorProfile");
    dom.errorRim = document.getElementById("errorRim");
    dom.tireList = document.getElementById("tireList");
    dom.frontCanvas = document.getElementById("frontCanvas");
    dom.sideCanvas = document.getElementById("sideCanvas");
    dom.comparisonTable = document.getElementById("comparisonTable");
    dom.addBtn = document.getElementById("addBtn");
    dom.clearBtn = document.getElementById("clearBtn");
    dom.tireCount = document.getElementById("tireCount");
    dom.presetContainer = document.getElementById("presetContainer");
    dom.toastContainer = document.getElementById("toastContainer");
    dom.alignCenterBtn = document.getElementById("alignCenterBtn");
    dom.alignGroundBtn = document.getElementById("alignGroundBtn");
    dom.activeTiresCount = document.getElementById("activeTiresCount");
  }

  /* ========================================================================
   * INICIALIZAÇÃO
   * ======================================================================== */

  function init() {
    cacheDom();
    populateSelects();
    populatePresets();
    setupEventListeners();
    loadFromStorage();
    render();
  }

  /**
   * Preenche os selects com valores válidos.
   */
  function populateSelects() {
    // Largura
    var widths = TireValidation.getValidValues("width");
    populateSelect(dom.inputWidth, widths, 185, function (v) {
      return v + " mm";
    });

    // Perfil
    var profiles = TireValidation.getValidValues("profile");
    populateSelect(dom.inputProfile, profiles, 60, function (v) {
      return v;
    });

    // Aro
    var rims = TireValidation.getValidValues("rim");
    populateSelect(dom.inputRim, rims, 15, function (v) {
      return "R" + v;
    });
  }

  /**
   * Preenche um elemento <select> com opções.
   */
  function populateSelect(selectEl, values, defaultVal, formatFn) {
    selectEl.innerHTML = "";
    values.forEach(function (val) {
      var option = document.createElement("option");
      option.value = val;
      option.textContent = formatFn ? formatFn(val) : val;
      if (val === defaultVal) option.selected = true;
      selectEl.appendChild(option);
    });
  }

  /**
   * Cria botões de presets (medidas populares).
   */
  function populatePresets() {
    if (!dom.presetContainer) return;
    dom.presetContainer.innerHTML = "";

    PRESETS.forEach(function (p) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preset-btn me-1 mb-1";
      btn.textContent = TireMath.formatTireSize(p.width, p.profile, p.rim);
      btn.setAttribute(
        "aria-label",
        "Adicionar pneu " + TireMath.formatTireSize(p.width, p.profile, p.rim),
      );
      btn.addEventListener("click", function () {
        addTireDirect(p.width, p.profile, p.rim);
      });
      dom.presetContainer.appendChild(btn);
    });
  }

  /* ========================================================================
   * EVENT LISTENERS
   * ======================================================================== */

  function setupEventListeners() {
    // Formulário de adição
    dom.form.addEventListener("submit", function (e) {
      e.preventDefault();
      handleAddTire();
    });

    // Botão limpar tudo
    if (dom.clearBtn) {
      dom.clearBtn.addEventListener("click", clearAllTires);
    }

    // Redimensionar canvas ao mudar janela
    var resizeTimeout;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function () {
        renderCanvases();
      }, 150);
    });

    // Validação em tempo real nos selects
    [dom.inputWidth, dom.inputProfile, dom.inputRim].forEach(function (el) {
      el.addEventListener("change", function () {
        clearValidationState(el);
      });
    });

    // Controles de Alinhamento
    if (dom.alignCenterBtn) {
      dom.alignCenterBtn.addEventListener("click", function () {
        TireRenderer.setAlignment("center");
        dom.alignCenterBtn.classList.add("active");
        if (dom.alignGroundBtn) dom.alignGroundBtn.classList.remove("active");
        renderCanvases();
      });
    }

    if (dom.alignGroundBtn) {
      dom.alignGroundBtn.addEventListener("click", function () {
        TireRenderer.setAlignment("ground");
        dom.alignGroundBtn.classList.add("active");
        if (dom.alignCenterBtn) dom.alignCenterBtn.classList.remove("active");
        renderCanvases();
      });
    }
  }

  /* ========================================================================
   * ADICIONAR / REMOVER PNEUS
   * ======================================================================== */

  /**
   * Processa a adição de um pneu via formulário.
   */
  function handleAddTire() {
    clearAllValidation();

    var width = parseInt(dom.inputWidth.value, 10);
    var profile = parseInt(dom.inputProfile.value, 10);
    var rim = parseFloat(dom.inputRim.value);

    // Validar
    var validation = TireValidation.validateAll(width, profile, rim);
    if (!validation.valid) {
      showValidationErrors(validation.results);
      return;
    }

    // Verificar duplicata
    if (TireValidation.isDuplicate(width, profile, rim, state.tires)) {
      showToast("Este pneu já foi adicionado!", "warning");
      return;
    }

    // Verificar limite
    if (state.tires.length >= TireValidation.MAX_TIRES) {
      showToast(
        "Limite de " + TireValidation.MAX_TIRES + " pneus atingido!",
        "warning",
      );
      return;
    }

    // Calcular dimensões
    var dimensions = TireMath.calculateDimensions(width, profile, rim);

    // Adicionar ao estado
    var tire = {
      id: state.nextId++,
      width: width,
      profile: profile,
      rim: rim,
      color: state.colors[state.tires.length],
      dimensions: dimensions,
    };
    state.tires.push(tire);

    // Salvar e renderizar
    saveToStorage();
    render();
    showToast(
      TireMath.formatTireSize(width, profile, rim) + " adicionado!",
      "success",
    );
  }

  /**
   * Adiciona um pneu diretamente (via preset ou programaticamente).
   */
  function addTireDirect(width, profile, rim) {
    dom.inputWidth.value = width;
    dom.inputProfile.value = profile;
    dom.inputRim.value = rim;
    handleAddTire();
  }

  /**
   * Remove um pneu pelo ID.
   */
  function removeTire(id) {
    state.tires = state.tires.filter(function (t) {
      return t.id !== id;
    });
    // Reatribuir cores para manter a ordem
    state.tires.forEach(function (t, i) {
      t.color = state.colors[i];
    });
    saveToStorage();
    render();
  }

  /**
   * Remove todos os pneus.
   */
  function clearAllTires() {
    state.tires = [];
    saveToStorage();
    render();
    showToast("Todos os pneus removidos.", "info");
  }

  /* ========================================================================
   * RENDERIZAÇÃO
   * ======================================================================== */

  /**
   * Renderiza toda a interface.
   */
  function render() {
    renderTireList();
    renderCanvases();
    renderComparisonTable();
    updateTireCount();
    updateAddButton();
  }

  /**
   * Renderiza a lista de pneus no sidebar (Estilo EloShapes).
   */
  function renderTireList() {
    dom.tireList.innerHTML = "";

    if (state.tires.length === 0) {
      var emptyDiv = document.createElement("div");
      emptyDiv.className = "empty-state py-4";
      emptyDiv.innerHTML =
        '<i class="bi bi-circle-half"></i>' +
        "<p>Nenhum pneu adicionado.<br>Selecione um preset ou adicione medidas acima.</p>";
      dom.tireList.appendChild(emptyDiv);
      if (dom.activeTiresCount) dom.activeTiresCount.textContent = "0 pneus";
      return;
    }

    var activeCount = 0;

    state.tires.forEach(function (tire, index) {
      var isVisible = tire.visible !== false;
      if (isVisible) activeCount++;

      var card = document.createElement("div");
      card.className = "tire-card" + (isVisible ? "" : " is-hidden");
      card.setAttribute("data-tire-id", tire.id);
      card.style.setProperty("--tire-accent", tire.color);

      // Barra de cor vertical sólida
      var swatch = document.createElement("div");
      swatch.className = "tire-card-swatch";
      swatch.style.backgroundColor = tire.color;
      swatch.style.color = tire.color;

      // Badge circular com o número correspondente (1, 2, 3...)
      var numBadge = document.createElement("span");
      numBadge.className = "tire-num-badge";
      numBadge.style.backgroundColor = tire.color;
      numBadge.style.color = "#000";
      numBadge.textContent = index + 1;

      // Informações detalhadas
      var info = document.createElement("div");
      info.className = "tire-info";

      var title = document.createElement("strong");
      title.textContent = TireMath.formatTireSize(
        tire.width,
        tire.profile,
        tire.rim,
      );

      var details = document.createElement("small");
      details.textContent =
        "Ø " +
        tire.dimensions.totalDiameter +
        " mm · " +
        tire.dimensions.width +
        " mm larg · R" +
        tire.dimensions.rim;

      info.appendChild(title);
      info.appendChild(details);

      // Ações rápidas (visibilidade + excluir)
      var actions = document.createElement("div");
      actions.className = "tire-card-actions";

      var toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "btn-card-action";
      toggleBtn.title = isVisible
        ? "Ocultar da comparação"
        : "Exibir na comparação";
      toggleBtn.setAttribute("aria-label", "Alternar visibilidade do pneu");
      toggleBtn.innerHTML =
        '<i class="bi ' + (isVisible ? "bi-eye" : "bi-eye-slash") + '"></i>';
      toggleBtn.addEventListener("click", function () {
        tire.visible = !isVisible;
        saveToStorage();
        render();
      });

      var removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn-card-action btn-delete";
      removeBtn.title = "Remover da comparação";
      removeBtn.setAttribute("aria-label", "Remover pneu");
      removeBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
      removeBtn.addEventListener("click", function () {
        removeTire(tire.id);
      });

      actions.appendChild(toggleBtn);
      actions.appendChild(removeBtn);

      card.appendChild(swatch);
      card.appendChild(numBadge);
      card.appendChild(info);
      card.appendChild(actions);

      dom.tireList.appendChild(card);
    });

    if (dom.activeTiresCount) {
      dom.activeTiresCount.textContent =
        activeCount + (activeCount === 1 ? " pneu ativo" : " pneus ativos");
    }
  }

  /**
   * Renderiza os canvases (frontal e lateral).
   */
  function renderCanvases() {
    if (!dom.frontCanvas || !dom.sideCanvas) return;
    TireRenderer.renderAll(dom.frontCanvas, dom.sideCanvas, state.tires);
  }

  /**
   * Renderiza a tabela comparativa.
   */
  function renderComparisonTable() {
    if (!dom.comparisonTable) return;
    var table = dom.comparisonTable;

    if (state.tires.length === 0) {
      table.innerHTML =
        '<thead><tr><th colspan="2" style="text-align:center; color:var(--text-tertiary); font-weight:500; text-transform:none; letter-spacing:0">' +
        "Adicione pneus para ver a comparação detalhada</th></tr></thead>";
      return;
    }

    // Definir propriedades a mostrar
    var properties = [
      { key: "size", label: "Medida", icon: "bi-tag" },
      { key: "width", label: "Largura", icon: "bi-arrows", unit: "mm" },
      { key: "profile", label: "Perfil", icon: "bi-percent" },
      { key: "rim", label: "Aro", icon: "bi-circle", unit: "″" },
      {
        key: "sidewallHeight",
        label: "Parede Lateral",
        icon: "bi-arrow-down-up",
        unit: "mm",
      },
      {
        key: "totalDiameter",
        label: "Diâmetro Total",
        icon: "bi-bullseye",
        unit: "mm",
      },
      {
        key: "circumference",
        label: "Circunferência",
        icon: "bi-arrow-repeat",
        unit: "mm",
      },
      {
        key: "revsPerKm",
        label: "Revoluções/km",
        icon: "bi-speedometer2",
        unit: "",
      },
    ];

    // Header com badges numerados
    var thead = '<thead><tr><th class="property-label">Propriedade</th>';
    state.tires.forEach(function (tire, idx) {
      thead +=
        '<th class="tire-header-cell text-center" style="color:' +
        tire.color +
        '">' +
        '<span class="tire-num-badge d-inline-flex me-1" style="background:' +
        tire.color +
        ';color:#000;width:18px;height:18px;font-size:0.68rem;vertical-align:middle">' +
        (idx + 1) +
        "</span> " +
        TireMath.formatTireSize(tire.width, tire.profile, tire.rim) +
        "</th>";
    });

    if (state.tires.length >= 2) {
      thead +=
        '<th class="text-center" style="color:var(--text-tertiary)">Dif. vs 1º (Base)</th>';
    }
    thead += "</tr></thead>";

    // Body
    var tbody = "<tbody>";
    var baseTire = state.tires[0];

    properties.forEach(function (prop) {
      tbody += "<tr>";
      tbody +=
        '<td class="property-label"><i class="bi ' +
        prop.icon +
        '"></i> ' +
        prop.label +
        "</td>";

      state.tires.forEach(function (tire, index) {
        var value = getPropertyValue(tire, prop);
        var unit = prop.unit || "";
        tbody +=
          '<td class="text-center" style="font-family:var(--font-mono)">' +
          value +
          (unit ? " " + unit : "") +
          "</td>";
      });

      // Coluna de diferença
      if (state.tires.length >= 2) {
        var lastTire = state.tires[state.tires.length - 1];
        var diff = getPropertyDiff(baseTire, lastTire, prop);
        tbody += '<td class="text-center">' + diff + "</td>";
      }

      tbody += "</tr>";
    });

    // Linha extra: velocímetro (se há 2+ pneus)
    if (state.tires.length >= 2) {
      var comparison = TireMath.compareTires(
        baseTire.dimensions,
        state.tires[state.tires.length - 1].dimensions,
      );
      tbody += '<tr style="background:rgba(255,255,255,0.02)">';
      tbody +=
        '<td class="property-label"><i class="bi bi-speedometer"></i> Erro Velocímetro</td>';
      state.tires.forEach(function (tire, index) {
        if (index === 0) {
          tbody +=
            '<td class="text-center" style="font-size:0.8rem;color:var(--text-tertiary)">Referência (0%)</td>';
        } else {
          var comp = TireMath.compareTires(
            baseTire.dimensions,
            tire.dimensions,
          );
          var cls =
            comp.speedDiffPercent > 0
              ? "positive"
              : comp.speedDiffPercent < 0
                ? "negative"
                : "zero";
          tbody +=
            '<td class="text-center">' +
            '<span class="diff-pill ' +
            cls +
            '">' +
            TireMath.formatDiff(comp.speedDiffPercent, "%") +
            "</span></td>";
        }
      });
      // Última coluna
      var cls =
        comparison.speedDiffPercent > 0
          ? "positive"
          : comparison.speedDiffPercent < 0
            ? "negative"
            : "zero";
      tbody +=
        '<td class="text-center">' +
        '<span class="diff-pill ' +
        cls +
        '">' +
        TireMath.formatDiff(comparison.speedDiffPercent, "%") +
        "</span></td>";
      tbody += "</tr>";
    }

    tbody += "</tbody>";
    table.innerHTML = thead + tbody;
  }

  /**
   * Obtém o valor de uma propriedade para exibição na tabela.
   */
  function getPropertyValue(tire, prop) {
    switch (prop.key) {
      case "size":
        return TireMath.formatTireSize(tire.width, tire.profile, tire.rim);
      case "width":
        return tire.dimensions.width;
      case "profile":
        return tire.dimensions.profile;
      case "rim":
        return tire.dimensions.rim;
      case "sidewallHeight":
        return tire.dimensions.sidewallHeight;
      case "totalDiameter":
        return tire.dimensions.totalDiameter;
      case "circumference":
        return tire.dimensions.circumference;
      case "revsPerKm":
        return tire.dimensions.revsPerKm;
      default:
        return "—";
    }
  }

  /**
   * Calcula e formata a diferença entre dois pneus para uma propriedade.
   */
  function getPropertyDiff(baseTire, otherTire, prop) {
    if (prop.key === "size") return "—";

    var baseVal = getPropertyValue(baseTire, prop);
    var otherVal = getPropertyValue(otherTire, prop);

    if (typeof baseVal !== "number" || typeof otherVal !== "number") return "—";

    var diff = TireMath.round2(otherVal - baseVal);
    var pct = baseVal !== 0 ? TireMath.round2((diff / baseVal) * 100) : 0;

    if (diff === 0) return '<span class="diff-pill zero">0</span>';

    var cls = diff > 0 ? "positive" : "negative";
    var sign = diff > 0 ? "+" : "";
    var unit = prop.unit || "";

    var warningBadge = "";
    if (prop.key === "totalDiameter" && Math.abs(pct) > 3) {
      warningBadge =
        ' <span class="badge-warning-diff" title="Variação acima da recomendação técnica de 3%"><i class="bi bi-exclamation-triangle-fill"></i> >3% Cuidado</span>';
    }

    return (
      '<span class="diff-pill ' +
      cls +
      '">' +
      sign +
      diff +
      (unit ? " " + unit : "") +
      " (" +
      sign +
      pct +
      "%)</span>" +
      warningBadge
    );
  }

  /**
   * Atualiza o contador de pneus.
   */
  function updateTireCount() {
    if (dom.tireCount) {
      dom.tireCount.textContent =
        state.tires.length + "/" + TireValidation.MAX_TIRES;
    }
  }

  /**
   * Atualiza o estado do botão de adicionar.
   */
  function updateAddButton() {
    if (dom.addBtn) {
      dom.addBtn.disabled = state.tires.length >= TireValidation.MAX_TIRES;
    }
  }

  /* ========================================================================
   * VALIDAÇÃO VISUAL
   * ======================================================================== */

  function showValidationErrors(results) {
    if (!results.width.valid) {
      dom.inputWidth.classList.add("is-invalid");
      dom.errorWidth.textContent = results.width.error;
    }
    if (!results.profile.valid) {
      dom.inputProfile.classList.add("is-invalid");
      dom.errorProfile.textContent = results.profile.error;
    }
    if (!results.rim.valid) {
      dom.inputRim.classList.add("is-invalid");
      dom.errorRim.textContent = results.rim.error;
    }
  }

  function clearValidationState(el) {
    el.classList.remove("is-invalid", "is-valid");
  }

  function clearAllValidation() {
    [dom.inputWidth, dom.inputProfile, dom.inputRim].forEach(function (el) {
      clearValidationState(el);
    });
    [dom.errorWidth, dom.errorProfile, dom.errorRim].forEach(function (el) {
      if (el) el.textContent = "";
    });
  }

  /* ========================================================================
   * TOASTS (Notificações)
   * ======================================================================== */

  function showToast(message, type) {
    type = type || "info";
    var container = dom.toastContainer;
    if (!container) return;

    var icons = {
      success: "bi-check-circle-fill",
      warning: "bi-exclamation-triangle-fill",
      info: "bi-info-circle-fill",
      error: "bi-x-circle-fill",
    };

    var bgColors = {
      success: "rgba(25, 135, 84, 0.9)",
      warning: "rgba(255, 193, 7, 0.9)",
      info: "rgba(13, 202, 240, 0.9)",
      error: "rgba(220, 53, 69, 0.9)",
    };

    var textColor = type === "warning" ? "#000" : "#fff";

    var toastEl = document.createElement("div");
    toastEl.className = "toast align-items-center border-0";
    toastEl.setAttribute("role", "alert");
    toastEl.setAttribute("aria-live", "assertive");
    toastEl.setAttribute("aria-atomic", "true");
    toastEl.style.background = bgColors[type] || bgColors.info;
    toastEl.style.color = textColor;

    toastEl.innerHTML =
      '<div class="d-flex">' +
      '<div class="toast-body">' +
      '<i class="bi ' +
      (icons[type] || icons.info) +
      ' me-2"></i>' +
      TireValidation.sanitizeText(message) +
      "</div>" +
      '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>' +
      "</div>";

    container.appendChild(toastEl);

    var toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();

    toastEl.addEventListener("hidden.bs.toast", function () {
      toastEl.remove();
    });
  }

  /* ========================================================================
   * PERSISTÊNCIA (localStorage)
   * ======================================================================== */

  function saveToStorage() {
    try {
      var data = {
        tires: state.tires.map(function (t) {
          return {
            width: t.width,
            profile: t.profile,
            rim: t.rim,
            visible: t.visible !== false,
          };
        }),
        nextId: state.nextId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // localStorage indisponível (modo privado Safari, etc.)
      console.warn("PneusMedidas: Não foi possível salvar no localStorage.", e);
    }
  }

  function loadFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.tires)) return;

      state.nextId = data.nextId || 1;
      state.tires = [];

      data.tires.forEach(function (t, index) {
        if (index >= TireValidation.MAX_TIRES) return;

        var validation = TireValidation.validateAll(t.width, t.profile, t.rim);
        if (!validation.valid) return;

        var dimensions = TireMath.calculateDimensions(
          t.width,
          t.profile,
          t.rim,
        );
        state.tires.push({
          id: state.nextId++,
          width: t.width,
          profile: t.profile,
          rim: t.rim,
          color: state.colors[index],
          visible: t.visible !== false,
          dimensions: dimensions,
        });
      });
    } catch (e) {
      console.warn("PneusMedidas: Erro ao carregar dados salvos.", e);
      state.tires = [];
    }
  }

  /* ========================================================================
   * API PÚBLICA
   * ======================================================================== */

  return {
    init: init,
    removeTire: removeTire,
    clearAllTires: clearAllTires,
    addTireDirect: addTireDirect,
    getState: function () {
      return state;
    },
  };
})();

// Inicializar quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", App.init);
