from __future__ import annotations

import re
import sqlite3
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR / "mediflow.db"

DEPARTMENTS = [
    "General Medicine",
    "Pediatrics",
    "Gynecology",
    "Cardiology",
    "Orthopedics",
    "Emergency",
]

DOCTOR_SEEDS = [
    {"name": "Dr. Aisha Raman", "specialty": "General Medicine", "room": "A-101"},
    {"name": "Dr. Harish Patel", "specialty": "Pediatrics", "room": "B-204"},
    {"name": "Dr. Meera Joseph", "specialty": "Gynecology", "room": "C-112"},
    {"name": "Dr. Vikram Shah", "specialty": "Cardiology", "room": "D-305"},
    {"name": "Dr. Sana Khan", "specialty": "Orthopedics", "room": "E-118"},
    {"name": "Dr. Nitin Verma", "specialty": "Emergency", "room": "ER-01"},
]

app = Flask(__name__)


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def init_db() -> None:
    connection = get_connection()
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS doctors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            specialty TEXT NOT NULL,
            room TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'available'
        );

        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            age INTEGER NOT NULL,
            phone TEXT NOT NULL,
            gender TEXT NOT NULL,
            department TEXT NOT NULL,
            symptoms TEXT NOT NULL,
            is_pregnant INTEGER NOT NULL DEFAULT 0,
            is_emergency INTEGER NOT NULL DEFAULT 0,
            priority_label TEXT NOT NULL,
            priority_score INTEGER NOT NULL,
            token_number TEXT NOT NULL UNIQUE,
            assigned_doctor_id INTEGER,
            status TEXT NOT NULL DEFAULT 'waiting',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (assigned_doctor_id) REFERENCES doctors (id)
        );
        """
    )
    seed_doctors(connection)
    connection.commit()
    connection.close()


def seed_doctors(connection: sqlite3.Connection) -> None:
    doctor_count = connection.execute("SELECT COUNT(*) FROM doctors").fetchone()[0]
    if doctor_count:
        return

    connection.executemany(
        """
        INSERT INTO doctors (name, specialty, room, status)
        VALUES (:name, :specialty, :room, 'available')
        """,
        DOCTOR_SEEDS,
    )


def clean_phone_number(phone_number: str) -> str:
    return re.sub(r"\D", "", phone_number or "")


def get_priority_details(age: int, is_pregnant: bool, is_emergency: bool) -> tuple[int, str, list[str]]:
    priority_score = 10
    priority_flags: list[str] = []
    priority_label = "Standard"

    if is_emergency:
        priority_score += 100
        priority_flags.append("Emergency")
        priority_label = "Emergency"

    if age >= 60:
        priority_score += 35
        priority_flags.append("Senior Citizen")

    if age <= 5:
        priority_score += 20
        priority_flags.append("Young Child")

    if is_pregnant:
        priority_score += 30
        priority_flags.append("Pregnancy")

    if priority_label != "Emergency" and priority_flags:
        priority_label = "Priority"

    return priority_score, priority_label, priority_flags


def get_next_token(connection: sqlite3.Connection) -> str:
    next_id = connection.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM patients").fetchone()[0]
    return f"MF-{next_id:03d}"


def serialize_rows(rows: list[sqlite3.Row]) -> list[dict]:
    return [dict(row) for row in rows]


def choose_doctor(
    connection: sqlite3.Connection, department: str, available_only: bool = False
) -> sqlite3.Row | None:
    status_filter = "AND d.status = 'available'" if available_only else ""

    def find_candidate(specialty: str | None) -> sqlite3.Row | None:
        specialty_filter = "d.specialty = ?" if specialty else "1 = 1"
        params = (specialty,) if specialty else ()
        return connection.execute(
            f"""
            SELECT
                d.id,
                d.name,
                d.specialty,
                d.room,
                d.status,
                COALESCE(SUM(CASE WHEN p.status = 'waiting' THEN 1 ELSE 0 END), 0) AS waiting_load,
                COALESCE(SUM(CASE WHEN p.status = 'in_consultation' THEN 1 ELSE 0 END), 0) AS active_load
            FROM doctors d
            LEFT JOIN patients p
                ON p.assigned_doctor_id = d.id
               AND p.status IN ('waiting', 'in_consultation')
            WHERE {specialty_filter} {status_filter}
            GROUP BY d.id
            ORDER BY
                CASE WHEN d.status = 'available' THEN 0 ELSE 1 END,
                waiting_load ASC,
                active_load ASC,
                d.name ASC
            LIMIT 1
            """,
            params,
        ).fetchone()

    return find_candidate(department) or find_candidate("General Medicine") or find_candidate(None)


def build_dashboard(connection: sqlite3.Connection) -> dict:
    stats_row = connection.execute(
        """
        SELECT
            COUNT(*) FILTER (WHERE status = 'waiting') AS waiting_count,
            COUNT(*) FILTER (WHERE status = 'in_consultation') AS active_count,
            COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
            COUNT(*) FILTER (
                WHERE status IN ('waiting', 'in_consultation')
                  AND priority_label IN ('Priority', 'Emergency')
            ) AS priority_cases,
            COUNT(*) FILTER (WHERE is_emergency = 1 AND status != 'completed') AS emergency_cases
        FROM patients
        """
    ).fetchone()

    available_doctors = connection.execute(
        "SELECT COUNT(*) FROM doctors WHERE status = 'available'"
    ).fetchone()[0]

    active_consultations = serialize_rows(
        connection.execute(
            """
            SELECT
                p.id,
                p.full_name,
                p.age,
                p.gender,
                p.department,
                p.priority_label,
                p.symptoms,
                p.token_number,
                p.updated_at,
                d.name AS doctor_name,
                d.room AS doctor_room
            FROM patients p
            LEFT JOIN doctors d ON d.id = p.assigned_doctor_id
            WHERE p.status = 'in_consultation'
            ORDER BY p.updated_at ASC, p.id ASC
            """
        ).fetchall()
    )

    waiting_queue = serialize_rows(
        connection.execute(
            """
            SELECT
                p.id,
                p.full_name,
                p.age,
                p.department,
                p.priority_label,
                p.token_number,
                p.created_at,
                COALESCE(d.name, 'Front Desk Assignment') AS doctor_name
            FROM patients p
            LEFT JOIN doctors d ON d.id = p.assigned_doctor_id
            WHERE p.status = 'waiting'
            ORDER BY p.priority_score DESC, p.created_at ASC, p.id ASC
            LIMIT 12
            """
        ).fetchall()
    )

    recent_completed = serialize_rows(
        connection.execute(
            """
            SELECT
                p.id,
                p.full_name,
                p.department,
                p.token_number,
                p.updated_at,
                COALESCE(d.name, 'Doctor updated') AS doctor_name
            FROM patients p
            LEFT JOIN doctors d ON d.id = p.assigned_doctor_id
            WHERE p.status = 'completed'
            ORDER BY p.updated_at DESC, p.id DESC
            LIMIT 8
            """
        ).fetchall()
    )

    doctors = serialize_rows(
        connection.execute(
            """
            SELECT
                d.id,
                d.name,
                d.specialty,
                d.room,
                d.status,
                COALESCE(SUM(CASE WHEN p.status = 'waiting' THEN 1 ELSE 0 END), 0) AS waiting_load,
                COALESCE(SUM(CASE WHEN p.status = 'in_consultation' THEN 1 ELSE 0 END), 0) AS active_load
            FROM doctors d
            LEFT JOIN patients p
                ON p.assigned_doctor_id = d.id
               AND p.status IN ('waiting', 'in_consultation')
            GROUP BY d.id
            ORDER BY d.specialty ASC, d.name ASC
            """
        ).fetchall()
    )

    current_token = active_consultations[0]["token_number"] if active_consultations else "--"

    return {
        "stats": {
            "current_token": current_token,
            "waiting_count": stats_row["waiting_count"] or 0,
            "active_count": stats_row["active_count"] or 0,
            "completed_count": stats_row["completed_count"] or 0,
            "priority_cases": stats_row["priority_cases"] or 0,
            "emergency_cases": stats_row["emergency_cases"] or 0,
            "available_doctors": available_doctors,
        },
        "active_consultations": active_consultations,
        "waiting_queue": waiting_queue,
        "recent_completed": recent_completed,
        "doctors": doctors,
        "updated_at": now_iso(),
    }


def validate_registration(form_data: dict) -> tuple[dict, str | None]:
    full_name = (form_data.get("full_name") or "").strip()
    phone = clean_phone_number(form_data.get("phone", ""))
    gender = (form_data.get("gender") or "").strip()
    department = (form_data.get("department") or "").strip()
    symptoms = (form_data.get("symptoms") or "").strip()

    try:
        age = int(form_data.get("age", ""))
    except (TypeError, ValueError):
        return {}, "Please enter a valid age."

    if len(full_name) < 3:
        return {}, "Please enter the patient's full name."

    if age <= 0 or age > 120:
        return {}, "Age must be between 1 and 120."

    if len(phone) < 10:
        return {}, "Please enter a valid phone number."

    if gender not in {"Male", "Female", "Other"}:
        return {}, "Please choose a gender."

    if department not in DEPARTMENTS:
        return {}, "Please choose a department."

    if len(symptoms) < 5:
        return {}, "Please enter symptoms with a little more detail."

    is_pregnant = form_data.get("is_pregnant") in {"on", "true", "1", True, 1}
    is_emergency = form_data.get("is_emergency") in {"on", "true", "1", True, 1}

    return {
        "full_name": full_name,
        "age": age,
        "phone": phone,
        "gender": gender,
        "department": department,
        "symptoms": symptoms,
        "is_pregnant": is_pregnant,
        "is_emergency": is_emergency,
    }, None


@app.route("/")
def home():
    connection = get_connection()
    dashboard = build_dashboard(connection)
    connection.close()
    return render_template("index.html", dashboard=dashboard, departments=DEPARTMENTS)


@app.route("/register", methods=["POST"])
def register_patient():
    submitted = request.get_json(silent=True) or request.form.to_dict(flat=True)
    form_data, error = validate_registration(submitted)
    if error:
        return jsonify({"ok": False, "message": error}), 400

    connection = get_connection()
    doctor = choose_doctor(connection, form_data["department"], available_only=False)
    token_number = get_next_token(connection)
    priority_score, priority_label, priority_flags = get_priority_details(
        form_data["age"], form_data["is_pregnant"], form_data["is_emergency"]
    )
    timestamp = now_iso()

    connection.execute(
        """
        INSERT INTO patients (
            full_name,
            age,
            phone,
            gender,
            department,
            symptoms,
            is_pregnant,
            is_emergency,
            priority_label,
            priority_score,
            token_number,
            assigned_doctor_id,
            status,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting', ?, ?)
        """,
        (
            form_data["full_name"],
            form_data["age"],
            form_data["phone"],
            form_data["gender"],
            form_data["department"],
            form_data["symptoms"],
            int(form_data["is_pregnant"]),
            int(form_data["is_emergency"]),
            priority_label,
            priority_score,
            token_number,
            doctor["id"] if doctor else None,
            timestamp,
            timestamp,
        ),
    )
    connection.commit()

    dashboard = build_dashboard(connection)
    response = {
        "ok": True,
        "message": "Patient registered successfully.",
        "token_number": token_number,
        "priority_label": priority_label,
        "priority_flags": priority_flags,
        "assigned_doctor": doctor["name"] if doctor else "Front Desk Assignment",
        "doctor_room": doctor["room"] if doctor else "TBD",
        "dashboard": dashboard,
    }
    connection.close()
    return jsonify(response)


@app.route("/api/dashboard")
def dashboard_data():
    connection = get_connection()
    dashboard = build_dashboard(connection)
    connection.close()
    return jsonify(dashboard)


@app.route("/api/queue/call-next", methods=["POST"])
def call_next_patient():
    connection = get_connection()
    waiting_patients = connection.execute(
        """
        SELECT *
        FROM patients
        WHERE status = 'waiting'
        ORDER BY priority_score DESC, created_at ASC, id ASC
        """
    ).fetchall()

    selected_patient = None
    selected_doctor = None

    for patient in waiting_patients:
        doctor = choose_doctor(connection, patient["department"], available_only=True)
        if doctor:
            selected_patient = patient
            selected_doctor = doctor
            break

    if not selected_patient or not selected_doctor:
        connection.close()
        return (
            jsonify(
                {
                    "ok": False,
                    "message": "No waiting patient can be called right now. All suitable doctors may be busy.",
                }
            ),
            400,
        )

    timestamp = now_iso()
    connection.execute(
        """
        UPDATE patients
        SET status = 'in_consultation',
            assigned_doctor_id = ?,
            updated_at = ?
        WHERE id = ?
        """,
        (selected_doctor["id"], timestamp, selected_patient["id"]),
    )
    connection.execute(
        "UPDATE doctors SET status = 'busy' WHERE id = ?",
        (selected_doctor["id"],),
    )
    connection.commit()

    dashboard = build_dashboard(connection)
    connection.close()

    return jsonify(
        {
            "ok": True,
            "message": f"{selected_patient['token_number']} has been called to {selected_doctor['name']} in room {selected_doctor['room']}.",
            "dashboard": dashboard,
        }
    )


@app.route("/api/queue/complete-current", methods=["POST"])
def complete_current_patient():
    connection = get_connection()
    current_patient = connection.execute(
        """
        SELECT id, full_name, token_number, assigned_doctor_id
        FROM patients
        WHERE status = 'in_consultation'
        ORDER BY updated_at ASC, id ASC
        LIMIT 1
        """
    ).fetchone()

    if not current_patient:
        connection.close()
        return jsonify({"ok": False, "message": "There is no active consultation to complete."}), 400

    timestamp = now_iso()
    connection.execute(
        """
        UPDATE patients
        SET status = 'completed',
            updated_at = ?
        WHERE id = ?
        """,
        (timestamp, current_patient["id"]),
    )

    if current_patient["assigned_doctor_id"]:
        connection.execute(
            "UPDATE doctors SET status = 'available' WHERE id = ?",
            (current_patient["assigned_doctor_id"],),
        )

    connection.commit()
    dashboard = build_dashboard(connection)
    connection.close()

    return jsonify(
        {
            "ok": True,
            "message": f"{current_patient['token_number']} - {current_patient['full_name']} has been marked as completed.",
            "dashboard": dashboard,
        }
    )


init_db()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
