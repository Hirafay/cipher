/*
 * cloudSync.class.js
 * ------------------
 * Cipher Cloud Sync + License client.
 *
 * Responsibilities:
 *   1. Generate + persist a per-install UUID (survives renaming).
 *   2. Fingerprint the device (hostname + OS + CPU -> hash).
 *   3. Register the install to Supabase on first launch.
 *   4. Heartbeat every 30s: push stats (if telemetry on) + read lock flag.
 *   5. If locked -> drop a full-screen lock overlay and disable the app.
 *
 * Design notes:
 *   - FAIL-OPEN: if Supabase is unreachable, the app keeps working.
 *   - The kill switch is SERVER-ENFORCED (RLS + trigger). This client
 *     cannot unlock itself; it only READS its own `locked` flag.
 *   - Telemetry is on by default but a settings toggle can disable the
 *     stats push. The license/lock check always runs (legit enforcement).
 */

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const os = require("os");
const fs = require("fs");
const path = require("path");

// ----- CONFIG (publishable key is safe to ship; RLS protects data) -----
const SUPABASE_URL = "https://throgvvyvfnmwasytrbu.supabase.co";
const SUPABASE_KEY = "sb_publishable_qj_AMX5YDR2Eul7Gzo9Xmw_0hFbGTNY";

// Re-verify lock state if last successful check is older than this (ms).
const LOCK_RECHECK_MS = 24 * 60 * 60 * 1000; // 24 hours
const HEARTBEAT_MS = 30 * 1000;              // 30 seconds

