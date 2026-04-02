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

// Load all state from Firestore (each query independent - one failing won't block others)
async function loadStateFromServer() {
    const username = state.currentUser.username;

    // Load each independently so one failure doesn't block others
    const [users, exams, notifications, todos] = await Promise.all([
        api.getAllUsers().catch(e => { console.warn('Failed to load users:', e); return []; }),
        api.getExams(username).catch(e => { console.warn('Failed to load exams:', e); return []; }),
        api.getNotifications(username).catch(e => { console.warn('Failed to load notifications:', e); return []; }),
        api.getTodos(username).catch(e => { console.warn('Failed to load todos:', e); return []; })
    ]);

    // Merge Firestore users with hardcoded ones, dedup by username
    const userMap = new Map();
    // Hardcoded users first (always present)
    if (typeof USERS !== 'undefined') {
        Object.values(USERS).forEach(u => userMap.set(u.username, {
            username: u.username, name: u.name, email: u.email,
            personalEmail: u.personalEmail, role: u.role, avatar: u.avatar
        }));
    }
    // Firestore users override (may have additional fields)
    users.forEach(u => {
        if (u.username) userMap.set(u.username, u);
    });
    state.users = Array.from(userMap.values());
    state.exams = exams;
    state.notifications = notifications;
    state.todos = todos;
    state._loaded = true;
    updateNotificationBadge();

    // Setup real-time listeners for live sync
    try {
        api.setupRealtimeListeners(username);
    } catch (e) {
        console.warn('Failed to setup real-time listeners:', e);
    }
}

// Backward compat - no-ops
function saveState() {}
function loadState() {}
function clearSavedState() {}
