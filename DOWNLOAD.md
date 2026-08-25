# How to download the Planning Table widget (v1.3.11)

Do **not** use branch URLs that contain `cursor/stacked-column-headers-abca`.
GitHub and many browsers treat `cursor` as the branch name and then look for a file
`stacked-column-headers-abca/PlanningTable.json`, which returns **404**.

Use **commit** links below (no slash in the ref). Right-click → **Save link as**.

Pinned commit: `0aaac5c815e8dbf9f69019b964b2ffc6a1890e5a`

## Files for SAC Custom Widgets

1. Widget JSON  
   https://raw.githubusercontent.com/parvatijambagi/analytics-cloud-datasphere-community-content/0aaac5c815e8dbf9f69019b964b2ffc6a1890e5a/PlanningTable.json

2. Resource ZIP (`main-v13.js` + `styling-v13.js` at the zip root)  
   https://raw.githubusercontent.com/parvatijambagi/analytics-cloud-datasphere-community-content/0aaac5c815e8dbf9f69019b964b2ffc6a1890e5a/PlanningTable-resources.zip

jsDelivr mirrors (same commit):

- https://cdn.jsdelivr.net/gh/parvatijambagi/analytics-cloud-datasphere-community-content@0aaac5c815e8dbf9f69019b964b2ffc6a1890e5a/PlanningTable.json
- https://cdn.jsdelivr.net/gh/parvatijambagi/analytics-cloud-datasphere-community-content@0aaac5c815e8dbf9f69019b964b2ffc6a1890e5a/PlanningTable-resources.zip

## If the ZIP still will not save

Download these two text files, then zip them **at the zip root** (no folder):

- https://raw.githubusercontent.com/parvatijambagi/analytics-cloud-datasphere-community-content/0aaac5c815e8dbf9f69019b964b2ffc6a1890e5a/main-v13.js
- https://raw.githubusercontent.com/parvatijambagi/analytics-cloud-datasphere-community-content/0aaac5c815e8dbf9f69019b964b2ffc6a1890e5a/styling-v13.js

```bash
zip PlanningTable-resources.zip main-v13.js styling-v13.js
```

## Whole-repo archive (always works on GitHub)

https://github.com/parvatijambagi/analytics-cloud-datasphere-community-content/archive/0aaac5c815e8dbf9f69019b964b2ffc6a1890e5a.zip

Then take `PlanningTable.json` and `PlanningTable-resources.zip` from the extracted folder.

## SAC install

In SAC go to **Custom Widgets** → **Add** → upload **JSON and ZIP as files from your computer**.
Do not paste a GitHub URL into SAC. The JSON uses `/main-v13.js` and `/styling-v13.js`,
which SAC resolves from the ZIP. Uploading JSON alone causes a **404** for those scripts.

Delete any older **Planning Table** widget first. After install the toolbar must show **v1.3.11**.
