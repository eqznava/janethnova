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

            if (isNaN(start) || isNaN(end) || end <= start) {
                totalTimeOutput.textContent = "0"; 
                return;
            }

            let diffInMinutes = Math.round((end - start) / 60000);
            totalTimeOutput.textContent = formatNumber(diffInMinutes.toFixed(0));

            calculateVolume();
        } else {
            totalTimeOutput.textContent = "0"; 
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

// ✅ Function to calculate Net Count (Ncpm) & handle Background Alert
function calculateActivity() {
    let bkgCounts = parseFloat(bkgCountsInput.value) || 0;
    let countRate = parseFloat(countRateInput.value) || 0;

    let parentElement = bkgCountsInput.closest(".dataContainer");
    let unitsElement = parentElement.querySelector(".units");

    // Remove the link if it exists
    let existingLink = parentElement.querySelector(".nisp-link");
    if (existingLink) {
        existingLink.remove();
    }

    // Display SweetAlert2 warning if background count is too high
    if (bkgCounts > 200) {
        if (!bkgCountsInput.dataset.warned) {
            Swal.fire({
                title: "⚠ High Background Warning!",
                text: "Background count rate is too high (should be < 200 cpm). Verify background before proceeding.",
                icon: "warning",
                confirmButtonText: "Understood",
                customClass: {
                    popup: "swal-custom-warning"
                }
            });
            bkgCountsInput.dataset.warned = "true";
        }

        // ✅ Add reference link dynamically
        let link = document.createElement("a");
        link.href = "https://westinghousenuclear.com/media/fflait0r/nisp-rp-002-rev-002-2024-02-06-final.pdf#search=6.2.2";
        link.textContent = "Go to NISP-RP-002 Radiation and Contamination Surveys Section 6.2.2 (a & b)";
        link.target = "_blank";
        link.className = "nisp-link";
        link.style.color = "#f776e6";
        link.style.display = "block";
        link.style.marginTop = "10px";
        link.style.fontWeight = "bold";
        link.style.textDecoration = "none";

        unitsElement.insertAdjacentElement("afterend", link);
    } else {
        bkgCountsInput.dataset.warned = ""; 
    }

    let netCount = Math.max(countRate - bkgCounts, 0);
    let dpmValue = netCount * 10;

    ncpmOutput.textContent = formatNumber(netCount.toFixed(0)) + " ncpm";
    dpmOutput.textContent = formatNumber(dpmValue.toFixed(0)) + " dpm";
}


    // ✅ Ensure count rate remains editable at all times
    countRateInput.addEventListener("input", function () {
        calculateActivity();
    });

    function calculateDACFraction() {
        let netCount = parseFloat(ncpmOutput.textContent.replace(/,/g, "")) || 0;
        let totalVolume = parseFloat(volumeMlOutput.textContent.replace(/,/g, "")) || 0;
        let sampleType = airSampleSelect.value;
    
        if (totalVolume === 0) {
            Swal.fire({
                title: "Error",
                text: "Volume cannot be zero. Ensure sample time and flow rate are correct.",
                icon: "error",
                confirmButtonText: "OK"
            });
            return;
        }
    
        const activityDpm = netCount / 0.1;
        const activityVolBeta = 2.22e-2;
        const activityVolAlpha = 6.66e-6;
    
        let dacFraction = sampleType === "beta"
            ? (activityDpm) / (totalVolume * activityVolBeta)
            : (activityDpm) / (totalVolume * activityVolAlpha);
    
        let formattedDacFraction = formatNumber(dacFraction);
        let resultTitle = sampleType === "beta"
            ? `Beta-Gamma DAC Fraction: ${formattedDacFraction} DAC`
            : `Alpha DAC Fraction: ${formattedDacFraction} DAC`;
    
        // Determine which alert to show based on DAC fraction
        let alertClass = "";
        let alertText = "";
        let customContent = "";
    
        if (dacFraction >= 1) {
            alertClass = "red-alert";
            alertText = `🚨 <b>STOP WORK!</b> The calculated DAC fraction is: ${formattedDacFraction}.<br><br> <b>STOP ALL WORK AND NOTIFY SUPERVISOR IMMEDIATELY!</b>`;
            alertText = `${formattedDacFraction}`;
            // Custom content for red-alert (image + list)
            customContent = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <img src="../img/ara-hpbrfe.png" alt="Warning Icon" style="width: 80px; height: auto;">
                <ul style="text-align: left; font-size: 16px; padding-left: 15px;">
                    <li>Notify RP Supervisor</li>
                    <li>Take backup air sample</li>
                    <li>Post the area as ARA.</li>
                    <li>Send to gamma spectrometry</li>
                </ul>
            </div>
        `;
        } else if (dacFraction > 0.3 &&  dacFraction < 1 ) {
            alertClass = "magenta-alert";
            alertText = `⚠ <b>The calculated DAC fraction is: ${formattedDacFraction}.</b> Exercise caution.`;
    
            // Custom content for magenta-alert (image + list)
            customContent = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="../img/ara-hpbrfe.png" alt="Warning Icon" style="width: 80px; height: auto;">
                    <ul style="text-align: left; font-size: 16px; padding-left: 15px;">
                        <li>Notify RP Supervisor</li>
                        <li>Take backup air sample</li>
                        <li>Ask for posting the area as ARA.</li>
                        <li>Send to gamma spectrometry</li>
                    </ul>
                </div>
            `;
        } else {
            alertClass = "green-alert";
            alertText = `✅ The calculated DAC fraction is: ${formattedDacFraction}.`;
        }
    
        // ✅ Show the alert using SweetAlert2
        Swal.fire({
            title: resultTitle,
            html: `${customContent}`,
           // icon: dacFraction >= 1 ? "error" : dacFraction > 0.3 ? "warning" : "success",
            confirmButtonText: "OK",
            customClass: {
                popup: alertClass
            }
        });
    }
    
        
    // ✅ Event Listeners
    instrumentSelect.addEventListener("change", updateInstrumentSettings);
    startDate.addEventListener("change", calculateTotalTime);
    startTime.addEventListener("change", calculateTotalTime);
    endDate.addEventListener("change", calculateTotalTime);
    endTime.addEventListener("change", calculateTotalTime);
    flowRateInput.addEventListener("input", calculateVolume);
    flowUnitSelect.addEventListener("change", calculateVolume);
    countRateInput.addEventListener("input", calculateActivity);
    bkgCountsInput.addEventListener("input", calculateActivity);
    calcularButton.addEventListener("click", function () {
        calculateVolume();
        calculateDACFraction();
    });
    updateInstrumentSettings();
});
