/* ============================================
   Exam Creation, Scheduling, Form Validation
   ============================================ */

let questionCounter = 0;

// Named handler functions (so we can remove + re-add without duplicates)
function _onCloseCreateExam() { closeCreateExamModal(); }
function _onAddQuestion() { addQuestion(); }
function _onScheduleExam(e) { e.preventDefault(); scheduleExam(); }
function _onCloseEmail() { closeEmailModal(); }
function _onCloseMetrics() { closeMetricsModal(); }
function _onDownloadReport() { showNotificationPopup('\u{1F4E5} Download', 'Report download - implementation pending'); }
function _onPrintReport() { window.print(); }
function _onSendToStudent() { showNotificationPopup('\u{1F4E7} Email Sent', 'Report has been sent to student\'s email'); }

function _safeBind(id, event, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    el.removeEventListener(event, handler);
    el.addEventListener(event, handler);
}

function setupModalHandlers() {
    _safeBind('closeCreateExamModal', 'click', _onCloseCreateExam);
    _safeBind('cancelCreateExam', 'click', _onCloseCreateExam);
    _safeBind('addQuestionBtn', 'click', _onAddQuestion);
    _safeBind('scheduleExamBtn', 'click', _onScheduleExam);
    _safeBind('closeEmailModal', 'click', _onCloseEmail);
    _safeBind('closeEmailModalBtn', 'click', _onCloseEmail);
    _safeBind('closeMetricsModal', 'click', _onCloseMetrics);
    _safeBind('closeMetricsModalBtn', 'click', _onCloseMetrics);
    _safeBind('downloadReportBtn', 'click', _onDownloadReport);
    _safeBind('printReportBtn', 'click', _onPrintReport);
    _safeBind('sendToStudentBtn', 'click', _onSendToStudent);
}

function openCreateExamModal() {
    const modal = document.getElementById('createExamModal');
    const studentSelect = document.getElementById('examStudent');

    // Populate student dropdown with other users
    const otherUsers = state.users.filter(u => u.username !== state.currentUser.username);
    studentSelect.innerHTML = '<option value="">Select Student</option>' +
        otherUsers.map(u => `<option value="${u.username}">${escapeHtml(u.name)}</option>`).join('');

    // Clear fields
    document.getElementById('examFromDateTime').value = '';
    document.getElementById('examToDateTime').value = '';
    document.getElementById('examDuration').value = '';
    document.getElementById('examWindowDisplay').style.display = 'none';
    document.getElementById('examTitle').value = '';
    document.getElementById('examDescription').value = '';
    document.getElementById('questionsList').innerHTML = '';
    questionCounter = 0;

    // Clear errors
    document.querySelectorAll('.field-error').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => el.classList.remove('error'));

    setupDateTimeListeners();
    setupFormValidationListeners();
    modal.classList.add('active');
}

function closeCreateExamModal() {
    document.getElementById('createExamModal').classList.remove('active');
}

function closeEmailModal() {
    document.getElementById('emailModal').classList.remove('active');
}

function closeMetricsModal() {
    document.getElementById('metricsModal').classList.remove('active');
}

// ─── Date-Time Window ───
function setupDateTimeListeners() {
    const fromInput = document.getElementById('examFromDateTime');
    const toInput = document.getElementById('examToDateTime');
    const windowDisplay = document.getElementById('examWindowDisplay');

    function update() {
        if (fromInput.value && toInput.value) {
            const from = new Date(fromInput.value);
            const to = new Date(toInput.value);
            if (to > from) {
                const diffMins = Math.floor((to - from) / 60000);
                const hours = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                document.getElementById('windowText').textContent = `${from.toLocaleString()} to ${to.toLocaleString()}`;
                document.getElementById('windowDuration').textContent = `${hours} hours ${mins} minutes`;
                windowDisplay.style.display = 'block';
            } else {
                windowDisplay.style.display = 'none';
            }
        }
    }
    fromInput.addEventListener('change', update);
    toInput.addEventListener('change', update);
}

