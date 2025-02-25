document.addEventListener("DOMContentLoaded", function () {
    const faqContent = document.querySelector(".faq-content");
    const faqItems = document.querySelectorAll(".faq-item");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    
    let currentIndex = 0;
    
    function updateFAQPosition() {
        const itemWidth = faqItems[0].offsetWidth;
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
