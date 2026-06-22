export async function fetchGitHubUser(username) {
    const response = await fetch(`https://api.github.com/users/${username}`);
  
    if (!response.ok) {
      throw new Error("User not found");
    }
  
    const data = await response.json();
    return data;
  }
  
  export async function fetchGitHubRepos(username) {
    const response = await fetch(`https://api.github.com/users/${username}/repos`);
  
    if (!response.ok) {
      throw new Error("Could not fetch repos");
    }
  
    const data = await response.json();
    return data;
  }
  
  export function countLanguages(repos) {
    return repos.reduce(function(counts, repo) {
      const lang = repo.language;
  
      if (counts[lang]) {
        counts[lang] = counts[lang] + 1;
      } else {
        counts[lang] = 1;
      }
  
      return counts;
    }, {});
  }

  // Fetch README for a single repo — returns null if missing or on failure
  export async function fetchRepoReadme(owner, repoName) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/readme`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (!data.content) {
        return null;
      }

      // GitHub returns Base64 with newlines — strip them before decoding
      const base64 = data.content.replace(/\n/g, '');
      return atob(base64);
    } catch {
      return null;
    }
  }

  // Attach README content to top repos (limited to avoid rate limits)
  export async function enrichReposWithReadmes(repos, limit = 15) {
    const topRepos = [...repos]
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, limit);

    const enriched = await Promise.all(
      topRepos.map(async (repo) => {
        const owner = repo.owner?.login;
        if (!owner) {
          return { ...repo, readmeContent: null };
        }

        const readmeContent = await fetchRepoReadme(owner, repo.name);
        return { ...repo, readmeContent };
      })
    );

    return enriched;
  }