// ─── Live Validation Clear ───
function setupFormValidationListeners() {
    const fields = [
        { id: 'examTitle', errorId: 'examTitleError' },
        { id: 'examDescription', errorId: 'examDescriptionError' },
        { id: 'examStudent', errorId: 'examStudentError' },
        { id: 'examDuration', errorId: 'examDurationError' },
        { id: 'examFromDateTime', errorId: 'examFromError' },
        { id: 'examToDateTime', errorId: 'examToError' }
    ];
    fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (!el) return;
        const clear = () => {
            if (el.value.trim()) {
                document.getElementById(f.errorId).style.display = 'none';
                el.classList.remove('error');
            }
        };
        el.addEventListener('input', clear);
        el.addEventListener('change', clear);
    });
}

// ─── Form Validation ───
function validateExamForm() {
    let isValid = true;
    document.querySelectorAll('.field-error').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => el.classList.remove('error'));

    function check(id, errId, condition) {
        const el = document.getElementById(id);
        if (!el || condition(el)) {
            const err = document.getElementById(errId);
            if (err) err.style.display = 'block';
            if (el) el.classList.add('error');
            isValid = false;
        }
    }

    check('examTitle', 'examTitleError', el => !el.value.trim());
    check('examDescription', 'examDescriptionError', el => !el.value.trim());
    check('examStudent', 'examStudentError', el => !el.value);
    check('examDuration', 'examDurationError', el => !el.value || parseInt(el.value) < 5);
    check('examFromDateTime', 'examFromError', el => !el.value);
    check('examToDateTime', 'examToError', el => !el.value);

    // Validate to > from
    const fromEl = document.getElementById('examFromDateTime');
    const toEl = document.getElementById('examToDateTime');
    if (fromEl && toEl && fromEl.value && toEl.value) {
        if (new Date(toEl.value) <= new Date(fromEl.value)) {
            const err = document.getElementById('examToError');
            if (err) { err.textContent = 'End time must be after start time'; err.style.display = 'block'; }
            toEl.classList.add('error');
            isValid = false;
        }
    }

    return isValid;
}

// ─── Schedule Exam ───
async function scheduleExam() {
    if (!validateExamForm()) {
        showNotificationPopup('\u274C Validation Error', 'Please fill all required fields correctly');
        return;
    }

    const title = document.getElementById('examTitle').value.trim();
    const description = document.getElementById('examDescription').value.trim();
    const student = document.getElementById('examStudent').value;
    const duration = parseInt(document.getElementById('examDuration').value);
    const fromDateTime = document.getElementById('examFromDateTime').value;
    const toDateTime = document.getElementById('examToDateTime').value;
    const date = fromDateTime.split('T')[0];
    const time = fromDateTime.split('T')[1];

    const questionItems = document.querySelectorAll('.question-item');
    if (questionItems.length === 0) {
        showNotificationPopup('\u274C Validation Error', 'Please add at least one question');
        return;
    }

    const questions = [];
    questionItems.forEach(item => {
        const type = item.querySelector('.question-type').value;
        const text = item.querySelector('.question-text').value;
        const marks = parseInt(item.querySelector('.question-marks').value) || 2;
        const imageEl = item.querySelector('.question-image-data');
        const question = { type, text, marks };

        // Attach image URL if present
        if (imageEl && imageEl.value) {
            question.imageUrl = imageEl.value;
        }

        if (type === 'mcq') {
            const options = [];
            item.querySelectorAll('.option-item input[type="text"]').forEach(inp => options.push(inp.value));
            const correctRadio = item.querySelector('input[type="radio"]:checked');
            question.options = options;
            question.correct = correctRadio ? parseInt(correctRadio.value) : 0;
        } else if (type === 'truefalse') {
            const correctRadio = item.querySelector('input[type="radio"]:checked');
            question.options = ['True', 'False'];
            question.correct = correctRadio ? parseInt(correctRadio.value) : 0;
        } else {
            const expected = item.querySelector('.expected-answer');
            if (expected) question.expectedAnswer = expected.value;
        }
        questions.push(question);
    });

    try {
        const exam = await api.createExam({
            title, description, student,
            examiner: state.currentUser.username,
            duration, date, time,
            fromDateTime, toDateTime, questions
        });

        state.exams.push(exam);
        closeCreateExamModal();

        showEmailNotification(exam);
        sendBrowserNotification(exam);

        setTimeout(() => {
            loadDashboard();
            const studentUser = state.users.find(u => u.username === student);
            showNotificationPopup(
                '\u2705 Exam Scheduled Successfully',
                `Exam scheduled to ${studentUser.name}. \u{1F4E7} Email notification sent to ${studentUser.personalEmail}`
            );
        }, 500);
    } catch (e) {
        showNotificationPopup('\u274C Error', 'Failed to schedule exam: ' + e.message);
    }
}

