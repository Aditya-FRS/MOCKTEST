/* ============================================
   Calendar & To-Do CRUD (API-backed)
   ============================================ */

function setupCalendarHandlers() {
    document.getElementById('calPrevBtn').addEventListener('click', () => navigateMonth(-1));
    document.getElementById('calTodayBtn').addEventListener('click', goToToday);
    document.getElementById('calNextBtn').addEventListener('click', () => navigateMonth(1));
}

function loadCalendarTab() {
    if (!state.currentCalendarDate) state.currentCalendarDate = new Date();
    renderCalendar(state.currentCalendarDate);
}

function navigateMonth(direction) {
    state.currentCalendarDate = new Date(state.currentCalendarDate.getFullYear(), state.currentCalendarDate.getMonth() + direction, 1);
    renderCalendar(state.currentCalendarDate);
}

function goToToday() {
    state.currentCalendarDate = new Date();
    renderCalendar(state.currentCalendarDate);
}

function renderCalendar(date) {
    const year = date.getFullYear(), month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = firstDay.getDay();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const todayStr = new Date().toISOString().split('T')[0];

    let html = `
        <div style="background:var(--color-surface);border:1px solid var(--color-card-border);border-radius:12px;padding:20px;margin-bottom:24px;">
            <h3 style="text-align:center;margin-bottom:20px;font-size:24px;">${monthNames[month]} ${year}</h3>
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;text-align:center;">`;

    dayNames.forEach(d => { html += `<div style="font-weight:bold;padding:10px;color:var(--color-text-secondary);">${d}</div>`; });
    for (let i = 0; i < startDay; i++) html += '<div style="padding:20px;"></div>';

    for (let day = 1; day <= daysInMonth; day++) {
        const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const isToday = ds === todayStr;
        const hasExams = state.exams.some(e => (e.fromDateTime && e.fromDateTime.startsWith(ds)) || e.date === ds);
        const todoCount = state.todos.filter(t => {
            const tDate = t.date;
            const assigned = t.assignedTo || t.assigned_to || [];
            const created = t.createdBy || t.created_by;
            return tDate === ds && !t.is_deleted &&
                (assigned.includes(state.currentUser.username) || created === state.currentUser.username);
        }).length;

        html += `
            <div onclick="showDayView('${ds}')" style="padding:20px;background:${isToday?'var(--color-bg-1)':'var(--color-surface)'};border:2px solid ${isToday?'var(--color-primary)':hasExams?'var(--color-success)':'var(--color-card-border)'};border-radius:8px;cursor:pointer;transition:all 0.2s;position:relative;"
                 onmouseover="this.style.background='var(--color-bg-1)';this.style.transform='translateY(-2px)'"
                 onmouseout="this.style.background='${isToday?'var(--color-bg-1)':'var(--color-surface)'}';this.style.transform='translateY(0)'">
                <div style="font-weight:${isToday?'bold':'normal'};font-size:16px;">${day}</div>
                ${hasExams ? '<div style="font-size:20px;margin-top:4px;">\u{1F4DA}</div>' : ''}
                ${todoCount > 0 ? `<div style="position:absolute;top:4px;right:4px;background:var(--color-primary);color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;">${todoCount}</div>` : ''}
            </div>`;
    }

    html += '</div></div>';
    document.getElementById('calendarView').innerHTML = html;
}

