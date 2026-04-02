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

    // Seed all user profiles into Firestore (so student dropdown works)
    seedAllUserProfiles();

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
    document.getElementById('settingsBtn').addEventListener('click', showSettingsMenu);
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
        ? state.notifications.map(n => {
            const timeStr = n.timestamp ? formatNotificationTime(n.timestamp) : '';
            return `\u2022 ${n.title}\n  ${n.body}${timeStr ? '\n  \u{1F552} ' + timeStr : ''}`;
        }).join('\n\n')
        : 'No new notifications';
    alert('\u{1F4E7} Notifications:\n\n' + msg);
}

// Format notification timestamp as relative or absolute time
function formatNotificationTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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

// ─── Settings Menu ───
function showSettingsMenu() {
    const html = `
        <div style="padding:24px;">
            <h3 style="margin-bottom:20px;">\u2699\uFE0F Settings</h3>

            <!-- GitHub Image Config -->
            <div style="background:var(--color-bg-2);padding:16px;border-radius:12px;margin-bottom:16px;border:1px solid var(--color-card-border);">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                    <span style="font-size:24px;">\u{1F4F7}</span>
                    <div>
                        <div style="font-weight:600;">GitHub Image Storage</div>
                        <div style="font-size:13px;color:var(--color-text-secondary);">Store exam images on GitHub instead of Firestore</div>
                    </div>
                </div>
                <div style="margin-top:8px;font-size:13px;color:${isGitHubConfigured() ? 'var(--color-success)' : 'var(--color-warning)'};">
                    ${isGitHubConfigured() ? '\u2705 Configured — images go to GitHub' : '\u26A0\uFE0F Not configured — images stored as base64 in Firestore'}
                </div>
                <button class="btn btn-primary" style="width:auto;margin-top:12px;" onclick="closeDynamicModal();showGitHubConfigModal();">
                    ${isGitHubConfigured() ? 'Edit GitHub Config' : 'Setup GitHub Config'}
                </button>
            </div>

            <!-- Delete All Data -->
            <div style="background:var(--color-bg-2);padding:16px;border-radius:12px;margin-bottom:16px;border:1px solid var(--color-error);">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                    <span style="font-size:24px;">\u{1F5D1}\uFE0F</span>
                    <div>
                        <div style="font-weight:600;color:var(--color-error);">Delete All Data</div>
                        <div style="font-size:13px;color:var(--color-text-secondary);">Remove all exams, results, todos, notifications from Firestore</div>
                    </div>
                </div>
                <button class="btn btn-outline" style="width:auto;margin-top:12px;color:var(--color-error);border-color:var(--color-error);" onclick="confirmDeleteAllData()">
                    \u{1F5D1}\uFE0F Delete All Data
                </button>
            </div>

            <!-- Close -->
            <div style="text-align:right;margin-top:20px;">
                <button class="btn btn-secondary" onclick="closeDynamicModal()">Close</button>
            </div>
        </div>`;
    showDynamicModal(html);
}

function confirmDeleteAllData() {
    const html = `
        <div style="padding:32px;text-align:center;">
            <div style="font-size:64px;margin-bottom:16px;">\u26A0\uFE0F</div>
            <h2 style="color:var(--color-error);margin-bottom:16px;">Delete All Data?</h2>
            <p style="margin-bottom:8px;">This will permanently delete:</p>
            <ul style="text-align:left;max-width:300px;margin:0 auto 24px;list-style:none;padding:0;">
                <li style="padding:6px 0;">\u274C All exams & results</li>
                <li style="padding:6px 0;">\u274C All exam answers & behavioral metrics</li>
                <li style="padding:6px 0;">\u274C All todos</li>
                <li style="padding:6px 0;">\u274C All notifications</li>
            </ul>
            <p style="color:var(--color-error);font-weight:bold;margin-bottom:24px;">This cannot be undone!</p>
            <div style="display:flex;gap:12px;justify-content:center;">
                <button class="btn btn-secondary" onclick="closeDynamicModal()">Cancel</button>
                <button class="btn btn-primary" style="background:var(--color-error);width:auto;" onclick="deleteAllData()">Yes, Delete Everything</button>
            </div>
        </div>`;
    showDynamicModal(html);
}

async function deleteAllData() {
    const collections = ['exams', 'exam_results', 'exam_answers', 'behavioral_metrics', 'todos', 'notifications'];
    let totalDeleted = 0;

    try {
        showDynamicModal('<div style="padding:32px;text-align:center;"><div style="font-size:48px;margin-bottom:16px;">\u23F3</div><h3>Deleting all data...</h3><p id="deleteProgress">Starting...</p></div>');

        for (const col of collections) {
            const progress = document.getElementById('deleteProgress');
            if (progress) progress.textContent = 'Deleting ' + col + '...';

            const snap = await db.collection(col).get();
            const batch = db.batch();
            let count = 0;

            snap.docs.forEach(doc => {
                batch.delete(doc.ref);
                count++;
            });

            if (count > 0) {
                await batch.commit();
                totalDeleted += count;
            }
        }

        // Clear local state
        state.exams = [];
        state.notifications = [];
        state.todos = [];
        state._loaded = false;

        closeDynamicModal();
        showNotificationPopup('\u2705 Data Deleted', totalDeleted + ' records deleted from Firestore');
        loadDashboard();

    } catch (e) {
        closeDynamicModal();
        showNotificationPopup('\u274C Error', 'Failed to delete data: ' + e.message);
    }
}

// Seed all hardcoded user profiles into Firestore
// so they appear in student/teacher dropdowns
async function seedAllUserProfiles() {
    try {
        await Promise.all(
            Object.values(USERS).map(u => api.ensureUserProfile(u))
        );
    } catch (e) {
        console.warn('Failed to seed user profiles:', e);
    }
}
