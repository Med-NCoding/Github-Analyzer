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