// ─── Day View ───
function showDayView(dateString) {
    const [y, m, d] = dateString.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

    const dayExams = state.exams.filter(e => (e.fromDateTime && e.fromDateTime.startsWith(dateString)) || e.date === dateString);
    const dayTodos = state.todos.filter(t => {
        const tDate = t.date;
        const assigned = t.assignedTo || t.assigned_to || [];
        const created = t.createdBy || t.created_by;
        return tDate === dateString && !t.is_deleted &&
            (assigned.includes(state.currentUser.username) || created === state.currentUser.username);
    });

    let html = `
        <div style="background:var(--color-surface);border:1px solid var(--color-card-border);border-radius:12px;padding:24px;margin-bottom:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
                <h3 style="font-size:20px;">${dayName}</h3>
                <button class="btn btn-secondary" onclick="loadCalendarTab()">\u2190 Back to Calendar</button>
            </div>`;

    // Exams
    if (dayExams.length > 0) {
        html += '<div style="margin-bottom:24px;"><h4 style="font-size:16px;margin-bottom:12px;">\u{1F4DA} EXAMS</h4>';
        dayExams.forEach(exam => {
            const statusBadge = exam.result ? '\u2705 Completed' : exam.status === 'in_progress' ? '\u{1F535} In Progress' : '\u{1F7E1} Pending';
            const ft = exam.fromDateTime ? new Date(exam.fromDateTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '';
            const tt = exam.toDateTime ? new Date(exam.toDateTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '';
            html += `
                <div style="background:var(--color-bg-1);padding:16px;border-radius:8px;margin-bottom:12px;border:1px solid var(--color-card-border);">
                    <div style="font-weight:600;margin-bottom:8px;">${escapeHtml(exam.title)}</div>
                    ${ft ? `<div style="font-size:14px;color:var(--color-text-secondary);margin-bottom:4px;">Time: ${ft} - ${tt}</div>` : ''}
                    <div style="font-size:14px;margin-bottom:8px;">Status: ${statusBadge}</div>
                    ${exam.result ? `<div style="font-size:14px;">Score: <strong>${exam.result.score}/${exam.result.totalMarks}</strong></div>` : ''}
                    <button class="btn btn-primary" style="margin-top:8px;font-size:13px;padding:6px 12px;width:auto;" onclick="showMetricsModal('${exam.id}')">View Details</button>
                </div>`;
        });
        html += '</div>';
    }

    // To-dos
    html += '<div><h4 style="font-size:16px;margin-bottom:12px;">\u{1F4CB} TO-DO LIST</h4>';
    if (dayTodos.length > 0) {
        dayTodos.forEach(todo => {
            const completedBy = todo.completedBy || todo.completed_by || [];
            const isCompleted = completedBy.includes(state.currentUser.username);
            const createdBy = todo.createdBy || todo.created_by;
            const creator = state.users.find(u => u.username === createdBy);
            html += `
                <div style="background:var(--color-bg-2);padding:16px;border-radius:8px;margin-bottom:12px;border:1px solid var(--color-card-border);${isCompleted?'opacity:0.7;':''}">
                    <div style="display:flex;align-items:start;gap:12px;">
                        <input type="checkbox" ${isCompleted?'checked':''} onchange="toggleTodoComplete('${todo.id}')" style="width:20px;height:20px;margin-top:2px;cursor:pointer;">
                        <div style="flex:1;">
                            <div style="font-weight:600;margin-bottom:4px;${isCompleted?'text-decoration:line-through;':''}">${escapeHtml(todo.title)}</div>
                            ${todo.description ? `<div style="font-size:13px;color:var(--color-text-secondary);margin-bottom:4px;">${escapeHtml(todo.description)}</div>` : ''}
                            <div style="font-size:13px;color:var(--color-text-secondary);">\u23F0 ${todo.time}</div>
                            <div style="font-size:12px;color:var(--color-text-secondary);">Created by: ${creator ? escapeHtml(creator.name) : createdBy}</div>
                            ${completedBy.length > 0 ? `<div style="font-size:12px;color:var(--color-success);margin-top:8px;">\u2713 Completed by: ${completedBy.map(u => { const usr = state.users.find(x => x.username === u); return usr ? usr.name.split(' ')[0] : u; }).join(', ')}</div>` : ''}
                        </div>
                        <button class="btn btn-outline" onclick="confirmDeleteTodo('${todo.id}')" style="font-size:13px;padding:6px 12px;color:var(--color-error);border-color:var(--color-error);">\u{1F5D1}\u{FE0F}</button>
                    </div>
                </div>`;
        });
    }
    html += `<button class="btn btn-primary" onclick="showAddTodoModal('${dateString}')" style="width:100%;margin-top:12px;">+ Add To-Do</button></div></div>`;
    document.getElementById('calendarView').innerHTML = html;
}

// ─── To-Do CRUD (API-backed) ───
function showAddTodoModal(dateString) {
    const [y, m, d] = dateString.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const formatted = dateObj.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    const otherUser = state.users.find(u => u.username !== state.currentUser.username);

    showDynamicModal(`
        <div class="modal-header">
            <h2 class="modal-title">Create To-Do for ${formatted}</h2>
            <button class="modal-close" onclick="closeDynamicModal()">\u00D7</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label class="form-label">To-Do Title <span class="required-asterisk">*</span></label>
                <input type="text" class="form-input" id="todoTitle" placeholder="Enter title">
            </div>
            <div class="form-group">
                <label class="form-label">Description (Optional)</label>
                <textarea class="form-textarea" id="todoDescription" rows="3" placeholder="Enter description"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Time <span class="required-asterisk">*</span></label>
                <input type="time" class="form-input" id="todoTime" value="09:00">
            </div>
            <div class="form-group">
                <label class="form-label">Category (Optional)</label>
                <select class="form-select" id="todoCategory">
                    <option value="">Select category</option>
                    <option value="Study">Study</option>
                    <option value="Exercise">Exercise</option>
                    <option value="Exam">Exam</option>
                    <option value="Reading">Reading</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Assign To</label>
                <select class="form-select" id="todoAssignTo">
                    <option value="just_me">Just Me</option>
                    ${otherUser ? `<option value="${otherUser.username}">${escapeHtml(otherUser.name)}</option>` : ''}
                    <option value="both">Both Users</option>
                </select>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeDynamicModal()">Cancel</button>
            <button class="btn btn-primary" style="width:auto;" onclick="createTodo('${dateString}')">Create To-Do</button>
        </div>`);
}

async function createTodo(dateString) {
    const title = document.getElementById('todoTitle').value.trim();
    const description = document.getElementById('todoDescription').value.trim();
    const time = document.getElementById('todoTime').value;
    const category = document.getElementById('todoCategory').value;
    const assignTo = document.getElementById('todoAssignTo').value;

    if (!title) { showNotificationPopup('\u274C Error', 'Please enter a title'); return; }
    if (!time) { showNotificationPopup('\u274C Error', 'Please select a time'); return; }

    let assignedTo = [];
    if (assignTo === 'just_me') assignedTo = [state.currentUser.username];
    else if (assignTo === 'both') assignedTo = state.users.map(u => u.username);
    else assignedTo = [assignTo];

    try {
        const todo = await api.createTodo({
            title, description, date: dateString, time, assignedTo, category,
            createdBy: state.currentUser.username
        });
        state.todos.push(todo);
        closeDynamicModal();
        sendTodoEmailNotification(todo);
        showDayView(dateString);
        showNotificationPopup('\u2705 Success', 'To-do created successfully!');
    } catch (e) {
        showNotificationPopup('\u274C Error', 'Failed to create todo: ' + e.message);
    }
}

async function toggleTodoComplete(todoId) {
    const todo = state.todos.find(t => t.id === todoId);
    if (!todo) return;

    try {
        const prevCompleted = (todo.completedBy || []).slice();
        const newCompletedBy = await api.toggleTodo(todoId, state.currentUser.username);
        todo.completedBy = newCompletedBy;
        // Send completion email if newly completed
        if (newCompletedBy.includes(state.currentUser.username) && !prevCompleted.includes(state.currentUser.username)) {
            sendTodoCompletionEmail(todo);
        }
        showDayView(todo.date);
    } catch (e) {
        showNotificationPopup('\u274C Error', 'Failed to update todo');
    }
}

function confirmDeleteTodo(todoId) {
    const todo = state.todos.find(t => t.id === todoId);
    if (!todo) return;
    const createdBy = todo.createdBy || todo.created_by;
    const creator = state.users.find(u => u.username === createdBy);

    showDynamicModal(`
        <div style="padding:32px;text-align:center;">
            <div style="font-size:64px;margin-bottom:20px;">\u{1F5D1}\u{FE0F}</div>
            <h2 style="color:var(--color-error);margin-bottom:16px;">Delete To-Do?</h2>
            <div style="background:var(--color-bg-2);padding:20px;border-radius:12px;margin:24px 0;text-align:left;">
                <p style="margin-bottom:8px;"><strong>Title:</strong> ${escapeHtml(todo.title)}</p>
                ${todo.description ? `<p style="margin-bottom:8px;"><strong>Description:</strong> ${escapeHtml(todo.description)}</p>` : ''}
                <p style="margin-bottom:8px;"><strong>Date:</strong> ${todo.date}</p>
                <p><strong>Created By:</strong> ${creator ? escapeHtml(creator.name) : createdBy}</p>
            </div>
            <p style="color:var(--color-error);font-weight:bold;margin-bottom:24px;">This action cannot be undone!</p>
            <div style="display:flex;gap:12px;justify-content:center;">
                <button class="btn btn-outline" onclick="closeDynamicModal()">Cancel</button>
                <button class="btn btn-primary" style="background:var(--color-error);width:auto;" onclick="deleteTodo('${todoId}')">Delete</button>
            </div>
        </div>`);
}

async function deleteTodo(todoId) {
    const todo = state.todos.find(t => t.id === todoId);
    if (!todo) return;
    const dateToRefresh = todo.date;

    try {
        await api.deleteTodo(todoId);
        state.todos = state.todos.filter(t => t.id !== todoId);
    } catch (e) {
        todo.isDeleted = true;
        state.todos = state.todos.filter(t => t.id !== todoId);
    }

    closeDynamicModal();
    showDayView(dateToRefresh);
    showNotificationPopup('\u2705 Deleted', 'The to-do has been deleted.');
}
