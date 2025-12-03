# IPB Canteen Menu JSON Uploader

## Overview

This workflow logs into the IPB online system, extracts canteen menus from the weekly calendar using the HTML structure, converts them into a strict JSON format, and uploads them to the Cantina Amber admin panel.

---

## Step 1 – Open IPB canteen page

1. Open a new tab and go to:
   `https://online.ipb.pt/ui/#/site/sas/senhas`.

2. If the page asks for login:
   - Enter the email address provided by the user, **or**
   - Use the Google popup autofill if it appears.
3. **Stop and wait for user confirmation** before proceeding past the login step.

---

## Step 2 – Navigate to weekly canteen calendar

1. After login, navigate to the **weekly canteen calendar**.
2. Select the week that matches the **day and time shown in the user’s screenshot**.
3. Do **not** rely on the screenshot contents for the menu; always use the live HTML calendar data.

---

## Step 3 – Inspect the calendar HTML

1. Ensure you are on the correct **week view**.
2. Inspect the **HTML of the calendar table**:
   - Include dinner entries even if they are **not visible in the UI** but present in the DOM (image-soup / off-screen nodes etc.).
3. Ignore any values like `0/1` that appear next to dish names.
4. Ignore any layout or presentation from CSS or images and **only trust raw text nodes** in the HTML.

---

## Step 4 – Map abbreviations to categories

For each day and each meal period (**lunch** and **dinner**), extract menu entries using the right-side abbreviations:

- `[SC]` → `"Sugestão do Chefe"`
- `[DM]` → `"Dieta Mediterrânica"`
- `[AL]` → `"Alternativa"`
- `[Vg]` → `"Vegetariana"`
- `[S]` → `"Sopa"`

For each day:

- Extract the **date** in the format `DD/MM/YYYY`.
- For both **lunch** and **dinner**, map each abbreviation to its full category name and capture the **full dish name**.
- If a category is missing for a given meal, leave its string as an **empty string** (`""`).

---

## Step 5 – JSON structure

Create a **JSON array** where each element has **exactly** this shape and key order:

```json
[
  {
    "date": "DD/MM/YYYY",
    "lunch": {
      "Sugestão do Chefe": "",
      "Dieta Mediterrânica": "",
      "Alternativa": "",
      "Vegetariana": "",
      "Sopa": ""
    },
    "dinner": {
      "Sugestão do Chefe": "",
      "Dieta Mediterrânica": "",
      "Alternativa": "",
      "Vegetariana": "",
      "Sopa": ""
    }
  }
]
```

Rules:

- Keep the **keys in exactly this order** for both `lunch` and `dinner`.
- Fill each string with the **full dish name** corresponding to its category for that meal.
- If a category is not present for that meal, keep the value as `""`.

---

## Step 6 – Upload JSON to Cantina Amber

1. When the JSON is ready, open a new tab and go to:
   `https://cantina-amber.vercel.app/admin/menu?upload-variant=json`.

2. Click the **“Upload JSON”** button.
3. Paste the generated JSON array into the text area.
4. Click the **“Upload menus”** button.

---

## Step 7 – Confirm upload and summarize

1. Confirm that the request **completed successfully**:

   - Look for a clear **success message**, or
   - Check that there is **no error response**.

2. Then provide a short summary of what was uploaded, including:
   - The **date range** covered (first and last `date` in the JSON).
   - The **total number of days/entries** uploaded.

> Note: If you only see some of the menus after upload, this can be because some menus you added are for **past dates**. The interface typically only shows **today’s and future** menus, so older entries may not be visible even though they were uploaded.
