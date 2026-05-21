## TODO - Subject selection UX (no Ctrl/Command)

### Step 1
Confirm current implementation: multi-subject selector in `attendance-system/frontend/src/App.jsx` uses MUI `TextField select` with `multiple: true` and shows helper text “Hold Ctrl/Command…”.

### Step 2 (approved)
Implement **A)** click-to-toggle **chips add/remove** for selecting multiple subjects in `AdminStudents` → Register New Student.

### Step 3
Update UI text/help to remove Ctrl/Command instruction.

### Step 4
Verify build/lint (optional) and manually check subject selection + registration POST still sends `subject_ids` correctly.

