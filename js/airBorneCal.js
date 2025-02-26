document.addEventListener("DOMContentLoaded", function() {
    // Elements for time calculation
    const startDate = document.getElementById("idStartDate");
    const startTime = document.getElementById("idStartTime");
    const endDate = document.getElementById("idEndDate");
    const endTime = document.getElementById("idEndTime");
    const totalTimeOutput = document.querySelector(".totalTime");

    // Elements for flow rate calculation
    const flowRateInput = document.getElementById("idFlowRate");
    const flowUnitSelect = document.getElementById("idFlow");
    const volumeMlOutput = document.getElementById("idVolumeMl");
    const volumeFtOutput = document.getElementById("idVolumeFt");

    // Elements for Net Count calculation
    const bkgCountsInput = document.getElementById("idBkgCounts");
    const countRateInput = document.getElementById("idCountRate");
    const ncpmOutput = document.getElementById("idNcpm");

    // Get the "Calcular" button
    const calcularButton = document.getElementById("calculateBtn");

    // Function to format numbers with commas for readability
    function formatNumber(value) {
        return value.toLocaleString('en-US');
    }

    // Function to calculate total time in minutes
    function calculateTotalTime() {
        if (startDate.value && startTime.value && endDate.value && endTime.value) {
            let start = new Date(`${startDate.value}T${startTime.value}`);
            let end = new Date(`${endDate.value}T${endTime.value}`);

            if (end > start) {
                let diffInMinutes = Math.round((end - start) / 60000);
                totalTimeOutput.textContent = formatNumber(diffInMinutes);
                calculateVolume(); // Update volume calculation
            } else {
                totalTimeOutput.textContent = "Invalid";
            }
        }
    }

    // Function to calculate volume in milliliters and cubic feet
    function calculateVolume() {
        let flowRate = parseFloat(flowRateInput.value);
        let totalMinutes = parseInt(totalTimeOutput.textContent.replace(/,/g, ""));

        if (!isNaN(flowRate) && totalMinutes > 0) {
            let volumeMl, volumeFt;

            if (flowUnitSelect.value === "cfm") {
                volumeMl = flowRate * totalMinutes * 28.3168 * 1000; // Convert CFM to mL
                volumeFt = flowRate * totalMinutes; // Directly in cubic feet
            } else {
                volumeMl = flowRate * totalMinutes * 1000; // LPM gives mL directly
                volumeFt = volumeMl / (28.3168 * 1000); // Convert mL to ft³
            }

            volumeMlOutput.textContent = formatNumber(Math.round(volumeMl)) + " ml";
            volumeFtOutput.textContent = formatNumber(volumeFt.toFixed(4)) + " ft³";
        } else {
            volumeMlOutput.textContent = "0 ml";
            volumeFtOutput.textContent = "0 ft³";
        }
    }

    // Function to calculate Net Count (Ncpm)
    function calculateActivity() {
        let bkgCounts = parseFloat(bkgCountsInput.value) || 0;
        let countRate = parseFloat(countRateInput.value) || 0;
        let netCount = Math.max(Math.round(countRate - bkgCounts), 0);

        ncpmOutput.textContent = formatNumber(netCount);
    }

    // Function to calculate DAC Fraction and display in SweetAlert
    function calculateDACFraction() {
        let netCount = parseFloat(ncpmOutput.textContent.replace(/,/g, "")) || 0; // Read from <output>
        let totalVolume = parseFloat(volumeMlOutput.textContent.replace(/,/g, "")) || 0;
        let sampleType = document.getElementById("idAirSample").value;

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

        let dacFraction;
        let resultTitle;

        if (totalVolume > 0) {
            if (sampleType === "beta") {
                dacFraction = (activityDpm) / (totalVolume * activityVolBeta);
                resultTitle = "Beta-Gamma DAC Fraction";
            } else if (sampleType === "alpha") {
                dacFraction = (activityDpm) / (totalVolume * activityVolAlpha);
                resultTitle = "Alpha DAC Fraction";
            } else {
                swal({
                    title: "Notice",
                    text: "The selected sample type is not applicable for DAC fraction calculation.",
                    icon: "warning",
                    button: "OK",
                });
                return;
            }

            // Format as scientific notation
            let formattedDacFraction = dacFraction.toFixed(3);

            // Display result in SweetAlert
            swal({
                title: resultTitle,
                text: `The calculated fraction of DAC is: ${formattedDacFraction}`,
                icon: "info",
                button: "OK",
            });
        } else {
            swal({
                title: "Error",
                text: "Please enter valid input values before calculating DAC Fraction.",
                icon: "error",
                button: "OK",
            });
        }
    }

    // Event listeners
    startDate.addEventListener("change", calculateTotalTime);
    startTime.addEventListener("change", calculateTotalTime);
    endDate.addEventListener("change", calculateTotalTime);
    endTime.addEventListener("change", calculateTotalTime);
    flowRateInput.addEventListener("input", calculateVolume);
    flowUnitSelect.addEventListener("change", calculateVolume);
    countRateInput.addEventListener("input", calculateActivity);
    bkgCountsInput.addEventListener("input", calculateActivity);

    // Attach event listener to the "Calcular" button
    calcularButton.addEventListener("click", calculateDACFraction);
});
