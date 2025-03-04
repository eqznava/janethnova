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

    // ✅ Function to format numbers with commas and decimals
    function formatNumber(value) {
        return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }

    // ✅ Restrict inputs to numbers & decimals
    function validateNumberInput(event) {
        let inputValue = event.target.value;

        // Remove invalid characters (allow only numbers and one decimal point)
        inputValue = inputValue.replace(/[^0-9.]/g, "");

        // Ensure only one decimal point is allowed
        if ((inputValue.match(/\./g) || []).length > 1) {
            inputValue = inputValue.substring(0, inputValue.lastIndexOf("."));
        }

        // Update the input field value
        event.target.value = inputValue;
    }

    // Apply validation to all relevant input fields
    document.querySelectorAll("input[type='text']").forEach((input) => {
        input.addEventListener("input", validateNumberInput);
    });

    // ✅ Function to update UI when Instrument is selected
    function updateInstrumentSettings() {
        if (instrumentSelect.value === "frisker") {
            // Only show Beta-Gamma for Frisker
            airSampleSelect.value = "beta";
            airSampleSelect.querySelector("option[value='alpha']").disabled = true;

            // Auto-set Efficiency to 10%
            efficiencyInput.value = "0.1";
            efficiencyInput.disabled = true;
        } else {
            // Allow selecting Alpha for Scaler
            airSampleSelect.querySelector("option[value='alpha']").disabled = false;

            // Allow Efficiency to be manually entered
            efficiencyInput.value = "";
            efficiencyInput.disabled = false;
        }
    }

    // ✅ Function to calculate total sample time in minutes
    function calculateTotalTime() {
        if (startDate.value && startTime.value && endDate.value && endTime.value) {
            let start = new Date(`${startDate.value}T${startTime.value}`);
            let end = new Date(`${endDate.value}T${endTime.value}`);

            if (end > start) {
                let diffInMinutes = Math.round((end - start) / 60000);
                totalTimeOutput.textContent = formatNumber(diffInMinutes);
                calculateVolume(); // Ensure volume updates
            } else {
                totalTimeOutput.textContent = "Invalid";
            }
        }
    }

    // ✅ Function to calculate volume in milliliters and cubic feet
    function calculateVolume() {
        let flowRate = parseFloat(flowRateInput.value);
        let totalMinutes = parseFloat(totalTimeOutput.textContent.replace(/,/g, ""));

        if (!isNaN(flowRate) && totalMinutes > 0) {
            let volumeMl, volumeFt;

            if (flowUnitSelect.value === "cfm") {
                volumeMl = flowRate * totalMinutes * 28.3168 * 1000; // Convert CFM to mL
                volumeFt = flowRate * totalMinutes; // Directly in cubic feet
            } else {
                volumeMl = flowRate * totalMinutes * 1000; // LPM gives mL directly
                volumeFt = volumeMl / (28.3168 * 1000); // Convert mL to ft³
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

        // Alert if Background is too high
        if (bkgCounts > 200) {
            swal({
                title: "Warning",
                text: "Background count rate is too high (>200 cpm). Verify background before proceeding.",
                icon: "warning",
                button: "Understood",
            });
        }

        // Calculate Net Count & DPM
        let netCount = Math.max(countRate - bkgCounts, 0);
        let dpmValue = netCount * 10; // Convert ncpm to dpm

        // Update Outputs
        ncpmOutput.textContent = formatNumber(netCount.toFixed(0)) + " ncpm";
        dpmOutput.textContent = formatNumber(dpmValue.toFixed(0)) + " dpm";
    }

    // ✅ Function to calculate DAC Fraction and display results
    function calculateDACFraction() {
        let netCount = parseFloat(ncpmOutput.textContent.replace(/,/g, "")) || 0;
        let totalVolume = parseFloat(volumeMlOutput.textContent.replace(/,/g, "")) || 0;
        let sampleType = airSampleSelect.value;

        // Constants
        const activityDpm = netCount / 0.1;
        const activityVolBeta = 2.22e-2;
        const activityVolAlpha = 6.66e-6;

        if (!sampleType) {
            swal({
                title: "Error",
                text: "Please select an air sample type before calculating DAC Fraction.",
                icon: "warning",
                button: "OK",
            });
            return;
        }

        let dacFraction = sampleType === "beta"
            ? (activityDpm) / (totalVolume * activityVolBeta)
            : (activityDpm) / (totalVolume * activityVolAlpha);

        let formattedDacFraction = dacFraction.toFixed(3);
        let resultTitle = sampleType === "beta" ? "Beta-Gamma DAC Fraction" : "Alpha DAC Fraction";

        if (dacFraction < 0.3) {
            swal({
                title: resultTitle,
                text: `✅ The calculated DAC fraction is: ${formattedDacFraction}. The sample is clean.`,
                icon: "success",
                button: "OK",
            });
        } else {
            swal({
                title: "⚠ STOP WORK!",
                text: `🚨 DAC fraction is ${formattedDacFraction}. Notify supervisor and take a second sample.`,
                icon: "warning",
                button: "Understood",
            });
        }
    }

    // ✅ Event Listeners
    instrumentSelect.addEventListener("change", updateInstrumentSettings);
    startDate.addEventListener("change", calculateTotalTime);
    startTime.addEventListener("change", calculateTotalTime);
    endDate.addEventListener("change", calculateTotalTime);
    endTime.addEventListener("change", calculateTotalTime);
    countRateInput.addEventListener("input", calculateActivity);
    bkgCountsInput.addEventListener("input", calculateActivity);
    calcularButton.addEventListener("click", calculateDACFraction);

    // Initialize settings
    updateInstrumentSettings();
});