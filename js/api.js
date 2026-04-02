/* ============================================
   Firebase API Adapter
   Replaces REST API + Socket.IO with Firestore
   Real-time sync built into Firestore listeners
   ============================================ */

const api = {
    // ─── Users ───
    // Auth is handled locally (hardcoded credentials in auth.js)
    // Firestore is used only for data storage

    async getAllUsers() {
        const snap = await db.collection('users').get();
        return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    },

    async ensureUserProfile(user) {
        // Seed user profile into Firestore if it doesn't exist
        const docRef = db.collection('users').doc(user.username);
        const doc = await docRef.get();
        if (!doc.exists) {
            await docRef.set({
                username: user.username,
                name: user.name,
                email: user.email,
                personalEmail: user.personalEmail,
                role: user.role,
                avatar: user.avatar
            });
        }
    },

    // ─── Exams ───
    async createExam(examData) {
        const examId = 'exam_' + Date.now();
        const exam = {
            ...examData,
            id: examId,
            status: 'scheduled',
            createdAt: new Date().toISOString()
        };
        await db.collection('exams').doc(examId).set(exam);

        // Create notification for student
        await this.createNotification(
            examData.student,
            'exam_scheduled',
            `New Exam: ${examData.title}`,
            `You have a new exam scheduled by ${state.currentUser.name}`
        );

        return exam;
    },

    async getExams(username) {
        // Get exams where user is student or examiner
        const asStudent = await db.collection('exams').where('student', '==', username).get();
        const asExaminer = await db.collection('exams').where('examiner', '==', username).get();

        const exams = new Map();
        asStudent.docs.forEach(d => exams.set(d.id, { id: d.id, ...d.data() }));
        asExaminer.docs.forEach(d => exams.set(d.id, { id: d.id, ...d.data() }));
        return Array.from(exams.values());
    },

    async updateExam(examId, data) {
        await db.collection('exams').doc(examId).update(data);
    },

    async deleteExam(examId) {
        await db.collection('exams').doc(examId).delete();
    },

    // ─── Exam Session ───
    async startExam(examId) {
        await db.collection('exams').doc(examId).update({
            status: 'in_progress'
        });

        // Initialize behavioral metrics
        await db.collection('behavioral_metrics').doc(examId).set({
            examId,
            tabSwitches: 0,
            tabSwitchLog: [],
            copyAttempts: 0,
            pasteAttempts: 0,
            fullscreenToggles: 0,
            idleTime: 0,
            activeTime: 0,
            warningsTriggered: 0,
            fullscreenExit: false
        }, { merge: true });

        // Notify examiner
        const exam = (await db.collection('exams').doc(examId).get()).data();
        if (exam) {
            await this.createNotification(
                exam.examiner, 'exam_started',
                'Exam Started',
                `${state.currentUser.name} started "${exam.title}"`
            );
        }
    },

    async saveAnswer(examId, questionSeq, value) {
        await db.collection('exam_answers').doc(`${examId}_q${questionSeq}`).set({
            examId, questionSeq, answerValue: String(value)
        });
    },

    async submitExam(examId, data) {
        const { answers, behavioralMetrics, timeTaken, fullscreenExitSubmission } = data;

        // Get exam for grading
        const examDoc = await db.collection('exams').doc(examId).get();
        const exam = examDoc.data();

        // Server-side grading
        const result = gradeExam(exam.questions, answers);

        // Save result
        await db.collection('exam_results').doc(examId).set({
            examId,
            ...result,
            timeTaken: timeTaken || 0,
            questionResults: result.questionResults
        });

        // Save behavioral metrics
        if (behavioralMetrics) {
            await db.collection('behavioral_metrics').doc(examId).set({
                examId,
                tabSwitches: behavioralMetrics.tabSwitchCount || 0,
                tabSwitchLog: behavioralMetrics.tabSwitches || [],
                copyAttempts: behavioralMetrics.copyAttempts || 0,
                pasteAttempts: behavioralMetrics.pasteAttempts || 0,
                fullscreenToggles: behavioralMetrics.fullscreenToggles || 0,
                idleTime: behavioralMetrics.idleTime || 0,
                activeTime: behavioralMetrics.activeTime || 0,
                warningsTriggered: behavioralMetrics.warningsTriggered || 0,
                fullscreenExit: !!fullscreenExitSubmission
            });
        }

        // Save answers
        if (answers) {
            const batch = db.batch();
            Object.entries(answers).forEach(([seq, value]) => {
                const ref = db.collection('exam_answers').doc(`${examId}_q${seq}`);
                batch.set(ref, { examId, questionSeq: parseInt(seq), answerValue: String(value) });
            });
            await batch.commit();
        }

        // Update exam status
        await db.collection('exams').doc(examId).update({
            status: 'completed',
            completedAt: new Date().toISOString(),
            timeTaken: timeTaken || 0,
            fullscreenExitSubmission: !!fullscreenExitSubmission,
            result,
            behavioralMetrics: behavioralMetrics || {},
            answers: answers || {}
        });

        // Notify examiner
        await this.createNotification(
            exam.examiner, 'exam_submitted',
            `Exam Submitted: ${exam.title}`,
            `${state.currentUser.name} scored ${result.percentage}% (${result.grade})`
        );

        return result;
    },

    async sendProctoringEvent(examId, type, data) {
        const metricsRef = db.collection('behavioral_metrics').doc(examId);

        if (type === 'tab_switch') {
            await metricsRef.update({
                tabSwitches: firebase.firestore.FieldValue.increment(1),
                tabSwitchLog: firebase.firestore.FieldValue.arrayUnion(data)
            });
        } else if (type === 'copy') {
            await metricsRef.update({ copyAttempts: firebase.firestore.FieldValue.increment(1) });
        } else if (type === 'paste') {
            await metricsRef.update({ pasteAttempts: firebase.firestore.FieldValue.increment(1) });
        }

        // Alert examiner
        const examDoc = await db.collection('exams').doc(examId).get();
        const exam = examDoc.data();
        if (exam) {
            const msgs = { tab_switch: 'switched tabs', copy: 'attempted to copy', paste: 'attempted to paste' };
            await this.createNotification(
                exam.examiner, 'proctoring_alert',
                'Proctoring Alert',
                `${state.currentUser.name} ${msgs[type] || type} during exam`
            );
        }
    },

    // ─── Results ───
    async getResult(examId) {
        const doc = await db.collection('exam_results').doc(examId).get();
        return doc.exists ? doc.data() : null;
    },

    // ─── Todos ───
    async createTodo(todoData) {
        const todoId = 'todo_' + Date.now();
        const todo = {
            ...todoData,
            id: todoId,
            completedBy: [],
            isDeleted: false,
            createdAt: new Date().toISOString()
        };
        await db.collection('todos').doc(todoId).set(todo);
        return todo;
    },

    async getTodos(username) {
        const snap = await db.collection('todos')
            .where('isDeleted', '==', false)
            .get();
        return snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(t => {
                const assigned = t.assignedTo || [];
                return assigned.includes(username) || t.createdBy === username;
            });
    },

    async toggleTodo(todoId, username) {
        const doc = await db.collection('todos').doc(todoId).get();
        if (!doc.exists) throw new Error('Todo not found');
        const todo = doc.data();
        const completedBy = todo.completedBy || [];
        const idx = completedBy.indexOf(username);

        if (idx >= 0) {
            completedBy.splice(idx, 1);
        } else {
            completedBy.push(username);
        }

        await db.collection('todos').doc(todoId).update({ completedBy });
        return completedBy;
    },

    async deleteTodo(todoId) {
        await db.collection('todos').doc(todoId).update({ isDeleted: true });
    },

    // ─── Notifications ───
    async createNotification(targetUser, type, title, body) {
        const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const notif = {
            id: notifId, type, title, body,
            targetUser,
            isRead: false,
            timestamp: new Date().toISOString()
        };
        await db.collection('notifications').doc(notifId).set(notif);
        return notif;
    },

    async getNotifications(username) {
        const snap = await db.collection('notifications')
            .where('targetUser', '==', username)
            .get();
        const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort client-side (avoids needing Firestore composite index)
        notifs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        return notifs.slice(0, 50);
    },

    async markNotificationRead(notifId) {
        await db.collection('notifications').doc(notifId).update({ isRead: true });
    },

    // ─── GitHub Config ───
    async getGitHubConfig(username) {
        const doc = await db.collection('github_config').doc(username).get();
        return doc.exists ? doc.data() : { owner: '', repo: '', branch: 'main', token: '', imageFolder: 'exam-images' };
    },

    async saveGitHubConfig(username, config) {
        await db.collection('github_config').doc(username).set(config);
    },

    // ─── Real-time Listeners ───
    _listeners: [],

    setupRealtimeListeners(username) {
        // Clear any existing listeners
        this.clearListeners();

        // Listen for exam changes
        const examUnsub1 = db.collection('exams').where('student', '==', username)
            .onSnapshot(snap => {
                snap.docChanges().forEach(change => {
                    const exam = { id: change.doc.id, ...change.doc.data() };
                    if (change.type === 'added') {
                        if (!state.exams.find(e => e.id === exam.id)) {
                            state.exams.push(exam);
                        }
                    } else if (change.type === 'modified') {
                        const idx = state.exams.findIndex(e => e.id === exam.id);
                        if (idx >= 0) state.exams[idx] = exam;
                        else state.exams.push(exam);
                    } else if (change.type === 'removed') {
                        state.exams = state.exams.filter(e => e.id !== exam.id);
                    }
                });
                // Refresh dashboard if visible
                if (document.getElementById('dashboard') && !document.getElementById('dashboard').classList.contains('hidden')) {
                    loadDashboard();
                }
            });

        const examUnsub2 = db.collection('exams').where('examiner', '==', username)
            .onSnapshot(snap => {
                snap.docChanges().forEach(change => {
                    const exam = { id: change.doc.id, ...change.doc.data() };
                    if (change.type === 'modified') {
                        const idx = state.exams.findIndex(e => e.id === exam.id);
                        if (idx >= 0) state.exams[idx] = exam;
                    }
                });
            });

        // Listen for new notifications
        const notifUnsub = db.collection('notifications')
            .where('targetUser', '==', username)
            .onSnapshot(snap => {
                snap.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const notif = { id: change.doc.id, ...change.doc.data() };
                        if (!state.notifications.find(n => n.id === notif.id)) {
                            state.notifications.unshift(notif);
                            updateNotificationBadge();
                            if (typeof showNotificationPopup === 'function') {
                                showNotificationPopup(notif.title, notif.body);
                            }
                            // Browser notification
                            if ('Notification' in window && Notification.permission === 'granted') {
                                new Notification(notif.title, { body: notif.body });
                            }
                        }
                    }
                });
            });

        // Listen for todo changes
        const todoUnsub = db.collection('todos')
            .where('isDeleted', '==', false)
            .onSnapshot(snap => {
                snap.docChanges().forEach(change => {
                    const todo = { id: change.doc.id, ...change.doc.data() };
                    const assigned = todo.assignedTo || [];
                    if (!assigned.includes(username) && todo.createdBy !== username) return;

                    if (change.type === 'added') {
                        if (!state.todos.find(t => t.id === todo.id)) {
                            state.todos.push(todo);
                        }
                    } else if (change.type === 'modified') {
                        const idx = state.todos.findIndex(t => t.id === todo.id);
                        if (idx >= 0) state.todos[idx] = todo;
                    } else if (change.type === 'removed') {
                        state.todos = state.todos.filter(t => t.id !== todo.id);
                    }
                });
            });

        this._listeners = [examUnsub1, examUnsub2, notifUnsub, todoUnsub];
    },

    clearListeners() {
        this._listeners.forEach(unsub => unsub());
        this._listeners = [];
    }
};

