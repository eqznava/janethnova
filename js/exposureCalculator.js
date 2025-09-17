// Exposure Rate Calculator JavaScript
// Calculates Xdot using: Xdot = Σ [(Gamma * A) / (4 * π * r²) * exp(-μ * r)] for each selected isotope
// Gamma fetched from IAEA API: https://www-nds.iaea.org/relnsd/vexd/X4/API?rad=NUCLIDE
// Units: Gamma (R-cm²/mCi-h), A (mCi), r (cm), μ (per cm), Xdot (R/h)
// Author: Kilo Code (based on airborne template)

document.addEventListener("DOMContentLoaded", function () {
    // Elements
    const nuclideSelect = document.getElementById("nuclideSelect");
    const activityInputsDiv = document.getElementById("activityInputs");
    const distanceInput = document.getElementById("distance");
    const muInput = document.getElementById("mu");
    const xdotOutput = document.getElementById("xdotResult");
    const calculateButton = document.getElementById("calculateBtn");

    // Data structures
    const gammaConstants = new Map(); // nuclide -> gammaConstant (R-cm²/mCi-h)
    let selectedNuclides = []; // Track selected for dynamic inputs

    // Pre-populate common nuclides' Gammas (fallback if API fails, approximate values)
    const fallbackGammas = {
        'TC99M': 0.78,
        'I131': 2.2,
        'CS137': 3.3,
        'CO60': 12.9,
        'IR192': 4.69,
        'AM241': 0.012,
        'CO57': 0.37,
        'NA22': 4.3
    };

    // Format numbers with commas for readability (like airborne)
    function formatNumber(value) {
        return value.toLocaleString("en-US", {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
        });
    }

    // Validate number inputs (positive, decimal allowed)
    function validateNumberInput(event) {
        let value = event.target.value.replace(/[^0-9.]/g, "");
        if (value.match(/\./g)?.length > 1) {
            value = value.substring(0, value.lastIndexOf("."));
        }
        if (parseFloat(value) < 0) value = "";
        event.target.value = value;
    }

    // Fetch Gamma constant from IAEA API
    async function fetchGammaConstant(nuclide) {
        try {
            const response = await fetch(`https://www-nds.iaea.org/relnsd/vexd/X4/API?rad=${nuclide}`);
            if (!response.ok) throw new Error('API response not ok');
            const data = await response.json();
            const gammaConstant = data.gamma_constant; // Assumed field from user spec
            if (gammaConstant) {
                gammaConstants.set(nuclide, gammaConstant);
                return gammaConstant;
            } else {
                throw new Error('Gamma constant not found');
            }
        } catch (error) {
            console.error(`API fetch failed for ${nuclide}:`, error);
            // Fallback to pre-populated value
            const fallback = fallbackGammas[nuclide];
            if (fallback) {
                gammaConstants.set(nuclide, fallback);
                Swal.fire({
                    title: "API Warning",
                    text: `Using fallback Gamma for ${nuclide}: ${fallback} R-cm²/mCi-h (API unavailable)`,
                    icon: "warning"
                });
                return fallback;
            } else {
                throw error;
            }
        }
    }

    // Dynamically create activity inputs for selected nuclides
    function updateActivityInputs() {
        const selectedOptions = Array.from(nuclideSelect.selectedOptions).map(option => option.value);
        selectedNuclides = selectedOptions;

        // Clear existing inputs
        activityInputsDiv.innerHTML = "";

        if (selectedNuclides.length === 0) {
            activityInputsDiv.innerHTML = "<p>Select nuclides above to add activity inputs.</p>";
            return;
        }

        selectedNuclides.forEach((nuclide, index) => {
            const container = document.createElement("div");
            container.style.marginBottom = "10px";
            container.innerHTML = `
                <label for="activity_${nuclide}">Activity for ${nuclide} (mCi):</label>
                <input type="number" id="activity_${nuclide}" name="activity_${nuclide}" placeholder="0" min="0" step="0.001" inputmode="decimal">
            `;
            activityInputsDiv.appendChild(container);

            const activityInput = document.getElementById(`activity_${nuclide}`);
            activityInput.addEventListener("input", validateNumberInput);

            // Fetch Gamma on first load for this nuclide
            if (!gammaConstants.has(nuclide)) {
                fetchGammaConstant(nuclide);
            }
        });

        // Add real-time calculation listener after inputs created
        addRealTimeListeners();
    }

    // Add event listeners for real-time updates (distance, mu, activities)
    function addRealTimeListeners() {
        // Debounce for API, but for calc, direct input
        distanceInput.addEventListener("input", calculateXdot);
        muInput.addEventListener("input", validateNumberInput);
        // Activities already have input listeners from creation
    }

    // Calculate total Xdot
    function calculateXdot() {
        if (selectedNuclides.length === 0) {
            xdotOutput.textContent = "0";
            return;
        }

        const r = parseFloat(distanceInput.value) || 0;
        const mu = parseFloat(muInput.value) || 0;
        const pi = Math.PI;

        if (r <= 0) {
            xdotOutput.textContent = "0";
            return;
        }

        let totalXdot = 0;

        selectedNuclides.forEach(nuclide => {
            const activityMci = parseFloat(document.getElementById(`activity_${nuclide}`)?.value) || 0;
            const gammaConstant = gammaConstants.get(nuclide) || 0;

            if (activityMci > 0 && gammaConstant > 0) {
                // Formula: Xdot_i = (Gamma * A) / (4 * π * r²) * exp(-μ * r)
                const denominator = 4 * pi * Math.pow(r, 2);
                const attenuation = Math.exp(-mu * r);
                const xdotI = (gammaConstant * activityMci / denominator) * attenuation;
                totalXdot += xdotI;
            }
        });

        xdotOutput.textContent = formatNumber(totalXdot);
    }

    // Validation for calculate button
    function validateInputs() {
        if (selectedNuclides.length === 0) {
            Swal.fire({
                title: "Error",
                text: "Please select at least one radionuclide.",
                icon: "error"
            });
            return false;
        }
        if (parseFloat(distanceInput.value) <= 0) {
            Swal.fire({
                title: "Error",
                text: "Distance must be greater than 0 cm.",
                icon: "error"
            });
            return false;
        }
        let hasActivity = false;
        selectedNuclides.forEach(nuclide => {
            const activity = parseFloat(document.getElementById(`activity_${nuclide}`)?.value);
            if (activity > 0) hasActivity = true;
        });
        if (!hasActivity) {
            Swal.fire({
                title: "Error",
                text: "At least one activity must be greater than 0 mCi.",
                icon: "error"
            });
            return false;
        }
        return true;
    }

    // Event Listeners
    nuclideSelect.addEventListener("change", updateActivityInputs);
    calculateButton.addEventListener("click", function () {
        if (validateInputs()) {
            calculateXdot();
            // Optional: Alert with result if high (>1 R/h)
            const totalXdot = parseFloat(xdotOutput.textContent.replace(/,/g, ""));
            if (totalXdot > 1) {
                Swal.fire({
                    title: "High Exposure Warning",
                    text: `Total Xdot: ${formatNumber(totalXdot)} R/h - Take precautions!`,
                    icon: "warning"
                });
            }
        }
    });

    // Initial setup
    distanceInput.addEventListener("input", validateNumberInput);
    muInput.addEventListener("input", validateNumberInput);
    updateActivityInputs(); // Initial call
});