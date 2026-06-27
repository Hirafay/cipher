/*
 * obfuscate-license.js
 * --------------------
 * Runs during the build (after prebuild-src is created, before
 * electron-builder packages it). Obfuscates ONLY the license/lock
 * logic so a casual fork can't trivially read or delete the kill switch.
 *
 * The repo source stays readable; only the SHIPPED build is scrambled.
 *
 * Usage: node obfuscate-license.js
 */

const fs = require("fs");
const path = require("path");

let JavaScriptObfuscator;
try {
	JavaScriptObfuscator = require("javascript-obfuscator");
} catch (e) {
	console.error("[obfuscate] javascript-obfuscator not installed. Run: npm install --save-dev javascript-obfuscator");
	process.exit(1);
}

// Files to obfuscate (the protection-critical ones only).
const TARGETS = [
	"prebuild-src/classes/cloudSync.class.js"
];

const OPTIONS = {
	compact: true,
	controlFlowFlattening: true,
	controlFlowFlatteningThreshold: 0.75,
	deadCodeInjection: true,
	deadCodeInjectionThreshold: 0.4,
	stringArray: true,
	stringArrayThreshold: 0.8,
	stringArrayEncoding: ["base64"],
	splitStrings: true,
	splitStringsChunkLength: 8,
	identifierNamesGenerator: "hexadecimal",
	transformObjectKeys: true,
	numbersToExpressions: true,
	simplify: true,
	// Keep it runnable in Electron's renderer (Node + DOM)
	target: "node",
	disableConsoleOutput: false
};

let obfuscatedCount = 0;

TARGETS.forEach(rel => {
	const filePath = path.resolve(__dirname, rel);

	if (!fs.existsSync(filePath)) {
		console.warn(`[obfuscate] skip (not found): ${rel}`);
		return;
	}

	const source = fs.readFileSync(filePath, "utf-8");
	const result = JavaScriptObfuscator.obfuscate(source, OPTIONS);
	fs.writeFileSync(filePath, result.getObfuscatedCode());
	console.log(`[obfuscate] done: ${rel}`);
	obfuscatedCount++;
});

console.log(`[obfuscate] obfuscated ${obfuscatedCount} file(s).`);