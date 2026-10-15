# Home and Journey visual refresh

Home now presents a dark navy/gold arena, the current leading player, actual player/team/monthly point totals, carried balance versus the previous month, top-three player cards, team standings, and links to Journey and Monitoring.

Journey retains the existing 0–30+ milestones, rewards and rank thresholds. It adds a curved SVG path, rank navigation, player name search and selection, next-rank progress, a locate-player action, and compact avatar groups. Existing milestone/player dialogs remain in use. Reduced-motion preferences are respected.

New renderers are installed by `installArenaVisuals()` after the existing application functions are defined. Styles are scoped in `arena.css`. No Firestore writes, Rules, authentication changes, or point calculation changes are introduced. Names/labels in the new UI are escaped; avatar URLs allow only HTTP(S).

Editorial hero/title/team headings still use siteContent. Home's statistic cards now use actual data rather than the manually configured promotional statistics. If player/team reads are not ready, counts and leaders are not fabricated. Existing Firestore permission failures still need resolution independently.

## Verification

`node --test tests/*.test.cjs`: 18 tests, including existing Monitoring tests and new rank boundary/progress/escaping tests.

A Chromium smoke test with fixture data verified Home actions, 31 Journey milestones, player search/selection, next-rank progress, navigation to Monitoring, mobile document width and unavailable-data states. Desktop (1440px) and mobile (390px) screenshots were inspected. The isolated test replaced Firebase calls and omitted external font/icon/WebGL dependencies; it does not prove production database access.

## Backup

Before this change, all repository code was preserved in branch `backup/before-home-journey-2026-10-13`, pointing to commit `0b97cfa0a37f18a4000b6adc0a44fcd9eacfb0ba`, including Monitoring. This is a code backup, not an export of Firestore records. Revert the visual-refresh commit for a focused rollback without discarding later changes.
