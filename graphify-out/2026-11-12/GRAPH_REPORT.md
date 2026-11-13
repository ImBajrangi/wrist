# Graph Report - app  (2026-11-12)

## Corpus Check
- 38 files · ~18,750 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 265 nodes · 541 edges · 13 communities (12 shown, 1 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.55)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `65db9f60`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- match.js
- translate
- HomePage.vue
- package.json
- main.js
- Stage.js
- LeaderboardDrawer.vue
- bots.js
- audio/index.js
- rewards.js
- sw.js
- App.vue

## God Nodes (most connected - your core abstractions)
1. `translate()` - 24 edges
2. `store` - 21 edges
3. `createStage()` - 13 edges
4. `launchBotMatch()` - 10 edges
5. `trackEvent()` - 9 edges
6. `selectBot()` - 8 edges
7. `getDictionary()` - 8 edges
8. `pick()` - 8 edges
9. `buildDisplayName()` - 8 edges
10. `startLobbyMatchmaking()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `createMatchEngine()` --indirect_call--> `stop()`  [INFERRED]
  src/game/engine.js → src/audio/index.js
- `t()` --calls--> `translate()`  [EXTRACTED]
  src/pages/LoginPage.vue → src/i18n/index.js
- `startLobbyMatchmaking()` --calls--> `trackEvent()`  [EXTRACTED]
  src/game/match.js → src/analytics/index.js
- `toggle()` --calls--> `toggleMute()`  [EXTRACTED]
  src/components/SoundButton.vue → src/audio/index.js
- `t()` --calls--> `translate()`  [EXTRACTED]
  src/components/LeaderboardDrawer.vue → src/i18n/index.js

## Import Cycles
- None detected.

## Communities (13 total, 1 thin omitted)

### Community 0 - "match.js"
Cohesion: 0.08
Nodes (33): createBotSimulation(), createMatchEngine(), GAME_STATE, TIMINGS, createInputController(), IGNORED_TAGS, isAcceptedGameplayEvent(), clearLobbyWait() (+25 more)

### Community 1 - "translate"
Cohesion: 0.08
Nodes (39): trackEvent(), t(), alias, fallback, nickname, props, text, locale (+31 more)

### Community 2 - "HomePage.vue"
Cohesion: 0.15
Nodes (20): getDictionary(), buildDisplayName(), isValidNickname(), pick(), sanitizeNickname(), hasError, locale, nickname (+12 more)

### Community 3 - "package.json"
Cohesion: 0.08
Nodes (23): dependencies, three, vue, vue-router, description, devDependencies, vite, @vitejs/plugin-vue (+15 more)

### Community 4 - "main.js"
Cohesion: 0.17
Nodes (16): analyticsEvents, clearAnalyticsEvents(), setMatchRouter(), dictionaries, params, router, decrypt(), encrypt() (+8 more)

### Community 6 - "Stage.js"
Cohesion: 0.13
Nodes (27): buildLoftedArmData(), createArenaBackdrop(), createBoxingRing(), createLogoPlaque(), createSculptedArm(), evaluateClaspCurve(), makeRadialGlowTexture(), makeSkinTexture() (+19 more)

### Community 7 - "LeaderboardDrawer.vue"
Cohesion: 0.22
Nodes (10): displayRows, buildDisplayRows(), computeStreakToBeat(), DEFAULT_LEADERBOARD, fetchLeaderboard(), maybeUpdateLeaderboard(), apiRequest(), isUserInGame() (+2 more)

### Community 8 - "bots.js"
Cohesion: 0.21
Nodes (13): ALLOWED_ACCESSORIES, BOT_CURSOR_PRESS_MS, BOT_ROSTER, DIFFICULTY_RANGES, FALLOFF_CAP_MULT, FALLOFF_FACTOR, FALLOFF_START_MS, getBaseIntervalForLevel() (+5 more)

### Community 9 - "audio/index.js"
Cohesion: 0.24
Nodes (12): _activeSources, _buffers, getContext(), getMasterGain(), loadAudio(), play(), stop(), stopAll() (+4 more)

### Community 10 - "rewards.js"
Cohesion: 0.31
Nodes (7): ACCESSORIES, grantMilestoneReward(), isMilestoneStreak(), recordWinAndReward(), REWARD_MILESTONES, TATTOO_CATALOG, TATTOO_SLOT_SIZES

### Community 13 - "App.vue"
Cohesion: 0.14
Nodes (12): bootTimer, glHost, route, showMiniCrest, vignetteClass, email, errorMsg, loading (+4 more)

## Knowledge Gaps
- **88 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+83 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `store` connect `translate` to `match.js`, `HomePage.vue`, `main.js`, `Stage.js`, `LeaderboardDrawer.vue`, `audio/index.js`, `App.vue`?**
  _High betweenness centrality (0.160) - this node is a cross-community bridge._
- **Why does `translate()` connect `translate` to `match.js`, `HomePage.vue`, `LeaderboardDrawer.vue`, `audio/index.js`, `App.vue`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `selectBot()` connect `bots.js` to `match.js`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _88 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `match.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07862679955703211 - nodes in this community are weakly interconnected._
- **Should `translate` be split into smaller, more focused modules?**
  _Cohesion score 0.07755102040816327 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._