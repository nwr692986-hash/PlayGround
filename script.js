let clickCount = 0;
const button = document.getElementById('clickMe');
const counter = document.getElementById('counter');

button.addEventListener('click', () => {
    clickCount++;
    counter.textContent = `Clicks: ${clickCount}`;
    
    // Add a fun animation
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = '';
    }, 100);
});

// Add keyboard support
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        button.click();
    }
});

console.log('PlayGround loaded successfully!');