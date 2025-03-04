document.addEventListener("DOMContentLoaded", function () {
    // Elements for Instrument & Air Sample Selection
    const instrumentSelect = document.getElementById("idInstrument");
    const airSampleSelect = document.getElementById("idAirSample");
    const efficiencyInput = document.getElementById("idEff");

    // Elements for Background & Count Rate
    const bkgCountsInput = document.getElementById("idBkgCounts");
    const countRateInput = document.getElementById("idCountRate");
    const ncpmOutput = document.getElementById("idNcpm");
    const dpmOutput = document.getElementById("idDpm");

    // Elements for Time Calculation
    const startDate = document.getElementById("idStartDate");
    const startTime = document.getElementById("idStartTime");
    const endDate = document.getElementById("idEndDate");
    const endTime = document.getElementById("idEndTime");
    const totalTimeOutput = document.querySelector(".totalTime");

    // Elements for Flow Rate Calculation
    const flowRateInput = document.getElementById("idFlowRate");
    const flowUnitSelect = document.getElementById("idFlow");
    const volumeMlOutput = document.getElementById("idVolumeMl");
    const volumeFtOutput = document.getElementById("idVolumeFt");

    // Get the "Calcular" button
    const calcularButton = document.getElementById("calculateBtn");

    // ✅ Function to format numbers with comma separation and spaces
    function formatNumber(value) {
        return value.toLocaleString("en-US", {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
        }).replace(/,/g, " ").replace(/\s(?=\d{3}(\s|$))/g, ",");
    }

    // ✅ Function to validate number inputs
    function validateNumberInput(event) {
        let inputValue = event.target.value;
        inputValue = inputValue.replace(/[^0-9.]/g, "");

        // Ensure only one decimal point
        if ((inputValue.match(/\./g) || []).length > 1) {
            inputValue = inputValue.substring(0, inputValue.lastIndexOf("."));
        }
        event.target.value = inputValue;
    }

    document.querySelectorAll("input[type='text']").forEach(input => {
        input.addEventListener("input", validateNumberInput);
    });

    // ✅ Function to update UI when Instrument is selected
    function updateInstrumentSettings() {
        if (instrumentSelect.value === "frisker") {
            airSampleSelect.value = "beta";
            airSampleSelect.querySelector("option[value='alpha']").disabled = true;
            efficiencyInput.value = "0.1";
            efficiencyInput.disabled = true;
        } else {
            airSampleSelect.querySelector("option[value='alpha']").disabled = false;
            efficiencyInput.value = "";
            efficiencyInput.disabled = false;
        }
    }

    // ✅ Function to calculate total sample time in minutes
    function calculateTotalTime() {
        if (startDate.value && startTime.value && endDate.value && endTime.value) {
            let start = new Date(`${startDate.value}T${startTime.value}`);
            let end = new Date(`${endDate.value}T${endTime.value}`);

            if (end < start) {
                swal({
                    title: "Error",
                    text: "End time cannot be earlier than start time.",
                    icon: "error",
                    button: "OK",
                });
                return;
            }

            let diffInMinutes = Math.round((end - start) / 60000);
            totalTimeOutput.textContent = formatNumber(diffInMinutes.toFixed(0));
            calculateVolume();
        }
    }

    // ✅ Function to calculate volume
    function calculateVolume() {
        let flowRate = parseFloat(flowRateInput.value) || 0;
        let totalMinutes = parseFloat(totalTimeOutput.textContent.replace(/,/g, "")) || 0;

        if (flowRate > 0 && totalMinutes > 0) {
            let volumeMl, volumeFt;

            if (flowUnitSelect.value === "cfm") {
                volumeMl = flowRate * totalMinutes * 28.3168 * 1000;
                volumeFt = flowRate * totalMinutes;
            } else {
                volumeMl = flowRate * totalMinutes * 1000;
                volumeFt = volumeMl / (28.3168 * 1000);
            }

            volumeMlOutput.textContent = formatNumber(volumeMl.toFixed(0)) + " ml";
            volumeFtOutput.textContent = formatNumber(volumeFt.toFixed(0)) + " ft³";
        } else {
            volumeMlOutput.textContent = "0 ml";
            volumeFtOutput.textContent = "0 ft³";
        }
    }

    // ✅ Function to calculate Net Count (Ncpm)
    function calculateActivity() {
        let bkgCounts = parseFloat(bkgCountsInput.value) || 0;
        let countRate = parseFloat(countRateInput.value) || 0;

        if (bkgCounts > 200 && !bkgCountsInput.dataset.warned) {
            swal({
                title: "Warning",
                text: "Background count rate is too high (>200 cpm). Verify background before proceeding.",
                icon: "warning",
                button: "Understood",
            });
            bkgCountsInput.dataset.warned = "true";
        }

        let netCount = Math.max(countRate - bkgCounts, 0);
        let dpmValue = netCount * 10;

        ncpmOutput.textContent = formatNumber(netCount.toFixed(0)) + " ncpm";
        dpmOutput.textContent = formatNumber(dpmValue.toFixed(0)) + " dpm";
    }

    // ✅ Function to calculate DAC Fraction
    function calculateDACFraction() {
        let netCount = parseFloat(ncpmOutput.textContent.replace(/,/g, "")) || 0;
        let totalVolume = parseFloat(volumeMlOutput.textContent.replace(/,/g, "")) || 0;
        let sampleType = airSampleSelect.value;

        const activityDpm = netCount / 0.1;
        const activityVolBeta = 2.22e-2;
        const activityVolAlpha = 6.66e-6;

        let dacFraction = sampleType === "beta"
            ? (activityDpm) / (totalVolume * activityVolBeta)
            : (activityDpm) / (totalVolume * activityVolAlpha);

        let formattedDacFraction = formatNumber(dacFraction);
        let resultTitle = sampleType === "beta" ? "Beta-Gamma DAC Fraction" : "Alpha DAC Fraction";

        swal({
            title: resultTitle,
            text: `✅ The calculated DAC fraction is: ${formattedDacFraction}.`,
            icon: dacFraction < 0.3 ? "success" : "warning",
            button: "OK",
            className: dacFraction < 0.3 ? "green-alert" : "magenta-alert",
        });
    }

    // ✅ Event Listeners
    instrumentSelect.addEventListener("change", updateInstrumentSettings);
    startDate.addEventListener("change", calculateTotalTime);
    startTime.addEventListener("change", calculateTotalTime);
    endDate.addEventListener("change", calculateTotalTime);
    endTime.addEventListener("change", calculateTotalTime);
    flowRateInput.addEventListener("input", calculateVolume);
    countRateInput.addEventListener("input", calculateActivity);
    bkgCountsInput.addEventListener("input", calculateActivity);
    calcularButton.addEventListener("click", calculateDACFraction);

    // Initialize settings
    updateInstrumentSettings();
});
