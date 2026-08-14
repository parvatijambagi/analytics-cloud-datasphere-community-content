# Power BI + Power Automate: email users by Export, Import, and Duty Avoided

Use this when a **Condition** or **Filter array** in Power Automate fails after you add Export, Import, and Duty Avoided.

The flow does not fail because Outlook cannot send mail. It fails because those three columns are compared with the wrong type, a null value, or an invalid Filter Query.

## Recommended flow

1. Recurrence (or Power BI data-driven alert).
2. **Power BI – Run a query against a dataset** (filter in DAX first).
3. Parse the first table from the query result.
4. **Apply to each** row.
5. **Send an email (V2)** to the user on that row.

Filter in DAX when you can. Use **Filter array** only for leftover row logic. Avoid a **Condition** action that throws on null or text-vs-number.

## 1. Filter in the Power BI query (preferred)

Replace table and measure names with yours. Spaces in names must be quoted.

```dax
EVALUATE
VAR Result =
    SUMMARIZECOLUMNS(
        'Users'[Email],
        'Users'[UserName],
        "Export", [Export],
        "Import", [Import],
        "DutyAvoided", [Duty Avoided]
    )
RETURN
FILTER(
    Result,
    NOT ISBLANK ( [Export] )
        && NOT ISBLANK ( [Import] )
        && NOT ISBLANK ( [DutyAvoided] )
        && [DutyAvoided] > 0
)
```

If Export / Import are flags (Yes/No or 1/0):

```dax
EVALUATE
FILTER(
    SUMMARIZECOLUMNS(
        'Users'[Email],
        "Export", [Export],
        "Import", [Import],
        "DutyAvoided", [Duty Avoided]
    ),
    [Export] = 1
        && [Import] = 1
        && [DutyAvoided] > 0
)
```

If they are text labels:

```dax
EVALUATE
FILTER(
    SUMMARIZECOLUMNS(
        'Users'[Email],
        "Export", [Export],
        "Import", [Import],
        "DutyAvoided", [Duty Avoided]
    ),
    [Export] = "Yes"
        && [Import] = "Yes"
        && [DutyAvoided] > 0
)
```

After **Run a query against a dataset**, the rows are usually here:

`first(body('Run_a_query_against_a_dataset')?['results'])?['tables'][0]?['rows']`

## 2. Filter array (if you cannot change the DAX)

Do **not** put this in a **Filter Query** box (OData). Put it in **Filter array** → **Edit in advanced mode**.

Duty Avoided often comes back as a string (`"1250.50"`) or as `null`. A Condition then errors with *Cannot convert the value to type* or *InvalidTemplate*.

```
@and(
  not(empty(string(item()?['Export']))),
  not(empty(string(item()?['Import']))),
  greater(
    float(replace(string(coalesce(item()?['DutyAvoided'], item()?['Duty Avoided'], 0)), ',', '')),
    0
  )
)
```

If Export and Import must both be Yes (or true / 1):

```
@and(
  or(
    equals(toLower(string(item()?['Export'])), 'yes'),
    equals(string(item()?['Export']), '1'),
    equals(item()?['Export'], true)
  ),
  or(
    equals(toLower(string(item()?['Import'])), 'yes'),
    equals(string(item()?['Import']), '1'),
    equals(item()?['Import'], true)
  ),
  greater(
    float(replace(string(coalesce(item()?['DutyAvoided'], item()?['Duty Avoided'], 0)), ',', '')),
    0
  )
)
```

Power BI row keys are often `[Email]`, `[Export]`, `[Duty Avoided]` (brackets in the JSON name). If `item()?['Email']` is empty, use:

```
item()?['[Email]']
item()?['[Export]']
item()?['[Import]']
item()?['[Duty Avoided]']
```

## 3. Condition action (only if you must)

A Condition **Fails** (red) when an input is null or not a number. A Condition that is simply false shows **Succeeded** with result **No**.

Use expressions on each side, not raw dynamic content:

| Check | Left expression | Operator | Right |
| --- | --- | --- | --- |
| Export present | `string(coalesce(items('Apply_to_each')?['Export'], items('Apply_to_each')?['[Export]'], ''))` | is not equal to | *(empty)* |
| Import present | `string(coalesce(items('Apply_to_each')?['Import'], items('Apply_to_each')?['[Import]'], ''))` | is not equal to | *(empty)* |
| Duty Avoided > 0 | `float(replace(string(coalesce(items('Apply_to_each')?['DutyAvoided'], items('Apply_to_each')?['Duty Avoided'], items('Apply_to_each')?['[Duty Avoided]'], 0)), ',', ''))` | is greater than | `0` |

Set the Condition to **AND**.

If Export/Import must equal Yes, change those two rows to **is equal to** `Yes` and wrap with `toLower(...)`.

## 4. Why the condition usually fails

1. **Duty Avoided is text or null.** `greater(null, 0)` and `greater('1,250', 0)` throw. Coalesce to `0`, strip commas, then `float()`.
2. **Column name mismatch.** `Duty Avoided` vs `DutyAvoided` vs `[Duty Avoided]`. Check the run output JSON for the exact key.
3. **OData Filter Query.** `Duty Avoided gt 0` is invalid because of the space. That query belongs in DAX or Filter array, not OData.
4. **Comparing the three fields to each other** (Export equals Import equals Duty Avoided). You need three separate checks combined with AND.
5. **Boolean vs text.** Power BI `TRUE()` can arrive as `true`, `"true"`, or `1`. Use the `or(...)` pattern above.

## 5. Send the email

Inside **Apply to each** on the filtered rows:

- **To:** `items('Apply_to_each')?['Email']` or `items('Apply_to_each')?['[Email]']`
- **Subject:** Export / Import / Duty Avoided update
- **Body:** include the three values with `string(...)` so blanks do not break HTML.

Skip the send when email is empty:

```
@not(empty(trim(string(coalesce(items('Apply_to_each')?['Email'], items('Apply_to_each')?['[Email]'], '')))))
```

## 6. Quick check from a failed run

Open the failed Condition / Filter array → **Inputs**.

- If Duty Avoided is `null` or `""`, the float conversion without `coalesce` is the bug.
- If the field is missing, rename the key to match the JSON.
- If the action is Filter Query, move the logic to DAX or Filter array as above.
