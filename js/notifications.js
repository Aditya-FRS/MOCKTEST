/* ============================================
   Notifications - Email Display, Browser Notifs
   Server creates notifications; Socket.IO delivers.
   These functions handle display-only modals.
   ============================================ */

function sendNotification(exam) {
    // Server handles notification creation via API + Socket.IO
    // This is kept for backward compat but is now a no-op for server-backed mode
    updateNotificationBadge();
}

function sendBrowserNotification(exam) {
    const examiner = state.users.find(u => u.username === exam.examiner);
    if (!('Notification' in window)) return;
    const show = () => {
        new Notification(`Exam Scheduled: ${exam.title}`, {
            body: `Assigned by ${examiner ? examiner.name : exam.examiner}. Duration: ${exam.duration} min.`
        });
    };
    if (Notification.permission === 'granted') show();
    else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => { if (p === 'granted') show(); });
    }
}

function sendTeacherNotification(exam, action) {
    // Server sends teacher notifications via Socket.IO on exam start/submit
    // This is kept as no-op for backward compat
}

// ─── Email Display (Exam Scheduled) ───
function showEmailNotification(exam) {
    const student = state.users.find(u => u.username === exam.student);
    const examiner = state.users.find(u => u.username === exam.examiner);
    if (!student || !examiner) return;
    const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0);

    const examDate = exam.fromDateTime ? new Date(exam.fromDateTime) : new Date(exam.date + 'T' + exam.time);
    const fmtDate = examDate.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const fmtTime = examDate.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });

    document.getElementById('emailContent').innerHTML = `
        <div style="background:var(--color-bg-2);padding:16px;border-radius:8px;margin-bottom:16px;border:2px solid var(--color-warning);">
            <strong style="color:var(--color-warning);">\u{1F4E7} Email Display (Demo Mode)</strong><br>
            <span style="font-size:13px;color:var(--color-text-secondary);">This shows what the email would look like. No actual email is sent.</span>
        </div>
        <div class="email-header-info">
            <div class="email-field"><strong>FROM:</strong> ${examiner.personalEmail || examiner.email}</div>
            <div class="email-field"><strong>TO:</strong> ${student.personalEmail || student.email}</div>
            <div class="email-field"><strong>SUBJECT:</strong> \u{1F3AF} EXAM SCHEDULED: ${escapeHtml(exam.title)}</div>
        </div>
        <p>Dear ${escapeHtml(student.name)},</p>
        <p>Your instructor <strong>${escapeHtml(examiner.name)}</strong> has scheduled an exam for you.</p>
        <hr class="email-divider">
        <div class="email-section-title">\u{1F4CB} EXAM DETAILS</div><hr class="email-divider">
        <div class="email-field"><strong>Exam Title:</strong> ${escapeHtml(exam.title)}</div>
        <div class="email-field"><strong>Scheduled By:</strong> ${escapeHtml(examiner.name)}</div>
        <div class="email-field"><strong>Date:</strong> ${fmtDate}</div>
        <div class="email-field"><strong>Time:</strong> ${fmtTime}</div>
        <div class="email-field"><strong>Duration:</strong> ${exam.duration} minutes</div>
        <div class="email-field"><strong>Total Marks:</strong> ${totalMarks}</div>
        <div class="email-field"><strong>Questions:</strong> ${exam.questions.length}</div>
        <hr class="email-divider">
        <div class="email-section-title">\u{1F4DD} DESCRIPTION</div><hr class="email-divider">
        <p>${escapeHtml(exam.description)}</p>
        <hr class="email-divider">
        <div class="email-section-title">\u23F0 IMPORTANT REMINDERS</div><hr class="email-divider">
        <ul>
            <li>Complete within the time limit</li>
            <li>Ensure stable internet connection</li>
            <li>Do not refresh the page during exam</li>
            <li>Exam auto-submits at the end of time</li>
            <li>Exiting fullscreen auto-submits the exam</li>
        </ul>
        <div style="text-align:center;margin-top:20px;"><a href="#" class="email-button">TAKE EXAM NOW</a></div>
        <p style="margin-top:20px;"><strong>Login:</strong> https://mocktest.example.com</p>
        <p><strong>Username:</strong> ${student.username}</p>
        <p style="margin-top:20px;"><strong>Best Regards,</strong><br>Mock Test Platform Team</p>`;

    document.getElementById('emailModal').classList.add('active');
}

