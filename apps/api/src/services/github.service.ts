export async function fetchGithubUserData(username: string, token: string) {
    const headers = {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json"
    };

    try {
        // Fetch user public repositories (up to 100)
        const reposRes = await fetch(
            `https://api.github.com/users/${username}/repos?per_page=100&sort=pushed`,
            { headers }
        );
        const repos = await reposRes.json();

        // Fetch user public events (up to 100)
        const eventsRes = await fetch(
            `https://api.github.com/users/${username}/events/public?per_page=100`,
            { headers }
        );
        const events = await eventsRes.json();

        return {
            repos: Array.isArray(repos) ? repos : [],
            events: Array.isArray(events) ? events : [],
        };
    } catch (error) {
        console.error(`Failed to fetch GitHub data for ${username}:`, error);
        return { repos: [], events: [] };
    }
}
