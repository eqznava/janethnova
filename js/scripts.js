document.addEventListener("DOMContentLoaded", function () {
    const faqs = document.querySelectorAll(".faq-item");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    let currentIndex = 0;

    function showFAQ(index) {
        faqs.forEach((faq, i) => {
            faq.classList.remove("active");
        });

        faqs[index].classList.add("active");
    }

    prevBtn.addEventListener("click", function () {
        currentIndex = (currentIndex === 0) ? faqs.length - 1 : currentIndex - 1;
        showFAQ(currentIndex);
    });

    nextBtn.addEventListener("click", function () {
        currentIndex = (currentIndex === faqs.length - 1) ? 0 : currentIndex + 1;
        showFAQ(currentIndex);
    });

    // Show the first FAQ initially
    showFAQ(currentIndex);
});
