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
                totalVolume = flowRate * totalMinutes * 28.3168; // Convert CFM to Liters
            } else {
                totalVolume = flowRate * totalMinutes; // LPM directly gives volume in mL
            }
            
            totalFlowOutput.textContent = Math.round(totalVolume); // Rounded result
        } else {
            totalFlowOutput.textContent = "0";
        }
    }

    // Function to calculate Net Count (Ncpm)
    function calculateNcpm() {
        let bkgCounts = parseFloat(bkgCountsInput.value) || 0;
        let countRate = parseFloat(countRateInput.value) || 0;

        let netCount = countRate - bkgCounts;
        ncpmInput.value = Math.max(Math.round(netCount), 0); // Rounded and no negative values
    }

    // Event listeners
    startDate.addEventListener("change", calculateTotalTime);
    startTime.addEventListener("change", calculateTotalTime);
    endDate.addEventListener("change", calculateTotalTime);
    endTime.addEventListener("change", calculateTotalTime);
    flowRateInput.addEventListener("input", calculateVolume);
    flowUnitSelect.addEventListener("change", calculateVolume);
    countRateInput.addEventListener("input", calculateNcpm);
    bkgCountsInput.addEventListener("input", calculateNcpm);
});
