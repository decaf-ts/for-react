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
