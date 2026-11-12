// One page, two tools: the studio, where an episode is watched in its location, and the showcase (?vitrine=...),
// where assets are looked at outside any episode.
if (new URLSearchParams(window.location.search).has('vitrine')) await import('./showcase');
else await import('./main');

export {};
