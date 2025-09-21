document.addEventListener("DOMContentLoaded", function () {
    const faqContent = document.querySelector(".faq-content");
    const faqItems = document.querySelectorAll(".faq-item");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    // Guard: initialize only if FAQ slider markup exists on this page
    if (!faqContent || faqItems.length === 0 || !prevBtn || !nextBtn) {
        console.warn("[FAQ Slider] Skipped initialization: required elements not found on this page.");
        return;
    }

    let currentIndex = 0;

    function updateFAQPosition() {
        const firstItem = faqItems[0];
        const itemWidth = firstItem ? firstItem.offsetWidth : 0;
        faqContent.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
    }

    nextBtn.addEventListener("click", function () {
        if (currentIndex < faqItems.length - 1) {
            currentIndex++;
            updateFAQPosition();
        }
    });

    prevBtn.addEventListener("click", function () {
        if (currentIndex > 0) {
            currentIndex--;
            updateFAQPosition();
        }
    });

    // Resize fix
    window.addEventListener("resize", updateFAQPosition);
});