// ─── To-Do Email Notification ───
function sendTodoEmailNotification(todo) {
    const createdBy = todo.createdBy || todo.created_by;
    const assignedTo = todo.assignedTo || todo.assigned_to || [];
    const creator = state.users.find(u => u.username === createdBy);
    if (!creator) return;
    const todoDate = new Date(todo.date + 'T' + (todo.time || '09:00'));
    const fmtDate = todoDate.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const assignedNames = assignedTo.map(u => { const usr = state.users.find(x => x.username === u); return usr ? usr.name : u; }).join(' & ');

    let toEmails = [];
    if (assignedTo.length === 1 && assignedTo[0] === creator.username) {
        toEmails = [creator.personalEmail || creator.email];
    } else {
        toEmails = assignedTo.map(u => { const usr = state.users.find(x => x.username === u); return usr ? (usr.personalEmail || usr.email) : ''; }).filter(Boolean);
    }

    document.getElementById('emailContent').innerHTML = `
        <div style="background:var(--color-bg-2);padding:16px;border-radius:8px;margin-bottom:16px;border:2px solid var(--color-warning);">
            <strong style="color:var(--color-warning);">\u{1F4E7} Email Display (Demo Mode)</strong><br>
            <span style="font-size:13px;color:var(--color-text-secondary);">No actual email is sent.</span>
        </div>
        <div class="email-header-info">
            <div class="email-field"><strong>FROM:</strong> ${creator.personalEmail || creator.email}</div>
            <div class="email-field"><strong>TO:</strong> ${toEmails.join(', ')}</div>
            <div class="email-field"><strong>SUBJECT:</strong> \u{1F4CB} NEW TO-DO: ${escapeHtml(todo.title)}</div>
        </div>
        <hr class="email-divider">
        <div class="email-section-title">\u{1F4DD} TO-DO DETAILS</div><hr class="email-divider">
        <div class="email-field"><strong>Title:</strong> ${escapeHtml(todo.title)}</div>
        ${todo.description ? `<div class="email-field"><strong>Description:</strong> ${escapeHtml(todo.description)}</div>` : ''}
        <div class="email-field"><strong>Date:</strong> ${fmtDate}</div>
        <div class="email-field"><strong>Time:</strong> ${todoDate.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}</div>
        ${todo.category ? `<div class="email-field"><strong>Category:</strong> ${todo.category}</div>` : ''}
        <div class="email-field"><strong>Created By:</strong> ${escapeHtml(creator.name)}</div>
        <div class="email-field"><strong>Assigned To:</strong> ${assignedNames}</div>
        <hr class="email-divider">
        <p style="margin-top:20px;"><strong>Best Regards,</strong><br>Mock Test Platform Team</p>`;

    document.getElementById('emailModal').classList.add('active');
}

function sendTodoCompletionEmail(todo) {
    const completedByUser = state.currentUser;
    const completedBy = todo.completedBy || todo.completed_by || [];
    const completedNames = completedBy.map(u => { const usr = state.users.find(x => x.username === u); return usr ? usr.name : u; }).join(', ');

    document.getElementById('emailContent').innerHTML = `
        <div style="background:var(--color-bg-2);padding:16px;border-radius:8px;margin-bottom:16px;border:2px solid var(--color-warning);">
            <strong style="color:var(--color-warning);">\u{1F4E7} Email Display (Demo Mode)</strong>
        </div>
        <div class="email-header-info">
            <div class="email-field"><strong>FROM:</strong> ${completedByUser.personalEmail || completedByUser.email}</div>
            <div class="email-field"><strong>TO:</strong> ${completedByUser.personalEmail || completedByUser.email}</div>
            <div class="email-field"><strong>SUBJECT:</strong> \u2705 TO-DO COMPLETED: ${escapeHtml(todo.title)}</div>
        </div>
        <hr class="email-divider">
        <div style="background:var(--color-bg-3);padding:16px;border-radius:8px;border:2px solid var(--color-success);text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">\u2705</div>
            <div style="font-size:20px;font-weight:bold;color:var(--color-success);margin-bottom:8px;">COMPLETED</div>
            <div class="email-field"><strong>Completed By:</strong> ${completedNames || completedByUser.name}</div>
            <div class="email-field"><strong>Completed At:</strong> ${new Date().toLocaleString()}</div>
        </div>
        <p style="margin-top:20px;"><strong>Best Regards,</strong><br>Mock Test Platform Team</p>`;

    document.getElementById('emailModal').classList.add('active');
}
