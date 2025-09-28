// Smear Counting Calculator JavaScript
// Supports Beta-Gamma (GM), Alpha, and Beta via Ion Chamber (OW−CW) methods

document.addEventListener("DOMContentLoaded", function () {
  if (window.__SMEAR_INIT__) return; window.__SMEAR_INIT__ = true;
  // ===== DOM =====
  const radiationTypeSelect = document.getElementById("radiationType");
  const smearCountInput = document.getElementById("smearCount");
  const generateSmearsBtn = document.getElementById("generateSmearsBtn");

  const smearInputsContainer = document.getElementById("smearInputsContainer");
  const smearInputsList = document.getElementById("smearInputsList");

  const resultsContainer = document.getElementById("resultsContainer");
  const resultsTable = document.getElementById("resultsTable");

  const alertsPanel = document.getElementById("alertsPanel");
  const actionsContainer = document.getElementById("actionsContainer");

  // Instrument inputs (SESSION-LEVEL)
  const instrumentTypeEl = document.getElementById("instrumentType");
  const instrumentModelEl = document.getElementById("instrumentModel");
  const instrumentScaleEl = document.getElementById("instrumentScale");
  const instrumentSerialEl = document.getElementById("instrumentSerial");
  const sessionBackgroundEl = document.getElementById("sessionBackground");
  const instrumentEfficiencyEl = document.getElementById("instrumentEfficiency");
  const betaCorrectionFactorEl = document.getElementById("betaCorrectionFactor");
  const betaCorrectionRow = document.getElementById("betaCorrectionRow");

  // Action buttons
  const addSmearBtn = document.getElementById("addSmearBtn");
  const removeSmearBtn = document.getElementById("removeSmearBtn");
  const exportBtn = document.getElementById("exportBtn");
  const clearBtn = document.getElementById("clearBtn");

  // ===== STATE =====
  let sessionData = {
    radiationType: null, // 'beta-gamma' | 'alpha' | 'beta-ion'
    instrument: {
      type: "",
      model: "",
      scale: "",
      serial: "",
      background: 0,
      efficiency: 0, // percent for GM/Alpha
      betaCorrectionFactor: 0 // required for OW−CW
    },
    smears: [],
    locked: false
  };

  let lastType = ""; // remember last selected type (for cancel flows)

  // ===== UTIL =====
  const hasSwal = () => typeof Swal !== "undefined";
  const confirmModal = async (title, text, confirmText = "Yes") => {
    if (hasSwal()) {
      const res = await Swal.fire({
        title,
        text,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: "Cancel"
      });
      return res.isConfirmed;
    }
    return window.confirm(`${title}\n\n${text}`);
  };

  function showAlert(message, type = "info") {
  // Asegura que el usuario vea el mensaje aunque no haya resultados aún
  const resultsContainer = document.getElementById("resultsContainer");
  if (resultsContainer && resultsContainer.style.display === "none") {
    resultsContainer.style.display = "block";
  }
  const actionsContainer = document.getElementById("actionsContainer");
  if (actionsContainer && actionsContainer.style.display === "none") {
    actionsContainer.style.display = "block";
  }

  const div = document.createElement("div");
  div.className = `alert ${type}`;
  div.textContent = message;
  alertsPanel.appendChild(div);

  // Centra la vista en la alerta
  div.scrollIntoView({ behavior: "smooth", block: "center" });
}

  function clearAlerts() {
    alertsPanel.innerHTML = "";
  }

  function formatNumber(n, digits = 2) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    return Number(n).toFixed(digits);
  }

  function parseNum(v) {
    const x = parseFloat(v);
    return isNaN(x) ? 0 : x;
  }

  function validateNumberInput(event) {
    let value = event.target.value.replace(/[^0-9.\-]/g, "");
    // keep only first '-' and first '.'
    const minusIndex = value.indexOf("-");
    if (minusIndex > 0) value = value.replace(/-/g, ""); // '-' only allowed at start
    const firstDot = value.indexOf(".");
    if (firstDot !== -1) {
      const before = value.slice(0, firstDot + 1);
      const after = value.slice(firstDot + 1).replace(/\./g, "");
      value = before + after;
    }
    event.target.value = value;
  }

  window.toggleCollapse = function toggleCollapse(containerId) {
    const container = document.getElementById(containerId);
    container.classList.toggle("collapsed");
  };

  // ===== HYDRATE INSTRUMENT (SESSION) =====
  function hydrateInstrumentFromUI() {
    sessionData.instrument.type = instrumentTypeEl.value || "";
    sessionData.instrument.model = instrumentModelEl.value || "";
    sessionData.instrument.scale = instrumentScaleEl.value || "";
    sessionData.instrument.serial = instrumentSerialEl.value || "";
    sessionData.instrument.background = parseNum(sessionBackgroundEl.value);
    sessionData.instrument.efficiency = parseNum(instrumentEfficiencyEl.value);
    sessionData.instrument.betaCorrectionFactor = parseNum(betaCorrectionFactorEl.value);
  }

  // Recalc helper
  function recalcIfNeeded() {
    if (sessionData.locked && sessionData.smears.length > 0) updateResults();
  }

  // ===== CALC =====
  function computeNcpm(gross, background) {
    const ncpm = parseNum(gross) - parseNum(background);
    return ncpm > 0 ? ncpm : 0;
  }

  // efficiency provided as percent (e.g., 10 means 10%)
  function computeDpm(ncpm, efficiencyPercent) {
    const eff = parseNum(efficiencyPercent);
    if (eff <= 0) return 0;
    return parseNum(ncpm) / (eff / 100);
  }

  // Ion Chamber OW−CW; returns { delta, betaDoseRate, gammaDoseRate }
  function computeBetaDoseRate(ow, cw, kBeta) {
    const delta = parseNum(ow) - parseNum(cw);
    const validDelta = delta > 0 ? delta : 0;
    const k = parseNum(kBeta);
    const beta = k > 0 ? validDelta * k : 0;
    return { delta, betaDoseRate: beta, gammaDoseRate: parseNum(cw) };
  }

  // ===== VALIDATION / ALERTS =====
  function validateSessionSetup() {
    hydrateInstrumentFromUI();

    if (!sessionData.radiationType) {
      showAlert("Please select a radiation type.", "error");
      return false;
    }

    if (sessionData.instrument.background < 0) {
      showAlert("Background cannot be negative.", "error");
      return false;
    }

    if (sessionData.radiationType === "beta-gamma" || sessionData.radiationType === "alpha") {
      if (sessionData.instrument.efficiency <= 0) {
        showAlert("Efficiency (%) must be > 0 for GM/Alpha paths.", "error");
        return false;
      }
    }

    if (sessionData.radiationType === "beta-ion") {
      if (sessionData.instrument.betaCorrectionFactor <= 0) {
        showAlert("Beta correction factor (Kβ) is required and must be > 0 for OW−CW.", "error");
        return false;
      }
    }

    return true;
  }

  // GM background warning when verifying <1000 dpm/100 cm²
  function checkGMBackgroundWarning() {
    if (sessionData.radiationType !== "beta-gamma") return;
    if (sessionData.instrument.background < 200) return;

    const anyLow = sessionData.smears.some((smear) => {
      const ncpm = computeNcpm(smear.gross, sessionData.instrument.background);
      const dpm = computeDpm(ncpm, sessionData.instrument.efficiency);
      return dpm < 1000;
    });

    if (anyLow) {
      showAlert("⚠️ GM background ≥ 200 cpm when verifying < 1,000 dpm/100 cm².", "warning");
    }
  }

  // DRP screen (GM path): any smear ncpm > 50,000
  function checkDRPScreening() {
    if (sessionData.radiationType !== "beta-gamma") return;
    const high = sessionData.smears.some((smear) => {
      const ncpm = computeNcpm(smear.gross, sessionData.instrument.background);
      return ncpm > 50000;
    });
    if (high) showAlert("Possible DRP behavior—investigate per procedure.", "alert");
  }

  // OW−CW validation
  function checkOWCWValidation() {
    if (sessionData.radiationType !== "beta-ion") return;

    if (sessionData.instrument.betaCorrectionFactor <= 0) {
      showAlert("Kβ is required (> 0) for OW−CW method.", "error");
    }

    const nonPositive = sessionData.smears.some((smear) => {
      const { delta } = computeBetaDoseRate(smear.ow, smear.cw, sessionData.instrument.betaCorrectionFactor);
      return delta <= 0;
    });
    if (nonPositive) showAlert("OW−CW ≤ 0 → No net beta above gamma; check geometry/windows/instrument.", "warning");
  }

  // ===== RENDER / RESULTS =====
  function updateResults() {
    if (sessionData.smears.length === 0) return;

    clearAlerts();

    let html = "";
    switch (sessionData.radiationType) {
      case "beta-gamma":
        html = generateGMTable();
        break;
      case "alpha":
        html = generateAlphaTable();
        break;
      case "beta-ion":
        html = generateOWCWTable();
        break;
    }

    resultsTable.innerHTML = html;
    checkGMBackgroundWarning();
    checkDRPScreening();
    checkOWCWValidation();

    resultsContainer.style.display = "block";
    actionsContainer.style.display = "block";
  }

  function generateGMTable() {
    let html = `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Location</th>
            <th>Gross (cpm)</th>
            <th>Session Bkg (cpm)</th>
            <th>ncpm</th>
            <th>Efficiency (%)</th>
            <th>Basis</th>
            <th>Result (dpm)</th>
            <th>Comments</th>
          </tr>
        </thead>
        <tbody>
    `;

    sessionData.smears.forEach((smear) => {
      const ncpm = computeNcpm(smear.gross, sessionData.instrument.background);
      const dpm = computeDpm(ncpm, sessionData.instrument.efficiency);
      html += `
        <tr>
          <td>${smear.id}</td>
          <td>${smear.location}</td>
          <td>${formatNumber(smear.gross)}</td>
          <td>${formatNumber(sessionData.instrument.background)}</td>
          <td>${formatNumber(ncpm)}</td>
          <td>${formatNumber(sessionData.instrument.efficiency)}</td>
          <td>${smear.basis}</td>
          <td>${formatNumber(dpm)}</td>
          <td>${smear.comments}</td>
        </tr>
      `;
    });

    html += "</tbody></table>";
    return html;
  }

  function generateAlphaTable() {
    let html = `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Location</th>
            <th>Gross (cpm)</th>
            <th>Session Bkg (cpm)</th>
            <th>ncpm</th>
            <th>Efficiency (%)</th>
            <th>Basis</th>
            <th>Result (dpm)</th>
            <th>Comments</th>
          </tr>
        </thead>
        <tbody>
    `;

    sessionData.smears.forEach((smear) => {
      const ncpm = computeNcpm(smear.gross, sessionData.instrument.background);
      const dpm = computeDpm(ncpm, sessionData.instrument.efficiency);
      html += `
        <tr>
          <td>${smear.id}</td>
          <td>${smear.location}</td>
          <td>${formatNumber(smear.gross)}</td>
          <td>${formatNumber(sessionData.instrument.background)}</td>
          <td>${formatNumber(ncpm)}</td>
          <td>${formatNumber(sessionData.instrument.efficiency)}</td>
          <td>${smear.basis}</td>
          <td>${formatNumber(dpm)}</td>
          <td>${smear.comments}</td>
        </tr>
      `;
    });

    html += "</tbody></table>";
    return html;
  }

  function generateOWCWTable() {
    let html = `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Location</th>
            <th>Basis</th>
            <th>CW (γ)</th>
            <th>OW (β+γ)</th>
            <th>Δ (OW−CW)</th>
            <th>Kβ</th>
            <th>Beta dose rate (mrad/hr)</th>
            <th>Gamma (mrad/hr)</th>
            <th>Distance</th>
            <th>Comments</th>
          </tr>
        </thead>
        <tbody>
    `;

    sessionData.smears.forEach((smear) => {
      const { delta, betaDoseRate, gammaDoseRate } = computeBetaDoseRate(
        smear.ow,
        smear.cw,
        sessionData.instrument.betaCorrectionFactor
      );

      html += `
        <tr>
          <td>${smear.id}</td>
          <td>${smear.location}</td>
          <td>${smear.basis}</td>
          <td>${formatNumber(smear.cw)}</td>
          <td>${formatNumber(smear.ow)}</td>
          <td>${formatNumber(delta)}</td>
          <td>${formatNumber(sessionData.instrument.betaCorrectionFactor)}</td>
          <td>${formatNumber(betaDoseRate)}</td>
          <td>${formatNumber(gammaDoseRate)}</td>
          <td>${smear.distance}</td>
          <td>${smear.comments}</td>
        </tr>
      `;
    });

    html += "</tbody></table>";
    return html;
  }

  // ===== SMEARS UI =====
  function createSmearCard(smear) {
    const card = document.createElement("div");
    card.className = "smear-card";
    card.id = `smear-${smear.id}`;

    let inputsHTML = `
      <div class="smear-inputs">
        <input type="text" placeholder="Location/Map note" value="${smear.location}"
               onchange="updateSmear(${smear.id}, 'location', this.value)">
        <input type="text" placeholder="Comments" value="${smear.comments}"
               onchange="updateSmear(${smear.id}, 'comments', this.value)">
    `;

    switch (sessionData.radiationType) {
      case "beta-gamma":
      case "alpha":
        inputsHTML += `
          <select onchange="updateSmear(${smear.id}, 'basis', this.value)">
            <option value="100 cm²" ${smear.basis === "100 cm²" ? "selected" : ""}>100 cm²</option>
            <option value="dpm/smear" ${smear.basis === "dpm/smear" ? "selected" : ""}>dpm/smear</option>
          </select>
          <input type="number" placeholder="Gross (cpm)" value="${smear.gross}" step="0.1"
                 onchange="updateSmear(${smear.id}, 'gross', parseFloat(this.value) || 0)">
        `;
        break;

      case "beta-ion":
        inputsHTML += `
          <select onchange="updateSmear(${smear.id}, 'basis', this.value)">
            <option value="Direct component" ${smear.basis === "Direct component" ? "selected" : ""}>Direct component</option>
            <option value="Smear (contact check)" ${smear.basis === "Smear (contact check)" ? "selected" : ""}>Smear (contact check)</option>
          </select>
          <input type="number" placeholder="CW (γ) mrad/hr" value="${smear.cw}" step="0.01"
                 onchange="updateSmear(${smear.id}, 'cw', parseFloat(this.value) || 0)">
          <input type="number" placeholder="OW (β+γ) mrad/hr" value="${smear.ow}" step="0.01"
                 onchange="updateSmear(${smear.id}, 'ow', parseFloat(this.value) || 0)">
          <select onchange="updateSmear(${smear.id}, 'distance', this.value)">
            <option value="Near-contact" ${smear.distance === "Near-contact" ? "selected" : ""}>Near-contact</option>
            <option value="30 cm" ${smear.distance === "30 cm" ? "selected" : ""}>30 cm</option>
          </select>
        `;
        break;
    }

    inputsHTML += `</div>`;
    card.innerHTML = `<h4>Smear #${smear.id}</h4>${inputsHTML}`;
    return card;
  }

  function lockSession() {
    sessionData.locked = true;
    radiationTypeSelect.disabled = true;
    document.getElementById("radiationTypeWarning").style.display = "block";
    smearInputsContainer.style.display = "block";
    resultsContainer.style.display = "block";
    actionsContainer.style.display = "block";
  }

  async function performReset(keepType = null) {
    // preserve new type if provided
    const newType = keepType ?? null;

    sessionData = {
      radiationType: newType,
      instrument: {
        type: "",
        model: "",
        scale: "",
        serial: "",
        background: 0,
        efficiency: 0,
        betaCorrectionFactor: 0
      },
      smears: [],
      locked: false
    };

    // Clear UI
    smearInputsList.innerHTML = "";
    resultsTable.innerHTML = "";
    clearAlerts();

    // Reset form controls (except radiationType if keepType passed)
    document.querySelectorAll("input, select").forEach((el) => {
      if (el === radiationTypeSelect && newType) return;
      if (el.id === "radiationType") return; // managed separately
      el.value = "";
    });

    // Set radiation type select properly
    if (newType) {
      radiationTypeSelect.value = newType;
    } else {
      radiationTypeSelect.value = "";
    }

    // Toggle Kβ row visibility
    betaCorrectionRow.style.display = (sessionData.radiationType === "beta-ion") ? "flex" : "none";

    smearInputsContainer.style.display = "none";
    resultsContainer.style.display = "none";
    actionsContainer.style.display = "none";
    document.getElementById("radiationTypeWarning").style.display = "none";
  }

  // ===== GENERATE SMEARS =====
  function generateSmearInputs() {
    if (!validateSessionSetup()) return;

    const count = parseInt(smearCountInput.value, 10);
    if (!count || count < 1 || count > 50) {
      showAlert("Please enter a valid number of smears (1–50).", "error");
      return;
    }

    smearInputsList.innerHTML = "";
    sessionData.smears = [];

    for (let i = 1; i <= count; i++) {
      const smear = { id: i, location: "", comments: "" };

      if (sessionData.radiationType === "beta-gamma" || sessionData.radiationType === "alpha") {
        smear.basis = "100 cm²"; // default
        smear.gross = 0;
      } else if (sessionData.radiationType === "beta-ion") {
        smear.basis = "Direct component";
        smear.cw = 0;
        smear.ow = 0;
        smear.distance = "Near-contact";
      }

      sessionData.smears.push(smear);
      smearInputsList.appendChild(createSmearCard(smear));
    }

    lockSession();
    updateResults();
  }

  // ===== EXPORT =====
  function generateReport() {
    const timestamp = new Date().toISOString();
    const lines = [
      "JanethNova — Smear Counting Report",
      `Timestamp: ${timestamp}`,
      "Surveyor: [Enter Name/ID]",
      `Radiation Type: ${sessionData.radiationType}`,
      "",
      "Instrument:",
      `  - Type: ${sessionData.instrument.type}`,
      `  - Model: ${sessionData.instrument.model}`,
      `  - Serial: ${sessionData.instrument.serial}`,
      `  - Scale: ${sessionData.instrument.scale}`,
      `  - Efficiency: ${formatNumber(sessionData.instrument.efficiency)}%`,
      `  - Background: ${formatNumber(sessionData.instrument.background)} cpm`,
      `  - Kβ: ${formatNumber(sessionData.instrument.betaCorrectionFactor)}`,
      "",
      "Assumptions & Basis:",
      "  - GM/Alpha: ncpm = Gross − Background; dpm = ncpm / efficiency.",
      "  - Ion chamber: Δ = OW − CW; Beta dose rate = Δ × Kβ; Gamma = CW.",
      "  - Units: dpm/100 cm² or dpm/smear (GM/Alpha); mrad/hr (OW−CW).",
      "",
      `Smears (N=${sessionData.smears.length}):`,
      ""
    ];

    switch (sessionData.radiationType) {
      case "beta-gamma":
      case "alpha":
        lines.push("# GM/Alpha:");
        lines.push("ID | Location | Gross (cpm) | Session Bkg (cpm) | ncpm | Eff (%) | Basis | Result (dpm) | Comments");
        sessionData.smears.forEach((smear) => {
          const ncpm = computeNcpm(smear.gross, sessionData.instrument.background);
          const dpm = computeDpm(ncpm, sessionData.instrument.efficiency);
          lines.push(
            `${smear.id} | ${smear.location} | ${formatNumber(smear.gross)} | ${formatNumber(sessionData.instrument.background)} | ${formatNumber(ncpm)} | ${formatNumber(sessionData.instrument.efficiency)} | ${smear.basis} | ${formatNumber(dpm)} | ${smear.comments}`
          );
        });
        break;

      case "beta-ion":
        lines.push("# OW−CW:");
        lines.push("ID | Location | Basis | CW (γ) | OW (β+γ) | Δ | Kβ | Beta dose rate (mrad/hr) | Gamma (mrad/hr) | Dist | Comments");
        sessionData.smears.forEach((smear) => {
          const { delta, betaDoseRate, gammaDoseRate } = computeBetaDoseRate(
            smear.ow,
            smear.cw,
            sessionData.instrument.betaCorrectionFactor
          );
          lines.push(
            `${smear.id} | ${smear.location} | ${smear.basis} | ${formatNumber(smear.cw)} | ${formatNumber(smear.ow)} | ${formatNumber(delta)} | ${formatNumber(sessionData.instrument.betaCorrectionFactor)} | ${formatNumber(betaDoseRate)} | ${formatNumber(gammaDoseRate)} | ${smear.distance} | ${smear.comments}`
          );
        });
        break;
    }

    lines.push("", "Summary:", "  - Max/Avg results; Flags/Alerts; RWP (if provided)", "End of Report");
    return lines.join("\n");
  }

  function downloadReport() {
    if (sessionData.smears.length === 0) {
      showAlert("No smear data to export.", "error");
      return;
    }
    const report = generateReport();
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smear-counting-report-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showAlert("Report exported successfully!", "info");
  }

  // ===== EVENTS =====

  // Radiation type change (with safe reset)
  radiationTypeSelect.addEventListener("change", async function () {
    const newType = this.value;

    // Toggle Kβ row
    betaCorrectionRow.style.display = newType === "beta-ion" ? "flex" : "none";

    if (sessionData.locked && sessionData.smears.length > 0) {
      const ok = await confirmModal(
        "Change Radiation Type?",
        "Changing radiation type will clear all smear data.",
        "Yes, reset"
      );
      if (!ok) {
        this.value = lastType || "";
        return;
      }
      await performReset(newType);
      sessionData.radiationType = newType;
      lastType = newType;
      return;
    }

    // Not locked yet → just set it
    sessionData.radiationType = newType;
    lastType = newType;
  });

  // Generate
  generateSmearsBtn.addEventListener("click", generateSmearInputs);

  // Add smear
  addSmearBtn.addEventListener("click", function () {
    if (!sessionData.locked || !sessionData.radiationType) {
      showAlert("Select radiation type and generate first.", "error");
      return;
    }
    if (sessionData.smears.length >= 50) {
      showAlert("Maximum 50 smears allowed.", "error");
      return;
    }
    const newId = sessionData.smears.length + 1;
    const smear = { id: newId, location: "", comments: "" };

    if (sessionData.radiationType === "beta-gamma" || sessionData.radiationType === "alpha") {
      smear.basis = "100 cm²";
      smear.gross = 0;
    } else {
      smear.basis = "Direct component";
      smear.cw = 0;
      smear.ow = 0;
      smear.distance = "Near-contact";
    }

    sessionData.smears.push(smear);
    smearInputsList.appendChild(createSmearCard(smear));
    updateResults();
  });

  // Remove last smear
  removeSmearBtn.addEventListener("click", function () {
    if (sessionData.smears.length === 0) {
      showAlert("No smears to remove.", "error");
      return;
    }
    sessionData.smears.pop();
    const last = smearInputsList.lastElementChild;
    if (last) smearInputsList.removeChild(last);
    updateResults();
  });

  // Export
  exportBtn.addEventListener("click", downloadReport);

  // Clear all
  clearBtn.addEventListener("click", async function () {
    if (sessionData.smears.length === 0) {
      await performReset(sessionData.radiationType || null);
      return;
    }
    const ok = await confirmModal("Clear All Data?", "This will remove all smear measurements.", "Clear");
    if (!ok) return;
    await performReset(sessionData.radiationType || null);
  });

  // Instrument listeners (hydrate + recalc)
  [instrumentTypeEl, instrumentModelEl, instrumentScaleEl, instrumentSerialEl].forEach((el) => {
    el.addEventListener("input", hydrateInstrumentFromUI);
  });

  sessionBackgroundEl.addEventListener("input", () => {
    hydrateInstrumentFromUI();
    recalcIfNeeded();
  });

  instrumentEfficiencyEl.addEventListener("input", () => {
    hydrateInstrumentFromUI();
    recalcIfNeeded();
  });

  betaCorrectionFactorEl.addEventListener("input", () => {
    hydrateInstrumentFromUI();
    recalcIfNeeded();
  });

  // Sanitize numeric inputs
  document.querySelectorAll('input[type="number"]').forEach((input) => {
    input.addEventListener("input", validateNumberInput);
  });

  // Global handlers for inline onchange in cards
  window.updateSmear = function updateSmear(id, field, value) {
    const smear = sessionData.smears.find((s) => s.id === id);
    if (!smear) return;
    smear[field] = value;
    updateResults();
  };
});

// (moved inside DOMContentLoaded guard)
