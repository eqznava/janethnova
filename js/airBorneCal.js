function calculateDACFraction() {
    let ncpmInput = document.getElementById("idNcpm");
    let netCount = parseFloat(ncpmInput.value) || 0;
    let totalFlowOutput = document.querySelector(".totalFlow");
    let totalVolume = parseFloat(totalFlowOutput.textContent) || 0;
    let sampleType = document.getElementById("idAirSample").value; // Get selected value
    const activityDpm = netCount/0.1;
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

    if (sampleType === "beta") { // Matches <option value="beta">
        if (totalVolume > 0) {
            let betaGamDacFraction = (activityDpm) / (totalVolume*activityVolBeta); // Replace with actual calculation
            betaGamDacFraction = betaGamDacFraction.toFixed(4); // Round to 4 decimal places

            // Display result in SweetAlert modal
            swal({
                title: "DAC Fraction Result",
                text: `The calculated fraction of DAC is: ${betaGamDacFraction}`,
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
    } else {
        swal({
            title: "Notice",
            text: "The selected sample type is not applicable for DAC fraction calculation.",
            icon: "warning",
            button: "OK",
        });
    }
}

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
    const totalFlowOutput = document.querySelector(".totalFlow");

    // Elements for Net Count calculation
    const bkgCountsInput = document.getElementById("idBkgCounts");
    const countRateInput = document.getElementById("idCountRate");
    const ncpmInput = document.getElementById("idNcpm");

    // Get the "Calcular" button
    const calcularButton = document.getElementById("calculateBtn");

    // Function to calculate total time in minutes
    function calculateTotalTime() {
        if (startDate.value && startTime.value && endDate.value && endTime.value) {
            let start = new Date(`${startDate.value}T${startTime.value}`);
            let end = new Date(`${endDate.value}T${endTime.value}`);

            if (end > start) {
                let diffInMinutes = Math.round((end - start) / 60000); // Round to whole number
                totalTimeOutput.textContent = diffInMinutes;
                calculateVolume(); // Ensure volume updates with new time
            } else {
                totalTimeOutput.textContent = "Invalid";
            }
        }
    }

    // Function to calculate volume based on flow rate and time
    function calculateVolume() {
        let flowRate = parseFloat(flowRateInput.value);
        let totalMinutes = parseInt(totalTimeOutput.textContent);
        
        if (!isNaN(flowRate) && totalMinutes > 0) {
            let totalVolume;
            
            if (flowUnitSelect.value === "cfm") {
                totalVolume = flowRate * totalMinutes * 28.3168*1000; // Convert CFM to Liters
            } else {
                totalVolume = flowRate * totalMinutes*1000; // LPM directly gives volume in mL
            }
            
            totalFlowOutput.textContent = Math.round(totalVolume); // Rounded result
        } else {
            totalFlowOutput.textContent = "0";
        }
    }

    // Function to calculate Net Count (Ncpm)
    function calculateActivity() {
        let bkgCounts = parseFloat(bkgCountsInput.value) || 0;
        let countRate = parseFloat(countRateInput.value) || 0;

        let netCount = countRate - bkgCounts;
        ncpmInput.value = Math.max(Math.round(netCount), 0); // Rounded and no negative values
    }

    // Function to calculate DAC Fraction and display it in SweetAlert
    

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
