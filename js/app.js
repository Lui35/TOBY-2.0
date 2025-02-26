document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize themes
        await themes.init();

        // Initialize collections
        await collections.init();

        // Initialize tabs
        await tabs.init();

        // Set up auto-refresh of open tabs
        setInterval(tabs.loadOpenTabs, 5000);
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}); 