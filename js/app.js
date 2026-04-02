/* ============================================
   App Initialization
   Local auth + Firestore for data
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // Check Firebase is configured
    if (!isFirebaseConfigured()) {
        document.getElementById('loginPage').querySelector('.login-header p').textContent =
            'Please configure Firebase first (see js/firebase-config.js)';
    }

    // Setup all handlers
    setupLoginHandlers();
    setupHeaderHandlers();
    setupDashboardHandlers();
    setupExamHandlers();
    setupModalHandlers();
    setupCalendarHandlers();

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // Restore session from sessionStorage (page reload)
    if (restoreSession()) {
        showMainApp();
        // Load cloud data in background (non-blocking)
        loadStateFromServer();
        loadGitHubConfig();
    }
});
