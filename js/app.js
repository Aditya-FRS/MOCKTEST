/* ============================================
   App Initialization - Firebase Edition
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

    // Listen for Firebase auth state changes (session restore)
    auth.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser && isFirebaseConfigured()) {
            try {
                const profile = await api.getUserProfile(firebaseUser.uid);
                if (profile) {
                    state.currentUser = profile;
                    await loadStateFromServer();
                    await loadGitHubConfig();
                    showMainApp();
                }
            } catch (e) {
                console.warn('Session restore failed:', e);
            }
        }
    });
});
