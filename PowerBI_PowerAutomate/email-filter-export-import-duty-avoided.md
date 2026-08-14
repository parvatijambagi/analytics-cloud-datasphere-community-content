# Power Automate: email users filtered by Export, Import, and Duty Avoided

Build this entirely in **Power Automate**. Do not put Export / Import / Duty Avoided into a Condition as raw dynamic content. That is what makes the action fail (red), usually with *InvalidTemplate* or *Cannot convert the value to type Decimal/Boolean*.

## Flow to create

```
Recurrence
  → Power BI: Run a query against a dataset
  → Filter array          ← put Export, Import, Duty Avoided here
  → Apply to each (filtered rows)
       → Send an email (V2)
```

If your data is already in Excel / SharePoint (from a Power BI export), skip the Power BI action and start from **List rows present in a table**, then still use **Filter array** — not the OData **Filter Query** box.

---

## Step 1 — Get the rows

**Power BI connector**

1. Action: **Run a query against a dataset**
2. Workspace / Dataset: your report dataset
3. Query text (returns every user row; filtering happens in the next action):

```dax
EVALUATE
SUMMARIZECOLUMNS(
    'Users'[Email],
    "Export", [Export],
    "Import", [Import],
    "DutyAvoided", [Duty Avoided]
)
```

Change `'Users'[Email]` and the measure names to match your model.

**Excel / SharePoint instead**

1. Action: **List rows present in a table**
2. Leave **Filter Query** empty
3. In the next step, filter with **Filter array**

---

## Step 2 — Filter array (this replaces the failing Condition)

Add **Filter array**.

- **From** (Power BI):

```
first(body('Run_a_query_against_a_dataset')?['results'])?['tables'][0]?['rows']
```

If your action name differs, rename `Run_a_query_against_a_dataset` to the name shown on the action (spaces become underscores).

- **From** (Excel / SharePoint): `body('List_rows_present_in_a_table')?['value']`

Open **Edit in advanced mode** and paste **one** of these.

**A. Export and Import are Yes / 1 / true, and Duty Avoided must be > 0**

```
@and(
  or(
    equals(toLower(string(item()?['Export'])), 'yes'),
    equals(toLower(string(item()?['[Export]'])), 'yes'),
    equals(string(item()?['Export']), '1'),
    equals(item()?['Export'], true)
  ),
  or(
    equals(toLower(string(item()?['Import'])), 'yes'),
    equals(toLower(string(item()?['[Import]'])), 'yes'),
    equals(string(item()?['Import']), '1'),
    equals(item()?['Import'], true)
  ),
  greater(
    float(replace(string(coalesce(item()?['DutyAvoided'], item()?['Duty Avoided'], item()?['[Duty Avoided]'], 0)), ',', '')),
    0
  )
)
```

**B. You only need all three fields to have a value, and Duty Avoided > 0**

```
@and(
  not(empty(string(coalesce(item()?['Export'], item()?['[Export]'], '')))),
  not(empty(string(coalesce(item()?['Import'], item()?['[Import]'], '')))),
  greater(
    float(replace(string(coalesce(item()?['DutyAvoided'], item()?['Duty Avoided'], item()?['[Duty Avoided]'], 0)), ',', '')),
    0
  )
)
```

Power BI often names columns `[Export]` and `[Duty Avoided]` (brackets included). The expressions above try both names.

---

## Step 3 — Apply to each + send email

1. **Apply to each** → From: `body('Filter_array')`
2. Inside it, **Send an email (V2)** (Office 365 Outlook) or **Send an email** (Mail).

**To** — click **Expression**, paste:

```
trim(string(coalesce(items('Apply_to_each')?['Email'], items('Apply_to_each')?['[Email]'], '')))
```

**Subject**

```
Export / Import / Duty Avoided
```

**Body** (expression examples you can insert):

```
string(coalesce(items('Apply_to_each')?['Export'], items('Apply_to_each')?['[Export]'], ''))
string(coalesce(items('Apply_to_each')?['Import'], items('Apply_to_each')?['[Import]'], ''))
string(coalesce(items('Apply_to_each')?['DutyAvoided'], items('Apply_to_each')?['Duty Avoided'], items('Apply_to_each')?['[Duty Avoided]'], ''))
```

Optional: wrap **Send an email** in a Condition that only checks email is present (this one will not fail):

```
not(empty(trim(string(coalesce(items('Apply_to_each')?['Email'], items('Apply_to_each')?['[Email]'], '')))))
```

is equal to `true`. Put Send email on the **If yes** side.

---

## If you still want a Condition action

A Condition that is **red** failed on conversion. A Condition that is **green** with **No** simply did not match.

Do not add:

- Export  is equal to  Import  is equal to  Duty Avoided
- Duty Avoided  is greater than  0  using the dynamic content chip

Use **three rows**, group = **AND**, and expressions on the left:

| Left (Expression) | Operator | Right |
| --- | --- | --- |
| `toLower(string(coalesce(items('Apply_to_each')?['Export'], items('Apply_to_each')?['[Export]'], '')))` | is equal to | `yes` |
| `toLower(string(coalesce(items('Apply_to_each')?['Import'], items('Apply_to_each')?['[Import]'], '')))` | is equal to | `yes` |
| `float(replace(string(coalesce(items('Apply_to_each')?['DutyAvoided'], items('Apply_to_each')?['Duty Avoided'], items('Apply_to_each')?['[Duty Avoided]'], 0)), ',', ''))` | is greater than | `0` |

If Export/Import are numbers `1` instead of Yes, change the first two operators to **is equal to** `1` and use:

```
string(coalesce(items('Apply_to_each')?['Export'], items('Apply_to_each')?['[Export]'], ''))
```

---

## Why your current condition fails in Power Automate

| What you entered | What Power Automate does |
| --- | --- |
| Dynamic content **Duty Avoided** greater than 0 | Value is often `null` or `"1,234.00"` → action **Fails** |
| Filter Query: `Duty Avoided gt 0` | Space in the name is invalid OData → action **Fails** |
| One Condition: Export equals Import equals Duty Avoided | Compares the three columns to each other, not to Yes / > 0 |
| Column `Duty Avoided` in expressions | Power BI output key is often `[Duty Avoided]` — lookup misses, then null |

## Check the failed run

1. Open the run → the red Condition / List rows action.
2. **Inputs**: copy the JSON for one row.
3. Confirm the exact keys (`Export` vs `[Export]`, `Duty Avoided` vs `DutyAvoided`).
4. If Duty Avoided is `null` or `""`, the `coalesce(..., 0)` expressions above stop the failure.
