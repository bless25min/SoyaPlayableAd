(function() {
    'use strict';

    // --- Site-Lock (Domain Check) ---
    // This ensures the game only runs on your authorized domains.
    const authorizedDomains = ['soyaplayablead.25min.co', 'localhost'];
    const currentHostname = window.location.hostname;

    let isAuthorized = false;
    for (let i = 0; i < authorizedDomains.length; i++) {
        if (currentHostname === authorizedDomains[i] || currentHostname.endsWith('.' + authorizedDomains[i])) {
            isAuthorized = true;
            break;
        }
    }

    if (!isAuthorized) {
        console.error("This game is not authorized to run on this domain.");
        // Replace the entire page content with a warning message.
        document.body.innerHTML = `
            <div style="font-family: sans-serif; text-align: center; padding: 50px; background-color: #111; color: #eee; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <h1 style="color: #e74c3c;">Unauthorized Use</h1>
                <p>This game may only be played on the official website.</p>
                <p>Please visit <a style="color: #3498db;" href="https://soyaplayablead.25min.co">the official site</a> to play.</p>
            </div>`;

        // Throw an error to halt any further script execution.
        throw new Error("Unauthorized domain: " + currentHostname);
    }

    // --- Anti-iFrame (Frame Busting) ---
    // This prevents other sites from embedding your game in an iframe.
    try {
        if (window.top !== window.self) {
            console.log("Framing detected. Attempting to break out.");
            window.top.location.href = window.self.location.href;
        }
    } catch (e) {
        console.error("Could not break out of iframe. Blocking content.");
        document.body.innerHTML = ''; // Blank the page
        throw new Error("Framing is not permitted.");
    }

    // --- Anti-Debugging ---
    // This technique makes it annoying for someone to debug your code.
    function detectDevTools() {
        const threshold = 160;
        const startTime = new Date().getTime();

        debugger;

        const endTime = new Date().getTime();

        if (endTime - startTime > threshold) {
            console.log("Developer tools detected. Interfering with execution.");
            // Action to take when dev tools are open.
            // For example, you could stop the game loop, corrupt game state, or simply reload.
            // To avoid disrupting your own development, this is a simple, non-destructive alert for now.
            // In a production build, you might enable a more aggressive action.
            // alert('Debugging is not allowed.');
        }
    }

    // Check for dev tools periodically.
    // setInterval(detectDevTools, 3000);

    // --- Disable Context Menu ---
    // This prevents users from right-clicking to see "View Source" or "Inspect".
    window.addEventListener('contextmenu', function (e) {
        console.log("Context menu blocked.");
        e.preventDefault();
    }, false);

})();