// ─── Client-side grading (same logic as before) ───
function gradeExam(questions, answers) {
    let score = 0, totalMarks = 0, correctAnswers = 0;
    const questionResults = [];

    questions.forEach((q, idx) => {
        totalMarks += q.marks;
        const studentAnswer = answers ? answers[idx] : undefined;
        let isCorrect = false, marksAwarded = 0;

        if (q.type === 'mcq' || q.type === 'truefalse') {
            if (studentAnswer !== undefined && studentAnswer !== null && parseInt(studentAnswer) === q.correct) {
                isCorrect = true;
                marksAwarded = q.marks;
                correctAnswers++;
            }
        } else {
            if (studentAnswer && studentAnswer.toString().trim().length > 10) {
                marksAwarded = Math.round(q.marks * 0.7);
                isCorrect = true;
                correctAnswers++;
            }
        }

        score += marksAwarded;
        questionResults.push({
            questionIndex: idx,
            question: q,
            questionText: q.text,
            type: q.type,
            marks: q.marks,
            marksAwarded,
            earnedMarks: marksAwarded,
            isCorrect,
            userAnswer: studentAnswer !== undefined ? studentAnswer : null,
            studentAnswer: studentAnswer !== undefined ? String(studentAnswer) : '',
            correctAnswer: (q.type === 'mcq' || q.type === 'truefalse') ? q.correct : (q.expectedAnswer || 'N/A')
        });
    });

    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B+';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C';
    else if (percentage >= 40) grade = 'D';

    return {
        score, totalMarks, percentage, grade,
        correctAnswers, totalQuestions: questions.length,
        timeTaken: 0,
        questionResults
    };
}

function updateNotificationBadge() {
    const btn = document.getElementById('notificationsBtn');
    if (btn) {
        const unread = state.notifications.filter(n => !n.isRead).length;
        btn.dataset.count = unread;
    }
}
