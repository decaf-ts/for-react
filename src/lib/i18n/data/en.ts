/**
 * @description English translation resources.
 * @summary Default English message tree for validation errors, CRUD operations
 * and common component labels, consumed by the i18n loader.
 * @memberOf module:for-react
 */
export const en: Record<string, unknown> = {
  "errors": {
    "required": "This field is required.",
    "pattern": "The provided value does not match the pattern.",
    "min": "The minimum value for this field is {0}.",
    "max": "The maximum value for this field is {0}.",
    "minlength": "The minimum length for this field is {0}.",
    "maxlength": "The maximum length for this field is {0}.",
    "equal": "This field must be equal to {0}",
    "default": "This value appears to be invalid.",
    "unique": "Field {0} must be unique",
    "password": "Password must be at least 8 characters and contain one of number, lower and upper case letters, and special character (@$!%*?&_-.,)",
    "email": "This field must be a valid email address.",
    "url": "This field must be a valid URL.",
    "number": "This field must be a valid number.",
    "integer": "This field must be a valid integer.",
    "digits": "This field must contain only digits.",
    "alphanum": "This field must be alphanumeric.",
    "file": "Only {0} files are allowed",
    "equals": "This field must be equal to field {0}",
    "different": "This field must be different from field {0}",
    "lessThan": "This field must be less than field {0}",
    "lessThanOrEqual": "This field must be less than or equal to field {0}",
    "greaterThan": "This field must be greater than field {0}",
    "greaterThanOrEqual": "This field must be greater than or equal to field {0}",
    "form_control": "Controlador do formulário não encontrado para {0}.",
    "not_found": "No records found with <span class=\"text-bold\">{0}: {1} in {2}</span>.",
    "empty_options": "No options available for field {0}. Fix the data source."
  },
  "operations": {
    "read": {
      "success": "Successfully read item with {0} {1}.",
      "error": "Error reading item with {0} {1}."
    },
    "create": {
      "success": "Successfully created item with {0} {1}.",
      "error": "Error creating item with {0} {1}."
    },
    "update": {
      "success": "Successfully updated item with {0} {1}.",
      "error": "Error updating item with {0} {1}."
    },
    "delete": {
      "success": "Successfully deleted item with {0} {1}.",
      "error": "Error deleting item with {0} {1}."
    }
  },
  "cron_selector": {
    "title": "Cron Selector",
    "current_cron": "Current cron:"
  },
  "date": {
    "weekdays": {
      "sunday": "Sunday",
      "monday": "Monday",
      "tuesday": "Tuesday",
      "wednesday": "Wednesday",
      "thursday": "Thursday",
      "friday": "Friday",
      "saturday": "Saturday"
    },
    "months": {
      "january": "January",
      "february": "February",
      "march": "March",
      "april": "April",
      "may": "May",
      "june": "June",
      "july": "July",
      "august": "August",
      "september": "September",
      "october": "October",
      "november": "November",
      "december": "December"
    }
  },
  "dashboard-builder": {
    "title": "Dashboard Builder",
    "create": "Create",
    "read": "Read",
    "update": "Update",
    "delete": "Delete",
    "saved": "Dashboard saved."
  },
  "dashboard": {
    "demo": {
      "stats": "Stat",
      "list": "List",
      "note": "Note"
    }
  },
  "calendar": {
    "title": "Calendar",
    "label": "Calendar",
    "previous_month": "Previous month",
    "next_month": "Next month",
    "today": "Today",
    "day_with_events": "{0}: {1}",
    "event": {
      "site_visit": "Site visit",
      "inspection": "Health and safety inspection",
      "delivery": "Material delivery",
      "training": "Toolbox training",
      "audit": "Quality audit",
      "handover": "Project handover"
    }
  },
  "kanban": {
    "title": "Kanban",
    "intro": "A controlled Kanban board ported from the Angular entry point. Tasks, columns, WIP limits and state stay with the host; the board only renders them and emits requested moves, reorders and selections.",
    "demo_label": "Kanban demo controls",
    "label": "Sprint board",
    "add_card": "Add card",
    "reset": "Reset",
    "clear": "Clear tasks",
    "read_only": "Read only",
    "disabled": "Disabled",
    "loading": "Loading",
    "error": "Error",
    "filter": "Only Ada",
    "no_event": "No board event yet.",
    "empty": "No tasks",
    "loading_message": "Loading tasks...",
    "error_message": "Unable to load tasks.",
    "retry": "Retry",
    "keyboard_help": "Press Space to pick up a card, use the arrow keys to move it, press Enter to select or drop, press Enter again to edit, press E to edit, and Escape to cancel or clear the selection.",
    "columns": {
      "todo": "To do",
      "doing": "In progress",
      "review": "Review",
      "done": "Done"
    }
  },
  "scrum": {
    "title": "Scrum",
    "intro": "Backlog and sprint views composed from the Kanban board. The host owns tasks, sprints, selection and assignment; the components only render and emit typed requests.",
    "demo_label": "Scrum demo controls",
    "reset": "Reset",
    "search": "Search",
    "search_placeholder": "Filter tasks",
    "read_only": "Read only",
    "loading": "Loading",
    "error": "Error",
    "no_event": "No scrum event yet.",
    "sprint_selection": "Sprint selection",
    "sprint_label": "Sprint",
    "sprint_placeholder": "Select a sprint",
    "backlog": "Backlog",
    "backlog_tasks": "Backlog tasks",
    "sprint_board": "Sprint board",
    "sprint_board_tasks": "Sprint board tasks",
    "select_sprint_hint": "Select a sprint to open its board.",
    "assign_to_sprint": "Assign to sprint",
    "assign_placeholder": "Select a sprint",
    "empty_backlog": "No backlog tasks",
    "loading_backlog": "Loading backlog...",
    "error_backlog": "Unable to load the backlog.",
    "empty_sprint": "No tasks in this sprint",
    "loading_sprint": "Loading sprint...",
    "error_sprint": "Unable to load the sprint.",
    "retry": "Retry",
    "error_message": "The sprint could not be loaded. Try again.",
    "sprints": {
      "sprint_1": "Sprint 1 — Now",
      "sprint_2": "Sprint 2 — Next",
      "sprint_3": "Sprint 3 — Later"
    },
    "tasks": {
      "t1": "Refine backlog ordering rules",
      "t2": "Document sprint scoping contract",
      "t3": "Triage sprint assignment feedback",
      "t4": "Align filter predicates with search",
      "t5": "Compose sprint board from Kanban",
      "t6": "Reuse Kanban drag/drop mechanics",
      "t7": "Sprint selector keyboard flow",
      "t8": "Typed sprint assignment events",
      "t9": "Velocity follow-on spike",
      "t10": "Backlog grooming session"
    },
    "columns": {
      "todo": "To do",
      "doing": "In progress",
      "review": "Review",
      "done": "Done"
    }
  },

  "storyboard": {
    "title": "Storyboard tutorial",
    "intro": "Start the guided flow. The tutorial dims the page, highlights the current step target, and stays in sync with the tour controls.",
    "start": "Start tutorial",
    "next": "Next step",
    "previous": "Previous step",
    "abort": "Abort",
    "end": "End tutorial",
    "close": "Close tutorial",
    "scenario_label": "Tutorial scenario",
    "scenario_feature_tour": "Feature page tour",
    "scenario_placements": "Placement values",
    "scenario_timeout": "Timeout completion",
    "scenario_click": "Click completion",
    "scenario_input": "Input completion",
    "scenario_keys": "Keyboard completion",
    "scenario_labels": "Custom labels and panel",
    "status_label": "Status",
    "status_idle": "Idle",
    "status_running": "Running",
    "status_completed": "Completed",
    "status_aborted": "Aborted",
    "step_label": "Active step",
    "step_none": "No step is active.",
    "event_label": "Last event",
    "event_none": "No tutorial event yet.",
    "event_started": "Tutorial started: {id}",
    "event_stepped": "Now on step: {step}",
    "event_finished": "Tutorial finished: {status}",
    "scenario_name": "Feature page tour",
    "welcome_title": "Welcome to the feature page",
    "welcome_content": "This tour is driven by the storyboard tutorial engine. Follow the highlighted control and move on with Next step.",
    "name_title": "Type your name",
    "name_content": "The highlighted field is the focus of this step. Fill it in and continue with Next step.",
    "confirm_title": "Confirm the value",
    "confirm_content": "Click the highlighted confirmation button, then continue with Next step.",
    "finish_title": "Tour complete",
    "finish_content": "You exercised the scripted tutorial, its focus overlay, and its completion rules.",
    "demo_title": "Tutorial playground",
    "demo_intro": "This form is the tour target. Its values stay on the page after the tour ends.",
    "name_label": "Your name",
    "name_placeholder": "At least three characters",
    "notes_label": "Release notes",
    "notes_placeholder": "Draft the next release notes here",
    "confirm": "Confirm",
    "confirmed": "Value confirmed: {value}",
    "placements_name": "Placement values",
    "placement_top_title": "Top placement",
    "placement_top_content": "The instruction bubble is anchored above the playground.",
    "placement_bottom_title": "Bottom placement",
    "placement_bottom_content": "The instruction bubble is anchored below the name field.",
    "placement_left_title": "Left placement",
    "placement_left_content": "The instruction bubble is anchored to the left of the confirm button.",
    "placement_right_title": "Right placement",
    "placement_right_content": "The instruction bubble is anchored to the right of the notes area.",
    "placement_center_title": "Center placement",
    "placement_center_content": "The instruction bubble is centered over the tutorial.",
    "timeout_name": "Timeout completion",
    "timeout_title": "Auto-advance",
    "timeout_content": "This step advances automatically when its timeout elapses.",
    "click_name": "Click completion",
    "click_title": "Confirm with a click",
    "click_content": "Click the highlighted confirmation button to complete the step.",
    "click_done_title": "Done",
    "click_done_content": "The declared interaction completed the previous step.",
    "input_name": "Input completion",
    "input_title": "Type your name",
    "input_content": "Type at least three characters into the highlighted name field.",
    "input_done_content": "The typed input completed the previous step.",
    "keys_name": "Keyboard completion",
    "keys_title": "Confirm with the keyboard",
    "keys_content": "Focus the name field and press Enter or Tab.",
    "keys_done_content": "The key press completed the previous step.",
    "labels_name": "Custom labels and panel",
    "labels_previous": "Back",
    "labels_next": "Continue",
    "labels_finish": "Got it",
    "labels_abort": "Quit tour",
    "labels_close": "Dismiss",
    "labels_progress": "Step {current} of {total}",
    "labels_title": "Custom labels",
    "labels_content": "This step renders through a custom panel message strategy with custom labels."
  },
  "component": {
    "fieldset": {
      "add": "Add another",
      "update": "Update item",
      "cancel": "Cancel",
      "not_unique": "The value entered already exists. Value {0}",
      "max_items": "You can create up to {0} items.",
      "max_items_reached": "Maximum of {0} items reached."
    },
    "list": {
      "pagination": "Showing page <span class=\"text-bold\">{0} of {1}</span>",
      "loading": "Loading data",
      "search": {
        "title": "Not data found for search",
        "subtitle": "You searched for: <ion-text color=\"primary\" class=\"display-block ion-text-center text-bold\">{0}</ion-text>",
        "button": "Clear search"
      },
      "empty": {
        "title": "No data found",
        "subtitle": "",
        "button": "Create"
      }
    },
    "list_item": {
      "actions": "Actions",
      "operations": {
        "read": "Read",
        "create": "Create",
        "update": "Update",
        "delete": "Delete"
      }
    },
    "empty_state": {
      "title": "No data found",
      "button_create": "Create",
      "search": {
        "title": "Not data found for search",
        "subtitle": "You searched for: <ion-text color=\"primary\" class=\"display-block ion-text-center text-bold\">{0}</ion-text>",
        "button": "Clear search"
      }
    },
    "pagination": {
      "resume": "Showing page <span class=\"text-bold\">{0} of {1}</span>"
    },
    "filter": {
      "title": "Filter",
      "type": "Type value",
      "select": "Filter selection",
      "step1": "Select an index",
      "step2": "Select a condition",
      "step3": "Type a value",
      "no_suggestions": "No suggestions",
      "sort": "Sort by"
    },
    "stepped_form": {
      "next": "Next",
      "previous": "Previous",
      "submit": "Submit",
      "cancel": "Cancel"
    },
    "file_upload": {
      "drag_file": "Drag and drop your image here",
      "buttons": {
        "select": "Select File",
        "preview": "Preview",
        "clear": "Clear"
      },
      "selection": "{0} file(s) selected with success",
      "selection_error": "{0} file(s) failed validation and will not be uploaded.",
      "errors": {
        "not_allowed": "File {0} is not allowed.",
        "max_size": "The maximum allowed file size is {0} MB"
      }
    },
    "cron_selector": {
      "frequency": "Medication frequency",
      "close": "Close",
      "close_schedule": "Close schedule",
      "modes": {
        "daily": "Daily",
        "hourly": "Interval",
        "weekly": "Weekly"
      },
      "dose": "Dose {0}",
      "remove": "Remove",
      "add_ocurrence": "Add another ocurrence",
      "repeat_every": "Repeat every",
      "start_date_time": "Start date and time",
      "hours": "hours",
      "time": "Time",
      "generated_schedule": "Generated schedule:",
      "enable_schedule": "Enable schedule",
      "disable_schedule": "Disable schedule",
      "weekdays": {
        "sunday": "Sunday",
        "monday": "Monday",
        "tuesday": "Tuesday",
        "wednesday": "Wednesday",
        "thursday": "Thursday",
        "friday": "Friday",
        "saturday": "Saturday"
      }
    },
    "cron_builder": {
      "quick_presets": "Quick presets",
      "every": "Every",
      "minute": "minutes",
      "hour": "hour",
      "daily_at": "Daily at",
      "weekdays_preset": "Weekdays",
      "all": "All",
      "monthly": "Monthly",
      "copy": "Copy",
      "fields": {
        "minute": "Minute",
        "hour": "Hour",
        "day": "Day",
        "month": "Month",
        "weekday": "Weekday"
      },
      "enable_step": "Every can only be enabled for values greater than or equal to 1. */0 is invalid.",
      "copied": "Copied!",
      "add_another": "Add another",
      "step_value": {
        "hour": "Step value in hours",
        "minute": "Step value in minutes"
      },
      "increment": "Increase value",
      "decrement": "Decrease value"
    },
    "dashboard": {
      "palette": "Components",
      "emptyPalette": "No dashboard components registered.",
      "deleteTitle": "Remove component",
      "deleteConfirm": "Are you sure you want to remove this component?",
      "cancel": "Cancel",
      "delete": "Delete",
      "save": "Save Dashboard",
      "tile_position": "Column {col}, row {row}, {cols} by {rows} cells",
      "tile_keyboard_hint": "Use the arrow keys to move; hold Shift with the arrow keys to resize"
    }
  }
};