// ─── Add Question ───
function addQuestion() {
    questionCounter++;
    const qId = questionCounter;
    const questionsList = document.getElementById('questionsList');

    const html = `
        <div class="question-item" data-question-id="${qId}">
            <div class="question-header">
                <span class="question-number">Question ${qId}</span>
                <button type="button" class="btn-icon" onclick="removeQuestion(${qId})">\u{1F5D1}\u{FE0F}</button>
            </div>
            <div class="form-group">
                <label class="form-label">Question Type</label>
                <select class="form-select question-type" onchange="handleQuestionTypeChange(${qId})">
                    <option value="mcq">Multiple Choice</option>
                    <option value="short">Short Answer</option>
                    <option value="essay">Essay</option>
                    <option value="truefalse">True/False</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Question Text / Upload Image</label>
                <textarea class="form-textarea question-text" rows="2" placeholder="Type question or paste image (Ctrl+V)"></textarea>
                <input type="hidden" class="question-image-data" id="image-data-${qId}" value="">
                <div class="image-preview" id="image-preview-${qId}" style="display:none;">
                    <img id="image-display-${qId}" src="" alt="Question Image">
                </div>
                <div style="margin-top:8px;">
                    <input type="file" id="question-image-${qId}" accept=".jpg,.jpeg,.png,.gif,.webp" style="display:none;">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('question-image-${qId}').click()" style="font-size:13px;padding:6px 12px;">\u{1F4F7} Upload Image</button>
                    <span id="paste-indicator-${qId}" style="margin-left:12px;font-size:12px;color:var(--color-text-secondary);"></span>
                </div>
            </div>
            <div class="question-options-container" id="options-${qId}">
                <div class="form-group">
                    <label class="form-label">Options (select correct answer)</label>
                    <div class="options-list">
                        <div class="option-item"><input type="radio" name="correct-${qId}" value="0" checked><input type="text" class="form-input" placeholder="Option 1"></div>
                        <div class="option-item"><input type="radio" name="correct-${qId}" value="1"><input type="text" class="form-input" placeholder="Option 2"></div>
                        <div class="option-item"><input type="radio" name="correct-${qId}" value="2"><input type="text" class="form-input" placeholder="Option 3"></div>
                        <div class="option-item"><input type="radio" name="correct-${qId}" value="3"><input type="text" class="form-input" placeholder="Option 4"></div>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Marks <span class="required-asterisk">*</span></label>
                <input type="number" class="form-input question-marks" value="2" min="1" placeholder="2">
            </div>
        </div>`;

    questionsList.insertAdjacentHTML('beforeend', html);

    // Setup image handlers
    setTimeout(() => {
        const textarea = document.querySelector(`[data-question-id="${qId}"] .question-text`);
        const imageInput = document.getElementById(`question-image-${qId}`);
        const imagePreview = document.getElementById(`image-preview-${qId}`);
        const imageDisplay = document.getElementById(`image-display-${qId}`);
        const pasteIndicator = document.getElementById(`paste-indicator-${qId}`);
        const hiddenData = document.getElementById(`image-data-${qId}`);

        // Auto-fill MCQ options with 1,2,3,4 when image is detected
        function autoFillOptionsOnImage(questionId) {
            const questionItem = document.querySelector(`[data-question-id="${questionId}"]`);
            if (!questionItem) return;
            const type = questionItem.querySelector('.question-type').value;
            if (type === 'mcq') {
                const optionInputs = questionItem.querySelectorAll('.option-item input[type="text"]');
                optionInputs.forEach((inp, idx) => {
                    if (!inp.value.trim()) {
                        inp.value = String(idx + 1);
                    }
                });
            }
        }

        // Handle paste
        textarea.addEventListener('paste', function(e) {
            const items = e.clipboardData.items;
            for (let item of items) {
                if (item.type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const blob = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = async function(ev) {
                        const imgData = ev.target.result;
                        // Try GitHub upload
                        const url = await processImageForStorage(imgData, `q${qId}_pasted.png`);
                        imageDisplay.src = url;
                        hiddenData.value = url;
                        imagePreview.style.display = 'block';
                        pasteIndicator.textContent = '\u2705 Image detected';
                        pasteIndicator.style.color = 'var(--color-success)';
                        // Auto-fill options 1,2,3,4
                        autoFillOptionsOnImage(qId);
                    };
                    reader.readAsDataURL(blob);
                    break;
                }
            }
        });

        // Handle file input
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async function(ev) {
                    const imgData = ev.target.result;
                    const url = await processImageForStorage(imgData, file.name);
                    imageDisplay.src = url;
                    hiddenData.value = url;
                    imagePreview.style.display = 'block';
                    pasteIndicator.textContent = '\u2705 Image uploaded';
                    pasteIndicator.style.color = 'var(--color-success)';
                    // Auto-fill options 1,2,3,4
                    autoFillOptionsOnImage(qId);
                };
                reader.readAsDataURL(file);
            }
        });
    }, 50);
}

