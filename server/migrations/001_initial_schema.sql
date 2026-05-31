-- BoardersWatch Database Schema
-- SQLite3 / Turso

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'staff' CHECK(role IN ('admin','staff')),
    status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. TENANTS
CREATE TABLE IF NOT EXISTS tenants (
    tenant_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone_number TEXT,
    email TEXT,
    emergency_contact TEXT,
    document_path TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. ROOMS
CREATE TABLE IF NOT EXISTS rooms (
    room_id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_number TEXT NOT NULL UNIQUE,
    floor INTEGER,
    type TEXT DEFAULT 'single' CHECK(type IN ('single','double')),
    capacity INTEGER DEFAULT 1,
    monthly_rate REAL NOT NULL,
    amenities TEXT,
    status TEXT DEFAULT 'available' CHECK(status IN ('available','occupied','maintenance'))
);

-- 4. LEASES
CREATE TABLE IF NOT EXISTS leases (
    lease_id INTEGER PRIMARY KEY AUTOINCREMENT,
    lease_number TEXT UNIQUE,
    tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE SET NULL,
    room_id INTEGER REFERENCES rooms(room_id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rent REAL NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','expiring_soon','expired'))
);

-- 5. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_number TEXT UNIQUE,
    lease_id INTEGER REFERENCES leases(lease_id) ON DELETE SET NULL,
    tenant_name TEXT,
    amount REAL NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash','bank_transfer')),
    payment_type TEXT DEFAULT 'rent' CHECK(payment_type IN ('rent','deposit','utility'))
);

-- 6. CCTV_CAMERAS (Configurable - admin adds via UI)
CREATE TABLE IF NOT EXISTS cctv_cameras (
    camera_id INTEGER PRIMARY KEY AUTOINCREMENT,
    camera_name TEXT NOT NULL,
    location TEXT,
    brand TEXT DEFAULT 'generic',
    rtsp_url TEXT NOT NULL,
    username TEXT,
    password_encrypted TEXT,
    ip_address TEXT,
    port INTEGER DEFAULT 554,
    stream_path TEXT DEFAULT '/stream1',
    motion_detection INTEGER DEFAULT 1,
    alert_threshold TEXT DEFAULT 'medium' CHECK(alert_threshold IN ('low','medium','high')),
    status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','offline')),
    last_health_check DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. CCTV_ALERTS
CREATE TABLE IF NOT EXISTS cctv_alerts (
    alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
    camera_id INTEGER REFERENCES cctv_cameras(camera_id) ON DELETE SET NULL,
    alert_type TEXT DEFAULT 'motion' CHECK(alert_type IN ('motion','offline','tampering')),
    description TEXT,
    screenshot_path TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_acknowledged INTEGER DEFAULT 0,
    acknowledged_by INTEGER REFERENCES users(user_id),
    acknowledged_at DATETIME
);

-- 8. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_id INTEGER,
    type TEXT CHECK(type IN ('motion_detected','camera_offline','camera_tampering','lease_expiring','payment_received','tenant_registered')),
    title TEXT,
    message TEXT,
    channel TEXT DEFAULT 'system' CHECK(channel IN ('sms','email','system')),
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. ACTIVITY_LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(user_id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
