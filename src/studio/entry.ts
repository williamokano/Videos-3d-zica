// One page, three tools: the studio, where an episode is watched in its location, and two showcases, where
// characters (?vitrine=personagens) and the other assets (?vitrine=assets) are looked at outside any episode.
const vitrine = new URLSearchParams(window.location.search).get('vitrine');
if (vitrine === null) await import('./main');
else if (vitrine === 'personagens') await import('./showcase');
else await import('./assets-showcase');

export {};
