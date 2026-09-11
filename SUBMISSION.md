# Submission checklist

Fill in the blanks below once deployed (§6 of the README), then send this file (or paste its
contents) to the recruiter alongside the repo link.

1. **GitHub repository link:** `<paste after you push this repo to your own account>`
2. **Live frontend URL:** `<paste after Vercel/Netlify deploy>`
3. **Live backend API URL:** `<paste after Render/Railway deploy>` (health check: `<url>/api/health`)
4. **Test login credentials for all roles:** see README §7 — `Password@123` for all four demo
   accounts (`admin@erpcrm.test`, `sales@erpcrm.test`, `warehouse@erpcrm.test`,
   `accounts@erpcrm.test`)
5. **Postman collection:** [`docs/postman_collection.json`](./docs/postman_collection.json)
6. **README with setup and deployment instructions:** [`README.md`](./README.md)
7. **Short explanation of architecture:** README §3
8. **Known limitations or incomplete parts:** README §8

---

### Suggested 2–3 minute screen recording script (if not deploying, per the brief's fallback option)

1. `docker compose up --build` (or the manual `npm run dev` in both folders) — show it starting.
2. Log in as **Sales**, create a customer, add a follow-up note.
3. Log in as **Warehouse** (or stay Admin), create a product, record a stock-IN movement, show
   the movement log.
4. Back as **Sales**, create a sales challan for that customer with 2+ products, save as **Draft**.
5. Open the draft, click **Confirm** — point out the stock number dropping on the product page.
6. Try to confirm/create another challan requesting more units than are in stock — show the
   HTTP 400 "insufficient stock" response (visible as a toast in the UI, or via Postman).
7. Cancel a confirmed challan — show the stock being restored.
8. Quickly show the Postman collection running the same flow via the API directly.
