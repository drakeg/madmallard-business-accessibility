# Community, wiki and sponsorship launch checklist

**Current status:** repository is private. Discussions is enabled and a welcome topic is available at [Discussion #14](https://github.com/drakeg/madmallard-business-accessibility/discussions/14). A real GitHub Wiki cannot be enabled under the current private-repository plan (GitHub Free supports wikis for public repositories; GitHub Pro supports private wikis). No GitHub Sponsors listing was detected for `drakeg` at setup time, so no broken sponsor button is published.

## When the owner decides to make the repository public

1. Perform a **separate public-release review**: inspect Git history for credentials and customer reports, confirm attribution/third-party license obligations, choose and commit a real open-source license if desired, and review production configuration/security posture. Do not change visibility automatically.
2. Change GitHub repository visibility only with the owner's explicit approval. Under **Settings → General → Features**, enable **Wikis**. Keep wiki write access limited to collaborators by default.
3. Initialize the Wiki from the versioned pages in [`docs/wiki/`](wiki/). Clone the Wiki repository `https://github.com/drakeg/madmallard-business-accessibility.wiki.git` once the wiki feature becomes available and is initialized, copy `docs/wiki/*.md` into it, then commit and push. These files intentionally remain in the main code repository for code review and maintenance before publication. Do not overwrite an existing Wiki without reviewing its pages.
4. Revisit moderation, Discussions welcome topic, pinned posts and public read/write policies after visibility changes. Public users will be able to see discussions; use GitHub Issues for reproducible bugs.

## Discussions

- [Welcome discussion](https://github.com/drakeg/madmallard-business-accessibility/discussions/14) is published.
- GitHub's default categories exist: **Announcements**, **General**, **Ideas**, **Polls**, **Q&A**, and **Show and tell**. Use Announcements for releases, Q&A for setup, Ideas for SMB time-saving features, and Issues for defects.
- Never copy private customer or testing data into public discussions.

## Sponsorships

GitHub Sponsors is **account-level**, not just a per-repository switch. The maintainer must enroll `drakeg`, create payout and tax details, configure 2FA, publish a sponsored-developer profile and tiers, and meet GitHub's review requirements. See [GitHub's personal Sponsors setup guide](https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/setting-up-github-sponsors-for-your-personal-account).

Only after `https://github.com/sponsors/drakeg` is verified as a usable sponsor destination, copy [`docs/community/FUNDING.yml.example`](community/FUNDING.yml.example) to `.github/FUNDING.yml` in a reviewable PR. GitHub uses this file to display the repository Sponsor button. Do **not** assume a GitHub profile URL is a working Sponsors profile, promise financial benefits, or invent donation tiers. A sponsor button is supplemental to the project's SMB service/pilot business model, not evidence of customer demand.
