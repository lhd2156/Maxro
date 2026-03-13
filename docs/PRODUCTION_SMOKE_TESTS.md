# Production Smoke Tests

Run this checklist after a production build or before deployment.

## Auth

1. Register with Maxro email/password.
2. Confirm required-field validation appears without stretching the auth card badly.
3. Confirm wrong login credentials turn email and password borders red.
4. Log in successfully with Maxro auth.
5. Log out and log back in.

## Dashboard

1. Confirm the page does not ghost-scroll at full size.
2. Confirm Spotify and Recent PR cards stay aligned.
3. Confirm dashboard cards still fit on laptop-height screens.

## Workouts

1. Add a weighted workout.
2. Add a bodyweight workout like Push Up.
3. Confirm PR generation for both weighted and bodyweight movements.
4. Delete the workout that created a PR.
5. Confirm PRs clear from dashboard and PR page.

## Nutrition

1. Search for a generic food and add it.
2. Expand a result and confirm macros and micros are visible without breaking the modal.
3. Change pages and use the in-app page picker.
4. Remove an entry and confirm totals update.

## Water

1. Use quick add in plus mode.
2. Use quick add in minus mode.
3. Use custom water input in both plus and minus mode.
4. Confirm full-size layout does not scroll when content fits.
5. Confirm compact-height layout scrolls to Today's Log.

## Analytics

1. Confirm full-size desktop fits without page scroll on laptop-height screens.
2. Confirm half-width or compact layout stacks and scrolls correctly.
3. Confirm all four chart cards align evenly.

## Spotify

1. Connect Spotify.
2. Confirm current or paused playback state loads.
3. Play or pause from the Spotify app and confirm Maxro syncs.
4. Use save/remove and confirm the state updates.
5. Disconnect and confirm the disconnected card keeps the same footprint.

## AI Help

1. Open Ask a Question.
2. Send a typed question.
3. Send a quick suggestion chip.
4. Upload an image.
5. Use the microphone in a supported Chromium browser.
6. Ask a non-fitness question and confirm the assistant redirects back to fitness or Maxro help.

## Config and Security

1. Confirm no real secrets are committed in tracked source files.
2. Confirm frontend bundle does not contain Google or Spotify client IDs.
3. Confirm backend starts only when required env values are present.