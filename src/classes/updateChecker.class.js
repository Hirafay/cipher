const https = require("https");
const url = require("url");

class UpdateChecker {
	constructor() {
		this.checkForUpdates();
	}

	checkForUpdates() {
		// Check Hirafay/cipher releases on GitHub
		const apiUrl = "https://api.github.com/repos/Hirafay/cipher/releases/latest";
		
		https.get(apiUrl, {
			headers: {
				'User-Agent': 'Cipher-UpdateChecker'
			}
		}, (res) => {
			let data = '';
			res.on('data', chunk => {
				data += chunk;
			});
			res.on('end', () => {
				try {
					const release = JSON.parse(data);
					const latestVersion = release.tag_name.replace('v', '');
					const currentVersion = require("electron").app.getVersion();
					
					// Compare versions (simple semver comparison)
					if (this.isNewerVersion(latestVersion, currentVersion)) {
						this.showUpdateModal(latestVersion, release.html_url, release.assets);
					}
				} catch (e) {
					console.error("Update check error:", e);
				}
			});
		}).on('error', (e) => {
			console.error("Update check failed:", e);
		});
	}

	isNewerVersion(latest, current) {
		const latestParts = latest.split('.').map(Number);
		const currentParts = current.split('.').map(Number);
		
		for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
			const latestPart = latestParts[i] || 0;
			const currentPart = currentParts[i] || 0;
			
			if (latestPart > currentPart) return true;
			if (latestPart < currentPart) return false;
		}
		
		return false;
	}

	showUpdateModal(latestVersion, releaseUrl, assets) {
		// Find the Windows .exe download URL
		let downloadUrl = null;
		if (assets && Array.isArray(assets)) {
			const exeAsset = assets.find(a => a.name.endsWith('.exe'));
			if (exeAsset) {
				downloadUrl = exeAsset.browser_download_url;
			}
		}

		new Modal({
			type: "custom",
			title: "New version available",
			html: `
				<h3>Cipher v${latestVersion} is now available</h3>
				<p>You are currently running v${require("electron").app.getVersion()}</p>
				<p>Download the latest version from <a href="${releaseUrl}" style="color: #00ff88; text-decoration: underline;">GitHub releases</a></p>
				<br>
				<p><strong>Changelog:</strong> Check the release page for details on what's new.</p>
			`,
			buttons: [
				{
					label: "Install Now",
					action: () => {
						if (downloadUrl) {
							require("electron").shell.openExternal(downloadUrl);
						} else {
							require("electron").shell.openExternal(releaseUrl);
						}
					}
				},
				{
					label: "Later",
					action: () => {
						// Modal closes automatically
					}
				}
			]
		});
	}
}

if (typeof module !== 'undefined' && module.exports) {
	module.exports = {UpdateChecker};
}