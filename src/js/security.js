import { runGame, getIntegrityToken } from './main.js';

// --- Security Configuration ---
const AUTHORIZED_DOMAINS = ['soyaplayablead.25min.co', 'localhost'];
// This hash is pre-computed from the getIntegrityToken() function in main.js.
// If the data structure in getIntegrityToken is changed, this hash must be re-computed.
const EXPECTED_INTEGRITY_HASH = -1518733333;

// --- Hashing function for integrity check ---
function simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

// --- Security Checks ---
function runSecurityChecks() {
    // 1. Protocol Check: Block if run from a local file.
    if (window.location.protocol === 'file:') {
        console.error("Security Error: Cannot be run from local file system.");
        return false;
    }

    // 2. Domain Check: Ensure the hostname is authorized.
    if (!AUTHORIZED_DOMAINS.includes(window.location.hostname)) {
        console.error(`Security Error: Domain ${window.location.hostname} is not authorized.`);
        return false;
    }

    // 3. iFrame Check: Prevent embedding on other sites.
    try {
        if (window.top !== window.self) {
            console.error("Security Error: Framing is not permitted.");
            // Immediately try to break out. The check will still fail, preventing game load.
            window.top.location.href = window.self.location.href;
            return false;
        }
    } catch (e) {
        // This catch block is important for cross-origin iframes
        console.error("Security Error: Cross-origin framing detected.");
        return false;
    }

    // 4. Integrity Check: Verify that the game code has not been tampered with.
    const currentIntegrityHash = simpleHash(getIntegrityToken());
    if (currentIntegrityHash !== EXPECTED_INTEGRITY_HASH) {
        console.error("Security Error: Code integrity check failed.");
        console.error(`Expected: ${EXPECTED_INTEGRITY_HASH}, Got: ${currentIntegrityHash}`);
        return false;
    }

    // 5. Basic Anti-Debugging
    // This is a simple check. More advanced techniques exist but can be brittle.
    const startTime = new Date().getTime();
    debugger;
    const endTime = new Date().getTime();
    if (endTime - startTime > 500) { // Check if debugger paused execution
        console.error("Security Error: Debugger detected.");
        return false;
    }


    return true;
}

// --- Main Execution Block ---
function execute() {
    if (runSecurityChecks()) {
        console.log("All security checks passed. Initializing game.");
        runGame();
    } else {
        console.error("One or more security checks failed. Blocking execution.");
        // Redirect to the official page or show an error.
        // A redirect is more effective at preventing the user from seeing the broken page.
        window.location.href = "https://www.google.com"; // Redirect to a neutral site
    }
}

// Run the security loader.
execute();
