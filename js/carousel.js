document.addEventListener("DOMContentLoaded", function () {
    const carousel = document.querySelector(".carousel");
    const cards = document.querySelectorAll(".card");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    let currentIndex = 0;
    const totalCards = cards.length;

    function updateCarousel() {
        cards.forEach((card, index) => {
            card.style.opacity = "0";  // Hide all cards
            card.style.display = "none";
        });

        // Show only the current card
        cards[currentIndex].style.display = "block";
        setTimeout(() => {
            cards[currentIndex].style.opacity = "1";
        }, 50);
    }

    prevBtn.addEventListener("click", function () {
        if (currentIndex > 0) {
            currentIndex--;
            updateCarousel();
        }
    });

    nextBtn.addEventListener("click", function () {
        if (currentIndex < totalCards - 1) {
            currentIndex++;
            updateCarousel();
        }
    });

    // Show the first card initially
    updateCarousel();
});
