/**
 * Backend for the Trading Simulator
 *
 * This Cloudflare Pages Function handles two API routes:
 * 1. GET /api/data
 *    - Fetches the raw CSV data for the trading simulation.
 * 2. GET /api/leaderboard
 *    - Retrieves the current leaderboard from Cloudflare KV.
 * 3. POST /api/leaderboard
 *    - Adds a new score to the leaderboard in Cloudflare KV.
 */

// Helper function to return a JSON response
const jsonResponse = (data, status = 200) => {
  return new Response(JSON.stringify(data, null, 2), {
    status: status,
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
  });
};

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // --- Route for serving the game's CSV data ---
  if (url.pathname === '/api/data') {
    try {
      // The data file is located in the `public` directory and can be fetched
      // by creating a new request to its public URL.
      const dataUrl = new URL('/XAUUSD_M15.csv', url.origin);
      const dataResponse = await fetch(dataUrl.toString());

      if (!dataResponse.ok) {
        return new Response('Data file not found.', { status: 404 });
      }

      // Return the CSV data directly.
      return new Response(dataResponse.body, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Cache-Control': 's-maxage=600', // Cache for 10 minutes
        },
      });
    } catch (e) {
      console.error('Error fetching data:', e);
      return new Response('Error fetching data.', { status: 500 });
    }
  }

  // --- Route for leaderboard actions ---
  if (url.pathname === '/api/leaderboard') {
    // The KV namespace must be bound to 'DB' in the Pages project settings.
    if (!env.DB) {
      return jsonResponse({ error: 'KV database not configured.' }, 500);
    }

    const LEADERBOARD_KEY = 'leaderboard';

    // Handle GET request to fetch the leaderboard
    if (request.method === 'GET') {
      try {
        let data = [];
        const storedData = await env.DB.get(LEADERBOARD_KEY, 'json');
        if (Array.isArray(storedData)) {
            data = storedData;
        }
        return jsonResponse(data);
      } catch (e) {
        console.error('Error fetching leaderboard, returning empty array:', e);
        // If KV data is corrupted or not valid JSON, gracefully return an empty array.
        return jsonResponse([]);
      }
    }

    // Handle POST request to add a score
    if (request.method === 'POST') {
      try {
        const newEntry = await request.json();

        // Basic validation
        if (typeof newEntry.name !== 'string' || typeof newEntry.score !== 'number') {
          return jsonResponse({ error: 'Invalid score format. Requires {name: string, score: number}.' }, 400);
        }

        // Sanitize name: trim, limit length, and provide a default.
        const name = newEntry.name.trim().slice(0, 25) || 'Anonymous';
        const score = newEntry.score;
        const timestamp = new Date().toISOString();

        // Get current leaderboard, or initialize if it doesn't exist.
        let leaderboard = [];
        try {
            const storedData = await env.DB.get(LEADERBOARD_KEY, 'json');
            // Ensure the retrieved data is an array before using array methods.
            if (Array.isArray(storedData)) {
                leaderboard = storedData;
            } else if (storedData) {
                // Log if we get something unexpected that's not an array
                console.error('Leaderboard data in KV is not an array, resetting to empty.');
            }
        } catch (jsonError) {
            console.error('Failed to parse leaderboard JSON from KV, treating as empty.', jsonError);
            // If JSON parsing fails, we proceed with an empty leaderboard.
        }

        // Add the new entry
        leaderboard.push({ name, score, timestamp });

        // Sort by score (descending) and then by time (ascending) for tie-breaking.
        leaderboard.sort((a, b) => {
          const scoreA = a.score || 0;
          const scoreB = b.score || 0;
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
          // Use getTime() for reliable numeric comparison, default to 0 if timestamp is missing/invalid.
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeA - timeB; // Earlier times (smaller timestamps) come first
        });

        // Keep only the top 100 scores to prevent the list from growing indefinitely.
        const trimmedLeaderboard = leaderboard.slice(0, 100);

        // Save back to KV. The `put` method takes a string.
        await env.DB.put(LEADERBOARD_KEY, JSON.stringify(trimmedLeaderboard));

        return jsonResponse({ success: true, leaderboard: trimmedLeaderboard });

      } catch (e) {
        console.error('Error saving score:', e);
        return jsonResponse({ error: 'Could not save score.' }, 500);
      }
    }

    // Handle other methods with a 405 Method Not Allowed response.
    return jsonResponse({ error: `Method ${request.method} not allowed.` }, 405);
  }

  // For any other path, return a 404 Not Found response.
  return new Response('Not Found', { status: 404 });
}