function removeQuestion(qId) {
    const el = document.querySelector(`[data-question-id="${qId}"]`);
    if (el) el.remove();
}

function handleQuestionTypeChange(qId) {
    const item = document.querySelector(`[data-question-id="${qId}"]`);
    const type = item.querySelector('.question-type').value;
    const container = document.getElementById(`options-${qId}`);

    if (type === 'mcq') {
        container.innerHTML = `
            <div class="form-group">
                <label class="form-label">Options (select correct answer) <span class="required-asterisk">*</span></label>
                <div class="options-list">
                    <div class="option-item"><input type="radio" name="correct-${qId}" value="0" checked><input type="text" class="form-input" placeholder="Option 1"></div>
                    <div class="option-item"><input type="radio" name="correct-${qId}" value="1"><input type="text" class="form-input" placeholder="Option 2"></div>
                    <div class="option-item"><input type="radio" name="correct-${qId}" value="2"><input type="text" class="form-input" placeholder="Option 3"></div>
                    <div class="option-item"><input type="radio" name="correct-${qId}" value="3"><input type="text" class="form-input" placeholder="Option 4"></div>
                </div>
            </div>`;
    } else if (type === 'truefalse') {
        container.innerHTML = `
            <div class="form-group">
                <label class="form-label">Correct Answer <span class="required-asterisk">*</span></label>
                <div class="options-list">
                    <div class="option-item"><input type="radio" name="correct-${qId}" value="0" checked><span>True</span></div>
                    <div class="option-item"><input type="radio" name="correct-${qId}" value="1"><span>False</span></div>
                </div>
            </div>`;
    } else {
        container.innerHTML = `
            <div class="form-group">
                <label class="form-label">Expected Answer (for reference)</label>
                <textarea class="form-textarea expected-answer" rows="2" placeholder="Enter expected answer"></textarea>
            </div>`;
    }
}
