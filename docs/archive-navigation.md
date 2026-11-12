# Archive navigation

**Mostrar anteriores** reveals finished festivals and completed calendar weeks;
**Ocultar anteriores** returns to the default festival/day selection. Archive
links carry `anteriores=1` across festival changes. No schedule data is removed.

Weeks run Monday–Sunday in each festival's timezone. The current week stays
whole. Known screening runtimes keep their originating day/week and festival
available through the exact end, including overnight and daylight-saving changes.
An unpublished duration has no inferred end: archive visibility conservatively
keeps its local date until the following midnight. This is a navigation boundary,
not a claimed screening end; its timeline remains an unknown-duration marker.

Valid `festival`, `dia`, and `funcion` selections keep the selected archive
navigation visible even when other archives are hidden. Turning the archive off
clears that explicit selection. An all-past catalogue shows an empty state with
access to the archive instead of a default archived agenda.

`archive-navigation.js` owns visibility only. `festivalFor` and `initialDay` own
the default current/next selection ([issue #12 / PR #27](https://github.com/fruizrob/vivaelcine/pull/27)). No separate calendar view or
persistent browser storage is introduced.
