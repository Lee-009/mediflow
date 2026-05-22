const body = document.body;
const registrationForm = document.getElementById("registration-form");
const submitButton = document.getElementById("submit-btn");
const callNextButton = document.getElementById("call-next-btn");
const completeButton = document.getElementById("complete-btn");
const tokenResult = document.getElementById("token-result");
const statusMessage = document.getElementById("status-message");
const initialDashboardNode = document.getElementById("initial-dashboard");

const endpoints = {
    dashboard: body.dataset.dashboardUrl,
    register: body.dataset.registerUrl,
    callNext: body.dataset.callNextUrl,
    complete: body.dataset.completeUrl,
};

let pollingHandle = null;

function showForm() {
    const registerSection = document.getElementById("register");
    registerSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setButtonLoading(button, isLoading, loadingText) {
    if (!button) {
        return;
    }

    if (!button.dataset.defaultText) {
        button.dataset.defaultText = button.textContent;
    }

    button.disabled = isLoading;
    button.textContent = isLoading ? loadingText : button.dataset.defaultText;
}

function formatPriorityClass(label) {
    return (label || "standard").toLowerCase().replace(/\s+/g, "-");
}

function formatTimestamp(value) {
    if (!value) {
        return "Just now";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function renderMetrics(stats, updatedAt) {
    document.getElementById("stat-current-token").textContent = stats.current_token || "--";
    document.getElementById("stat-waiting-count").textContent = stats.waiting_count ?? 0;
    document.getElementById("stat-available-doctors").textContent = stats.available_doctors ?? 0;
    document.getElementById("stat-priority-cases").textContent = stats.priority_cases ?? 0;
    document.getElementById("stat-active-count").textContent = stats.active_count ?? 0;
    document.getElementById("stat-completed-count").textContent = stats.completed_count ?? 0;
    document.getElementById("updated-at").textContent = formatTimestamp(updatedAt);
}

function renderActiveConsultations(items) {
    const container = document.getElementById("active-consultations");

    if (!items.length) {
        container.innerHTML = `<div class="empty-state">No consultation is active right now.</div>`;
        return;
    }

    container.innerHTML = items
        .map(
            (item) => `
                <article class="active-item">
                    <div>
                        <strong>${item.token_number}</strong>
                        <p>${item.full_name} &middot; ${item.department}</p>
                    </div>
                    <div class="active-meta">
                        <span>${item.doctor_name || "Doctor pending"}</span>
                        <small>${item.doctor_room || "Room pending"}</small>
                    </div>
                </article>
            `
        )
        .join("");
}

function renderWaitingQueue(items) {
    const container = document.getElementById("waiting-queue");

    if (!items.length) {
        container.innerHTML = `<div class="empty-state">The queue is clear. Newly registered patients will appear here.</div>`;
        return;
    }

    container.innerHTML = items
        .map(
            (item, index) => `
                <article class="waiting-item">
                    <div class="queue-index">${index + 1}</div>
                    <div class="queue-body">
                        <strong>${item.token_number} &middot; ${item.full_name}</strong>
                        <p>${item.department} &middot; Suggested doctor: ${item.doctor_name || "Front Desk Assignment"}</p>
                    </div>
                    <span class="priority-tag ${formatPriorityClass(item.priority_label)}">${item.priority_label}</span>
                </article>
            `
        )
        .join("");
}

function renderCompletedQueue(items) {
    const container = document.getElementById("completed-queue");

    if (!items.length) {
        container.innerHTML = `<div class="empty-state">Completed patients will appear here after consultation is finished.</div>`;
        return;
    }

    container.innerHTML = items
        .map(
            (item) => `
                <article class="completed-item">
                    <div>
                        <strong>${item.token_number} &middot; ${item.full_name}</strong>
                        <p>${item.department} &middot; ${item.doctor_name || "Doctor updated"}</p>
                    </div>
                    <span class="complete-tag">Completed</span>
                </article>
            `
        )
        .join("");
}

function renderDoctorGrid(items) {
    const container = document.getElementById("doctor-grid");
    container.innerHTML = items
        .map(
            (doctor) => `
                <article class="doctor-card">
                    <div class="doctor-top">
                        <div>
                            <h3>${doctor.name}</h3>
                            <p>${doctor.specialty}</p>
                        </div>
                        <span class="status-pill ${doctor.status.toLowerCase()}">${doctor.status}</span>
                    </div>
                    <div class="doctor-stats">
                        <div>
                            <span>Room</span>
                            <strong>${doctor.room}</strong>
                        </div>
                        <div>
                            <span>Waiting</span>
                            <strong>${doctor.waiting_load}</strong>
                        </div>
                        <div>
                            <span>Active</span>
                            <strong>${doctor.active_load}</strong>
                        </div>
                    </div>
                </article>
            `
        )
        .join("");
}

function renderTokenResult(payload) {
    tokenResult.classList.remove("empty");
    const flagMarkup = payload.priority_flags && payload.priority_flags.length
        ? payload.priority_flags.map((flag) => `<span class="priority-tag ${formatPriorityClass(payload.priority_label)}">${flag}</span>`).join("")
        : `<span class="priority-tag ${formatPriorityClass(payload.priority_label)}">${payload.priority_label}</span>`;

    tokenResult.innerHTML = `
        <span class="token-label">Generated token</span>
        <strong class="token-number">${payload.token_number}</strong>
        <p>${payload.message}</p>
        <div class="token-grid">
            <article>
                <span>Assigned Doctor</span>
                <strong>${payload.assigned_doctor}</strong>
            </article>
            <article>
                <span>Room</span>
                <strong>${payload.doctor_room}</strong>
            </article>
            <article>
                <span>Priority Level</span>
                <strong>${payload.priority_label}</strong>
            </article>
            <article>
                <span>Status</span>
                <strong>Waiting</strong>
            </article>
        </div>
        <div class="token-flags">${flagMarkup}</div>
    `;
}

function renderDashboard(dashboard) {
    if (!dashboard) {
        return;
    }

    renderMetrics(dashboard.stats, dashboard.updated_at);
    renderActiveConsultations(dashboard.active_consultations || []);
    renderWaitingQueue(dashboard.waiting_queue || []);
    renderCompletedQueue(dashboard.recent_completed || []);
    renderDoctorGrid(dashboard.doctors || []);
}

function showStatus(message, type = "success") {
    statusMessage.textContent = message;
    statusMessage.classList.remove("success", "error");
    statusMessage.classList.add(type);
}

async function fetchDashboard() {
    const response = await fetch(endpoints.dashboard, { headers: { Accept: "application/json" } });
    if (!response.ok) {
        throw new Error("Unable to refresh dashboard.");
    }

    const dashboard = await response.json();
    renderDashboard(dashboard);
}

async function handleRegistration(event) {
    event.preventDefault();
    setButtonLoading(submitButton, true, "Generating...");

    try {
        const formData = new FormData(registrationForm);
        const response = await fetch(endpoints.register, {
            method: "POST",
            body: formData,
            headers: { Accept: "application/json" },
        });

        const payload = await response.json();
        if (!response.ok || !payload.ok) {
            throw new Error(payload.message || "Registration failed.");
        }

        renderTokenResult(payload);
        renderDashboard(payload.dashboard);
        showStatus(`${payload.token_number} created successfully and added to the queue.`, "success");
        registrationForm.reset();
    } catch (error) {
        showStatus(error.message, "error");
    } finally {
        setButtonLoading(submitButton, false);
    }
}

async function handleQueueAction(button, endpoint, loadingText) {
    setButtonLoading(button, true, loadingText);

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { Accept: "application/json" },
        });

        const payload = await response.json();
        if (!response.ok || !payload.ok) {
            throw new Error(payload.message || "Queue action failed.");
        }

        renderDashboard(payload.dashboard);
        showStatus(payload.message, "success");
    } catch (error) {
        showStatus(error.message, "error");
    } finally {
        setButtonLoading(button, false);
    }
}

function startPolling() {
    if (pollingHandle) {
        window.clearInterval(pollingHandle);
    }

    pollingHandle = window.setInterval(async () => {
        try {
            await fetchDashboard();
        } catch (error) {
            showStatus(error.message, "error");
        }
    }, 12000);
}

function initialize() {
    try {
        const initialDashboard = JSON.parse(initialDashboardNode.textContent);
        renderDashboard(initialDashboard);
    } catch (error) {
        showStatus("Initial dashboard data could not be loaded.", "error");
    }

    registrationForm.addEventListener("submit", handleRegistration);
    callNextButton.addEventListener("click", () =>
        handleQueueAction(callNextButton, endpoints.callNext, "Calling...")
    );
    completeButton.addEventListener("click", () =>
        handleQueueAction(completeButton, endpoints.complete, "Completing...")
    );

    startPolling();
}

window.showForm = showForm;
initialize();
