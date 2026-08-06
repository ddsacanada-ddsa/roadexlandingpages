# Roadex landing page

The public landing page for Roadex: capture real cars, identify them with AI, collect cards, and build a personal garage.

## Public website

GitHub Pages publishes the root of the `main` branch at:

**https://ddsacanada-ddsa.github.io/roadexlandingpages/**

The repository intentionally uses branch-based Pages publishing and does not require a custom GitHub Actions workflow.

## Connect the waitlist

Open `script.js` and set `WAITLIST_URL` to the public Google Form URL:

```js
const WAITLIST_URL = "https://forms.gle/example";
```

The button will change from **Waitlist opening soon** to **Join the Roadex waitlist** and open the form in a new tab.
