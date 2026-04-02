/* ============================================
   Application State Management
   Firebase-backed with in-memory cache
   ============================================ */

const state = {
    currentUser: null,
    users: [],
    exams: [],
    notifications: [],
    todos: [],
    currentCalendarDate: new Date(),
    currentExam: null,
    examTimer: null,
    examStartTime: null,
    examMetrics: {
        tabSwitches: [],
        copyAttempts: 0,
        pasteAttempts: 0,
        fullscreenToggles: 0,
        idleTime: 0,
        lastActivityTime: null,
        questionStartTimes: {},
        isTabActive: true
    },
    idleTimer: null,
    activityTimer: null,
    _loaded: false
};

// Load all state from Firestore
async function loadStateFromServer() {
    try {
        const username = state.currentUser.username;
        const [users, exams, notifications, todos] = await Promise.all([
            api.getAllUsers(),
            api.getExams(username),
            api.getNotifications(username),
            api.getTodos(username)
        ]);
        state.users = users;
        state.exams = exams;
        state.notifications = notifications;
        state.todos = todos;
        state._loaded = true;
        updateNotificationBadge();

        // Setup real-time listeners for live sync
        api.setupRealtimeListeners(username);
    } catch (e) {
        console.warn('Failed to load state from Firestore:', e);
    }
}

// Backward compat - no-ops
function saveState() {}
function loadState() {}
function clearSavedState() {}
