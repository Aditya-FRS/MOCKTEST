/* ============================================
   Authentication - Firebase Auth
   Uses email/password with Firestore user profiles
   ============================================ */

// Map usernames to emails for Firebase Auth
const USER_EMAIL_MAP = {
    'doraemon': 'doraemon@example.com',
    'nobitha': 'nobitha@example.com'
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

    const email = USER_EMAIL_MAP[username] || username + '@example.com';

    // Try login first
    try {
        const user = await api.login(email, password);
        state.currentUser = user;
        await loadStateFromServer();
        await loadGitHubConfig();
        errorMsg.classList.remove('show');
        showMainApp();
        return;
    } catch (e) {
        console.log('Login attempt failed:', e.code, e.message);
    }

    // Login failed — try to auto-create the user (first-time setup)
    try {
        await createFirebaseUser(username, email, password);
        const user = await api.login(email, password);
        state.currentUser = user;
        await loadStateFromServer();
        await loadGitHubConfig();
        errorMsg.classList.remove('show');
        showMainApp();
    } catch (createErr) {
        console.error('Auto-create failed:', createErr.code, createErr.message);
        // If user already exists but wrong password, show error
        errorMsg.classList.add('show');
    }
}

// Create user in Firebase Auth + Firestore profile (first-time setup)
async function createFirebaseUser(username, email, password) {
    const profiles = {
        'doraemon': { name: 'Doraemon', personalEmail: 'doraemon.personal@gmail.com', role: 'teacher', avatar: '\u{1F916}' },
        'nobitha': { name: 'Nobitha Nobi', personalEmail: 'nobitha.personal@gmail.com', role: 'student', avatar: '\u{1F466}' }
    };

    const profile = profiles[username] || { name: username, personalEmail: email, role: 'student', avatar: '\u{1F464}' };

    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection('users').doc(cred.user.uid).set({
        username,
        email,
        name: profile.name,
        personalEmail: profile.personalEmail,
        role: profile.role,
        avatar: profile.avatar,
        createdAt: new Date().toISOString()
    });
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

async function handleLogout() {
    api.clearListeners();
    try { await api.logout(); } catch (e) {}
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