class CloudSync {
	constructor(opts = {}) {
		// Where we persist the install identity + last check timestamp.
		this.stateDir = opts.stateDir || require("@electron/remote").app.getPath("userData");
		this.identityFile = path.join(this.stateDir, "cipher_identity.json");

		// Whether the user wants stats telemetry (license check always runs).
		// Defaults to true; can be flipped off in settings.
		this.telemetryEnabled = (typeof opts.telemetryEnabled === "boolean")
			? opts.telemetryEnabled
			: true;

		// The name the running app reports as (so renamed forks still show up).
		this.appName = opts.appName || "Cipher";

		// Whether this is an official build (set by build pipeline later).
		this.isOfficial = opts.isOfficial || false;

		this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
			auth: { persistSession: false }
		});

		this.identity = this._loadOrCreateIdentity();
		this.heartbeatTimer = null;
		this.locked = false;
	}

	// --- Show one-time telemetry notice on first ever launch ---
	_maybeShowFirstRunNotice() {
		// Only show once — tracked via a flag in the identity file.
		if (this.identity.noticeShown) return;

		const notice = document.createElement("div");
		notice.id = "cipher-telemetry-notice";
		notice.setAttribute("style", `
			position: fixed; bottom: 20px; right: 20px; z-index: 9999999;
			max-width: 380px; background: #111; color: #ddd;
			border: 1px solid #00ff88; border-radius: 8px;
			padding: 16px 18px; font-family: monospace; font-size: 13px;
			line-height: 1.5; box-shadow: 0 4px 20px rgba(0,0,0,0.6);
		`);
		notice.innerHTML = `
			<div style="color:#00ff88; font-weight:bold; margin-bottom:8px;">
				&#9432; Cipher Cloud Sync
			</div>
			<p style="margin:0 0 12px;">
				Cipher syncs basic system stats (OS, CPU, RAM, uptime) to a
				private dashboard and checks license status. This helps detect
				unauthorized forks. No personal files or keystrokes are collected.
			</p>
			<div style="display:flex; gap:8px; justify-content:flex-end;">
				<button id="cipher-notice-disable" style="
					background:transparent; border:1px solid #666; color:#aaa;
					padding:6px 12px; border-radius:4px; cursor:pointer; font-family:monospace;">
					Disable
				</button>
				<button id="cipher-notice-ok" style="
					background:#00ff88; border:none; color:#000;
					padding:6px 14px; border-radius:4px; cursor:pointer; font-family:monospace; font-weight:bold;">
					Got it
				</button>
			</div>
		`;
		document.body.appendChild(notice);

		const dismiss = () => {
			this.identity.noticeShown = true;
			this._saveIdentity();
			const el = document.getElementById("cipher-telemetry-notice");
			if (el) el.remove();
		};

		document.getElementById("cipher-notice-ok").onclick = dismiss;
		document.getElementById("cipher-notice-disable").onclick = () => {
			this.telemetryEnabled = false;
			// Persist the opt-out to settings if available
			try {
				if (window.settings) {
					window.settings.cloudSync = false;
					if (window.writeSettingsFile) window.writeSettingsFile();
				}
			} catch (e) {}
			dismiss();
		};
	}

	// --- Identity: generate once, persist forever (survives rename) ---
	_loadOrCreateIdentity() {
		try {
			if (fs.existsSync(this.identityFile)) {
				return JSON.parse(fs.readFileSync(this.identityFile, "utf-8"));
			}
		} catch (e) {
			// corrupt file -> regenerate
		}

		const identity = {
			id: crypto.randomUUID(),
			fingerprint: this._computeFingerprint(),
			createdAt: Date.now(),
			lastSuccessfulCheck: 0
		};

		try {
			fs.writeFileSync(this.identityFile, JSON.stringify(identity, null, 2));
		} catch (e) {
			// non-fatal; we just won't persist (e.g. read-only fs)
		}
		return identity;
	}

	_saveIdentity() {
		try {
			fs.writeFileSync(this.identityFile, JSON.stringify(this.identity, null, 2));
		} catch (e) {}
	}

	// --- Fingerprint: stable hash of hardware/OS characteristics ---
	_computeFingerprint() {
		const cpus = os.cpus();
		const raw = [
			os.hostname(),
			os.platform(),
			os.arch(),
			os.release(),
			cpus.length ? cpus[0].model : "unknown",
			String(os.totalmem())
		].join("|");
		return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
	}

	// --- Gather current system stats for telemetry ---
	async _gatherStats() {
		const stats = {
			hostname: os.hostname(),
			os: os.platform(),
			os_version: os.release(),
			cpu_model: os.cpus().length ? os.cpus()[0].model : "unknown",
			ram_total: this._fmtBytes(os.totalmem()),
			ram_used: this._fmtBytes(os.totalmem() - os.freemem()),
			uptime: this._fmtUptime(os.uptime())
		};

		// CPU percentage via systeminformation if available (Cipher already uses it)
		try {
			const si = require("systeminformation");
			const load = await si.currentLoad();
			stats.cpu_pct = Math.round(load.currentLoad);
		} catch (e) {
			stats.cpu_pct = null;
		}

		return stats;
	}

	_fmtBytes(bytes) {
		const gb = bytes / (1024 ** 3);
		return gb.toFixed(1) + " GB";
	}

	_fmtUptime(seconds) {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		return `${h}h ${m}m`;
	}

	// --- Register this install to Supabase (idempotent upsert) ---
	async register() {
		const row = {
			id: this.identity.id,
			app_name: this.appName,
			is_official: this.isOfficial,
			fingerprint: this.identity.fingerprint
		};

		try {
			// upsert so re-launches don't error on existing id
			const { error } = await this.supabase
				.from("devices")
				.upsert(row, { onConflict: "id", ignoreDuplicates: true });
			if (error) console.warn("[CloudSync] register error:", error.message);
		} catch (e) {
			console.warn("[CloudSync] register failed (offline?):", e.message);
		}
	}

	// --- One heartbeat: push stats (if enabled) + read lock flag ---
	async heartbeat() {
		let update = { last_seen: new Date().toISOString() };

		if (this.telemetryEnabled) {
			const stats = await this._gatherStats();
			update = { ...update, ...stats };
		}

		try {
			// Push our update (server trigger keeps locked/owner immutable from us)
			await this.supabase
				.from("devices")
				.update(update)
				.eq("id", this.identity.id);

			// Read our own row to check the lock flag
			const { data, error } = await this.supabase
				.from("devices")
				.select("locked, app_name")
				.eq("id", this.identity.id)
				.single();

			if (!error && data) {
				this.identity.lastSuccessfulCheck = Date.now();
				this._saveIdentity();
				this._applyLockState(Boolean(data.locked));
			}
		} catch (e) {
			// FAIL-OPEN: unreachable server -> keep running, do nothing
		}
	}

	// --- Apply or clear the lock overlay ---
	_applyLockState(shouldBeLocked) {
		if (shouldBeLocked && !this.locked) {
			this.locked = true;
			this._showLockOverlay();
		} else if (!shouldBeLocked && this.locked) {
			this.locked = false;
			this._hideLockOverlay();
		}
	}

	_showLockOverlay() {
		if (document.getElementById("cipher-lock-overlay")) return;

		const overlay = document.createElement("div");
		overlay.id = "cipher-lock-overlay";
		overlay.setAttribute("style", `
			position: fixed; inset: 0; z-index: 99999999;
			background: #000; color: #ff3b3b;
			display: flex; flex-direction: column;
			align-items: center; justify-content: center;
			font-family: monospace; text-align: center; padding: 2rem;
		`);
		overlay.innerHTML = `
			<div style="font-size: 4rem; margin-bottom: 1rem;">&#128274;</div>
			<h1 style="font-size: 2rem; margin: 0 0 1rem;">LICENSE REVOKED</h1>
			<p style="font-size: 1.1rem; max-width: 600px; line-height: 1.6; color: #ff8080;">
				This installation of Cipher has been remotely locked by the license holder.<br>
				This software is &copy; Hirafay (github.com/Hirafay).<br>
				Unauthorized forks and rebrands are not permitted.
			</p>
			<p style="margin-top: 2rem; font-size: 0.85rem; color: #884444;">
				Install ID: ${this.identity.id}
			</p>
		`;
		document.body.appendChild(overlay);

		// Disable the terminal input while locked
		try {
			if (window.term && window.term[window.currentTerm]) {
				window.term[window.currentTerm].term.blur();
			}
		} catch (e) {}
	}

	_hideLockOverlay() {
		const overlay = document.getElementById("cipher-lock-overlay");
		if (overlay) overlay.remove();
	}

	// --- Boot-time lock pre-check (before UI fully loads) ---
	// Returns true if the app should be considered locked at startup.
	async checkLockOnBoot() {
		const stale = (Date.now() - this.identity.lastSuccessfulCheck) > LOCK_RECHECK_MS;

		try {
			const { data, error } = await this.supabase
				.from("devices")
				.select("locked")
				.eq("id", this.identity.id)
				.single();

			if (!error && data) {
				this.identity.lastSuccessfulCheck = Date.now();
				this._saveIdentity();
				return Boolean(data.locked);
			}
		} catch (e) {
			// FAIL-OPEN: can't reach server.
			// If our last check was recent we trust it; otherwise allow (fail-open).
			return false;
		}
		return false;
	}

	// --- Start the whole thing ---
	async start() {
		this._maybeShowFirstRunNotice();
		await this.register();
		await this.heartbeat(); // immediate first beat
		this.heartbeatTimer = setInterval(() => this.heartbeat(), HEARTBEAT_MS);
	}

	stop() {
		if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
		this.heartbeatTimer = null;
	}
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = { CloudSync };
}