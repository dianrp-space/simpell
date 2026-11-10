/**
 * Auth Page Image Carousel
 * Cycles through a list of images with a smooth fade effect.
 * Now includes Z-Index management to prevent stacking issues.
 */

document.addEventListener('DOMContentLoaded', () => {
    const carousel = document.getElementById('authCarousel');
    if (!carousel) {
        console.error("Auth Carousel element not found!");
        return;
    }

    // Use children to get all slide elements (both img and div)
    const slides = Array.from(carousel.children);
    console.log(`Found ${slides.length} slides for carousel.`);

    if (slides.length === 0) return;

    let currentIndex = 0;
    const intervalTime = 4000; // 4 seconds

    // Initialize: Hide all except first
    slides.forEach((slide, index) => {
        // Ensure transition property is set
        slide.style.transition = 'opacity 1s ease-in-out';

        if (index === 0) {
            slide.classList.remove('opacity-0');
            slide.classList.add('opacity-100');
            slide.style.zIndex = '10'; // Force top
        } else {
            slide.classList.remove('opacity-100');
            slide.classList.add('opacity-0');
            slide.style.zIndex = '0'; // Force bottom
        }
    });

    setInterval(() => {
        const currentSlide = slides[currentIndex];

        // Move to next index
        currentIndex = (currentIndex + 1) % slides.length;
        const nextSlide = slides[currentIndex];

        console.log("Switching to slide index:", currentIndex);

        // Fade Out Current
        currentSlide.classList.remove('opacity-100');
        currentSlide.classList.add('opacity-0');
        currentSlide.style.zIndex = '0';

        // Fade In Next
        nextSlide.classList.remove('opacity-0');
        nextSlide.classList.add('opacity-100');
        nextSlide.style.zIndex = '10';

    }, intervalTime);
});
