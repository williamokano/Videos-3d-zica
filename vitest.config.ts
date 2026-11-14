import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Agents work on copies of the repository in .claude/worktrees: their tests are theirs.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});
