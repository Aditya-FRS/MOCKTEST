/* ============================================
   Authentication - Simple local credentials
   Firestore used only for data, NOT for auth
   ============================================ */

const USERS = {
    'doraemon': {
        username: 'doraemon',
        password: 'nobitha456',
        name: 'Doraemon',
        email: 'doraemon@example.com',
        personalEmail: 'doraemon.personal@gmail.com',
        role: 'teacher',
        avatar: '\u{1F916}'
    },
    'nobitha': {
        username: 'nobitha',
        password: 'doraemon123',
        name: 'Nobitha Nobi',
        email: 'nobitha@example.com',
        personalEmail: 'nobitha.personal@gmail.com',
        role: 'student',
        avatar: '\u{1F466}'
    }
};

function setupLoginHandlers() {
    const userCards = document.querySelectorAll('.user-card');
    const usernameInput = document.getElementById('username');
    const loginForm = document.getElementById('loginForm');

    userCards.forEach(card => {
        card.addEventListener('click', () => {
            userCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            usernameInput.value = card.dataset.user;
        });
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
    });
}

async function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('loginError');

    if (!username || !password) {
        errorMsg.classList.add('show');
        return;
    }

    const user = USERS[username];
    if (!user || user.password !== password) {
        errorMsg.classList.add('show');
        return;
    }

    // Set current user instantly (no server call)
    state.currentUser = {
        username: user.username,
        name: user.name,
        email: user.email,
        personalEmail: user.personalEmail,
        role: user.role,
        avatar: user.avatar
    };

    // Populate state.users with all known users
    state.users = Object.values(USERS).map(u => ({
        username: u.username,
        name: u.name,
        email: u.email,
        personalEmail: u.personalEmail,
        role: u.role,
        avatar: u.avatar
    }));

    // Save login to sessionStorage for page reload
    sessionStorage.setItem('mocktest_user', username);

    errorMsg.classList.remove('show');
    showMainApp();

    // Load cloud data in background (non-blocking)
    loadStateFromServer();
    loadGitHubConfig();
}

function showMainApp() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    updateHeader();
    loadDashboard();
}

function setupHeaderHandlers() {
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('notificationsBtn').addEventListener('click', showNotificationsAlert);
}

function updateHeader() {
    const user = state.currentUser;
    document.getElementById('headerAvatar').textContent = user.avatar;
    document.getElementById('headerUserName').textContent = user.name;
    document.getElementById('headerUserRole').textContent = user.role;
}

function handleLogout() {
    api.clearListeners();
    sessionStorage.removeItem('mocktest_user');
    state.currentUser = null;
    state.currentExam = null;
    state.exams = [];
    state.notifications = [];
    state.todos = [];
    state._loaded = false;
    if (state.examTimer) clearInterval(state.examTimer);
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('password').value = '';
    document.getElementById('username').value = '';
    document.querySelectorAll('.user-card').forEach(c => c.classList.remove('selected'));
    showView('dashboard');
}

function showNotificationsAlert() {
    const msg = state.notifications.length > 0
        ? state.notifications.map(n => `\u2022 ${n.title}\n  ${n.body}`).join('\n\n')
        : 'No new notifications';
    alert('\u{1F4E7} Notifications:\n\n' + msg);
}

// Restore session on page reload
function restoreSession() {
    const saved = sessionStorage.getItem('mocktest_user');
    if (saved && USERS[saved]) {
        const user = USERS[saved];
        state.currentUser = {
            username: user.username,
            name: user.name,
            email: user.email,
            personalEmail: user.personalEmail,
            role: user.role,
            avatar: user.avatar
        };
        state.users = Object.values(USERS).map(u => ({
            username: u.username,
            name: u.name,
            email: u.email,
            personalEmail: u.personalEmail,
            role: u.role,
            avatar: u.avatar
        }));
        return true;
    }
    return false;
}
