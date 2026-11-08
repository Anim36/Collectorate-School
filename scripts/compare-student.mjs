/**
 * Compares a rendered student portal page against the Figma frame measurements.
 *
 * Usage: node scripts/compare-student.mjs <route> <width>
 *   e.g. node scripts/compare-student.mjs /student/dashboard 1440
 *
 * The Figma values come from the cached canvas metadata for the step 9
 * student frames:
 *   "Student / Dashboard"  (2:3613 / 2:3718 / 2:3805)
 *   "Student / My Profile" (2:3887 / 2:3979 / 2:4053)
 *   "Student / Attendance" (2:4129 / 2:4305 / 2:4463)
 *   "Student / Performance" (2:4620 / 2:4728 / 2:4818)
 *   "Student / Result" (2:4907 / 2:5012 / 2:5099)
 *   "Student / Fee Payment" (2:5179 / 2:5282 / 2:5367)
 *   "Student / Payment method" (2:5755 / 2:5872 / 2:5971)
 *   "Student / Payment receipt" (2:6060 / 2:6169 / 2:6260)
 *
 * The Figma values come from the cached canvas metadata for the step 11
 * admin frames:
 *   "Admin / Dashboard"            (2:9503 / 2:9700 / 2:9858)
 *   "Admin / Users"                (2:10002 / 2:10180 / 2:10319)
 *   "Admin / CSV import"           (2:10972 / 2:11161 / 2:11311)
 *   "Admin / Classes and Subjects" (2:11448 / 2:11634 / 2:11781)
 *
 * The Figma frames are full-page mockups, so the bottom tab bar sits at the
 * bottom of the artwork. The shell pins it to the viewport instead, so this
 * script checks the bar's height and its inner layout, not its absolute
 * offset from the top of the page.
 */

const expected = {
  "/student/dashboard": {
    1440: {
      content: { top: 108, height: 1320 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "welcome", top: 149, height: 189 },
        { label: "metrics", top: 362, height: 166 },
        { label: "chart", top: 552, height: 345 },
        { label: "noticesHeading", top: 921, height: 35 },
        { label: "notices", top: 980, height: 308 },
      ],
    },
    768: {
      content: { top: 108, height: 1406 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "welcome", top: 149, height: 189 },
        { label: "metrics", top: 362, height: 212 },
        { label: "chart", top: 598, height: 345 },
        { label: "noticesHeading", top: 967, height: 35 },
        { label: "notices", top: 1026, height: 348 },
      ],
    },
    375: {
      content: { top: 88, height: 1618 },
      blocks: [
        { label: "greeting", top: 24, height: 111 },
        { label: "welcome", top: 159, height: 270 },
        { label: "metrics", top: 453, height: 155 },
        { label: "metrics2", top: 632, height: 155 },
        { label: "chart", top: 811, height: 345 },
        { label: "noticesHeading", top: 1180, height: 35 },
        { label: "notices", top: 1239, height: 355 },
      ],
    },
  },
  "/student/profile": {
    1440: {
      content: { top: 108, height: 951 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "identity", top: 149, height: 256 },
        { label: "details", top: 429, height: 76 },
        { label: "details2", top: 529, height: 76 },
        { label: "details3", top: 629, height: 76 },
        { label: "details4", top: 729, height: 76 },
        { label: "edit", top: 829, height: 47 },
        { label: "note", top: 900, height: 19 },
      ],
    },
    768: {
      content: { top: 108, height: 951 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "identity", top: 149, height: 256 },
        { label: "details", top: 429, height: 76 },
        { label: "details2", top: 529, height: 76 },
        { label: "details3", top: 629, height: 76 },
        { label: "details4", top: 729, height: 76 },
        { label: "edit", top: 829, height: 47 },
        { label: "note", top: 900, height: 19 },
      ],
    },
    375: {
      content: { top: 88, height: 1349 },
      blocks: [
        { label: "greeting", top: 24, height: 88 },
        { label: "identity", top: 136, height: 256 },
        { label: "details", top: 416, height: 76 },
        { label: "details2", top: 516, height: 76 },
        { label: "details3", top: 616, height: 76 },
        { label: "details4", top: 716, height: 76 },
        { label: "details5", top: 816, height: 76 },
        { label: "details6", top: 916, height: 76 },
        { label: "details7", top: 1016, height: 76 },
        { label: "details8", top: 1116, height: 76 },
        { label: "edit", top: 1216, height: 47 },
        { label: "note", top: 1287, height: 38 },
      ],
    },
  },
  "/student/attendance": {
    1440: {
      content: { top: 108, height: 1063 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "month", top: 149, height: 76 },
        { label: "metrics", top: 249, height: 166 },
        { label: "calendar", top: 439, height: 549 },
        { label: "legend", top: 1012, height: 19 },
      ],
    },
    768: {
      content: { top: 108, height: 1082 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "month", top: 149, height: 76 },
        { label: "metrics", top: 249, height: 185 },
        { label: "calendar", top: 458, height: 549 },
        { label: "legend", top: 1031, height: 19 },
      ],
    },
    375: {
      content: { top: 88, height: 1085 },
      blocks: [
        { label: "greeting", top: 24, height: 88 },
        { label: "month", top: 136, height: 76 },
        { label: "metrics", top: 236, height: 155 },
        { label: "metrics2", top: 415, height: 174 },
        { label: "calendar", top: 613, height: 405 },
        { label: "legend", top: 1042, height: 19 },
      ],
    },
  },
  "/student/performance": {
    1440: {
      content: { top: 108, height: 1589 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "metrics", top: 149, height: 166 },
        { label: "chart", top: 339, height: 345 },
        { label: "subjectsHeading", top: 708, height: 35 },
        { label: "subjects", top: 767, height: 506 },
        { label: "strength", top: 1297, height: 118 },
        { label: "growth", top: 1439, height: 118 },
      ],
    },
    768: {
      content: { top: 108, height: 1589 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "metrics", top: 149, height: 166 },
        { label: "chart", top: 339, height: 345 },
        { label: "subjectsHeading", top: 708, height: 35 },
        { label: "subjects", top: 767, height: 506 },
        { label: "strength", top: 1297, height: 118 },
        { label: "growth", top: 1439, height: 118 },
      ],
    },
    375: {
      content: { top: 88, height: 1782 },
      blocks: [
        { label: "greeting", top: 24, height: 88 },
        { label: "metrics", top: 136, height: 155 },
        { label: "metrics2", top: 315, height: 155 },
        { label: "chart", top: 494, height: 345 },
        { label: "subjectsHeading", top: 863, height: 35 },
        { label: "subjects", top: 922, height: 506 },
        { label: "strength", top: 1452, height: 141 },
        { label: "growth", top: 1617, height: 141 },
      ],
    },
  },
  "/student/result": {
    1440: {
      content: { top: 108, height: 1131 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "exam", top: 149, height: 76 },
        { label: "table", top: 249, height: 608 },
        { label: "overall", top: 881, height: 147 },
        { label: "download", top: 1052, height: 47 },
      ],
    },
    768: {
      content: { top: 108, height: 1131 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "exam", top: 149, height: 76 },
        { label: "table", top: 249, height: 608 },
        { label: "overall", top: 881, height: 147 },
        { label: "download", top: 1052, height: 47 },
      ],
    },
    375: {
      content: { top: 88, height: 1506 },
      blocks: [
        { label: "greeting", top: 24, height: 88 },
        { label: "exam", top: 136, height: 76 },
        { label: "table", top: 236, height: 981 },
        { label: "overall", top: 1241, height: 170 },
        { label: "download", top: 1435, height: 47 },
      ],
    },
  },
  "/student/fees": {
    1440: {
      content: { top: 108, height: 1153 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "metrics", top: 149, height: 166 },
        { label: "dueHeading", top: 339, height: 35 },
        { label: "dueTable", top: 398, height: 248 },
        { label: "payNow", top: 670, height: 47 },
        { label: "historyHeading", top: 741, height: 35 },
        { label: "historyTable", top: 800, height: 248 },
        { label: "receipt", top: 1072, height: 49 },
      ],
    },
    768: {
      content: { top: 108, height: 1218 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "metrics", top: 149, height: 231 },
        { label: "dueHeading", top: 404, height: 35 },
        { label: "dueTable", top: 463, height: 248 },
        { label: "payNow", top: 735, height: 47 },
        { label: "historyHeading", top: 806, height: 35 },
        { label: "historyTable", top: 865, height: 248 },
        { label: "receipt", top: 1137, height: 49 },
      ],
    },
    375: {
      content: { top: 88, height: 1367 },
      blocks: [
        { label: "greeting", top: 24, height: 88 },
        { label: "metrics", top: 136, height: 174 },
        { label: "metrics2", top: 334, height: 155 },
        { label: "dueHeading", top: 513, height: 35 },
        { label: "dueTable", top: 572, height: 247 },
        { label: "payNow", top: 843, height: 47 },
        { label: "historyHeading", top: 914, height: 35 },
        { label: "historyTable", top: 973, height: 297 },
        { label: "receipt", top: 1294, height: 49 },
      ],
    },
  },
  "/student/fees/pay": {
    1440: {
      content: { top: 108, height: 1219 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "summary", top: 149, height: 213 },
        { label: "method", top: 386, height: 753 },
        { label: "back", top: 1164, height: 19, extra: true },
      ],
    },
    768: {
      content: { top: 108, height: 1219 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "summary", top: 149, height: 213 },
        { label: "method", top: 386, height: 753 },
        { label: "back", top: 1164, height: 19, extra: true },
      ],
    },
    375: {
      // The mobile frame stacks the summary rows and the method fields, so the
      // card is taller than the one of the tablet.
      content: { top: 88, height: 1334, optional: true },
      blocks: [
        { label: "greeting", top: 24, height: 88 },
        { label: "summary", top: 136, height: 278 },
        { label: "method", top: 438, height: 828 },
        { label: "back", top: 1290, height: 19, extra: true },
      ],
    },
  },
  "/student/fees/receipt/RCPT-2026-1042": {
    1440: {
      content: { top: 108, height: 1482, optional: true },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "metrics", top: 149, height: 166 },
        { label: "dueHeading", top: 339, height: 35 },
        { label: "dueTable", top: 398, height: 248 },
        { label: "historyHeading", top: 670, height: 35 },
        { label: "historyTable", top: 729, height: 248 },
        { label: "receipt", top: 1001, height: 49 },
        { label: "card", top: 1074, height: 376 },
        { label: "details", top: 1474, height: 400, extra: true },
        { label: "back", top: 1898, height: 19, extra: true },
      ],
    },
    768: {
      content: { top: 108, height: 1547, optional: true },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "metrics", top: 149, height: 231 },
        { label: "dueHeading", top: 404, height: 35 },
        { label: "dueTable", top: 463, height: 248 },
        { label: "historyHeading", top: 735, height: 35 },
        { label: "historyTable", top: 794, height: 248 },
        { label: "receipt", top: 1066, height: 49 },
        { label: "card", top: 1139, height: 376 },
        { label: "details", top: 1539, height: 400, extra: true },
        { label: "back", top: 1963, height: 19, extra: true },
      ],
    },
    375: {
      content: { top: 88, height: 1696, optional: true },
      blocks: [
        { label: "greeting", top: 24, height: 88 },
        { label: "metrics", top: 136, height: 174 },
        { label: "metrics2", top: 334, height: 155 },
        { label: "dueHeading", top: 513, height: 35 },
        { label: "dueTable", top: 572, height: 247 },
        { label: "historyHeading", top: 843, height: 35 },
        { label: "historyTable", top: 902, height: 297 },
        { label: "receipt", top: 1223, height: 49 },
        { label: "card", top: 1296, height: 376 },
        { label: "details", top: 1696, height: 500, extra: true },
        { label: "back", top: 2220, height: 19, extra: true },
      ],
    },
  },
  "/student/notice": {
    1440: {
      content: { top: 108, height: 739 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "table", top: 249, height: 308 },
        { label: "empty", top: 581, height: 124 },
      ],
    },
    768: {
      content: { top: 108, height: 780 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "table", top: 249, height: 348 },
        { label: "empty", top: 621, height: 124 },
      ],
    },
    375: {
      content: { top: 88, height: 1061 },
      blocks: [
        { label: "greeting", top: 24, height: 88 },
        { label: "filters", top: 136, height: 351 },
        { label: "table", top: 511, height: 355 },
        { label: "empty", top: 890, height: 147 },
      ],
    },
  },
  "/student/gallery": {
    1440: {
      content: { top: 108, height: 1477 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "album1", top: 149, height: 416 },
        { label: "album2", top: 589, height: 416 },
        { label: "album3", top: 1029, height: 416 },
      ],
    },
    768: {
      content: { top: 108, height: 1477 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "album1", top: 149, height: 416 },
        { label: "album2", top: 589, height: 416 },
        { label: "album3", top: 1029, height: 416 },
      ],
    },
    375: {
      content: { top: 88, height: 1216 },
      blocks: [
        { label: "greeting", top: 24, height: 88 },
        { label: "album1", top: 136, height: 336 },
        { label: "album2", top: 496, height: 336 },
        { label: "album3", top: 856, height: 336 },
      ],
    },
  },
  "/teacher/dashboard": {
    1440: {
      content: { top: 108, height: 1633 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "welcome", top: 149, height: 189 },
        { label: "metrics", top: 362, height: 126 },
        { label: "classesHeading", top: 512, height: 35 },
        { label: "classesTable", top: 571, height: 308 },
        { label: "attendanceHeading", top: 903, height: 35 },
        { label: "attendanceTable", top: 962, height: 308 },
        { label: "noticesHeading", top: 1294, height: 35 },
        { label: "noticesTable", top: 1353, height: 248 },
      ],
    },
    768: {
      content: { top: 108, height: 1633 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "welcome", top: 149, height: 189 },
        { label: "metrics", top: 362, height: 126 },
        { label: "classesHeading", top: 512, height: 35 },
        { label: "classesTable", top: 571, height: 308 },
        { label: "attendanceHeading", top: 903, height: 35 },
        { label: "attendanceTable", top: 962, height: 308 },
        { label: "noticesHeading", top: 1294, height: 35 },
        { label: "noticesTable", top: 1353, height: 248 },
      ],
    },
    375: {
      content: { top: 88, height: 1935 },
      blocks: [
        { label: "greeting", top: 24, height: 111 },
        { label: "welcome", top: 159, height: 212 },
        { label: "metrics", top: 395, height: 126 },
        { label: "metrics2", top: 545, height: 126 },
        { label: "classesHeading", top: 695, height: 35 },
        { label: "classesTable", top: 754, height: 429 },
        { label: "attendanceHeading", top: 1207, height: 35 },
        { label: "attendanceTable", top: 1266, height: 345 },
        { label: "noticesHeading", top: 1635, height: 35 },
        { label: "noticesTable", top: 1694, height: 217 },
      ],
    },
  },
  "/teacher/attendance": {
    1440: {
      content: { top: 108, height: 1044 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "tabs", top: 249, height: 23 },
        { label: "metrics", top: 296, height: 126 },
        { label: "markAll", top: 446, height: 49 },
        { label: "table", top: 519, height: 379 },
        { label: "save", top: 922, height: 47 },
        { label: "lastSaved", top: 993, height: 19 },
      ],
    },
    768: {
      content: { top: 108, height: 1044 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "tabs", top: 249, height: 23 },
        { label: "metrics", top: 296, height: 126 },
        { label: "markAll", top: 446, height: 49 },
        { label: "table", top: 519, height: 379 },
        { label: "save", top: 922, height: 47 },
        { label: "lastSaved", top: 993, height: 19 },
      ],
    },
    375: {
      content: { top: 88, height: 1570 },
      blocks: [
        { label: "greeting", top: 24, height: 111 },
        { label: "filters", top: 159, height: 260 },
        { label: "tabs", top: 443, height: 23 },
        { label: "metrics", top: 490, height: 126 },
        { label: "metrics2", top: 640, height: 126 },
        { label: "markAll", top: 790, height: 49 },
        { label: "table", top: 863, height: 569 },
        { label: "save", top: 1456, height: 47 },
        { label: "lastSaved", top: 1527, height: 19 },
      ],
    },
  },
  "/teacher/attendance-history": {
    1440: {
      content: { top: 108, height: 709 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "tabs", top: 249, height: 23 },
        { label: "table", top: 296, height: 308 },
        { label: "export", top: 628, height: 49 },
      ],
    },
    768: {
      content: { top: 122, height: 709 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "tabs", top: 249, height: 23 },
        { label: "table", top: 296, height: 308 },
        { label: "export", top: 628, height: 49 },
      ],
    },
    375: {
      content: { top: 88, height: 1008 },
      blocks: [
        { label: "greeting", top: 24, height: 111 },
        { label: "filters", top: 159, height: 168 },
        { label: "tabs", top: 351, height: 23 },
        { label: "table", top: 398, height: 513 },
        { label: "export", top: 935, height: 49 },
      ],
    },
  },
  "/teacher/results": {
    1440: {
      content: { top: 108, height: 1047 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "guidance", top: 249, height: 108 },
        { label: "table", top: 381, height: 518 },
        { label: "actions", top: 923, height: 49 },
        { label: "note", top: 996, height: 19 },
      ],
    },
    768: {
      content: { top: 108, height: 1047 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "guidance", top: 249, height: 108 },
        { label: "table", top: 381, height: 518 },
        { label: "actions", top: 923, height: 49 },
        { label: "note", top: 996, height: 19 },
      ],
    },
    375: {
      content: { top: 88, height: 1596 },
      blocks: [
        { label: "greeting", top: 24, height: 111 },
        { label: "filters", top: 159, height: 260 },
        { label: "guidance", top: 443, height: 127 },
        { label: "table", top: 594, height: 799 },
        { label: "actions", top: 1417, height: 112 },
        { label: "note", top: 1553, height: 19 },
      ],
    },
  },
  "/teacher/results-validation": {
    1440: {
      content: { top: 108, height: 1189 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "guidance", top: 249, height: 108 },
        { label: "table", top: 381, height: 518 },
        { label: "error", top: 923, height: 118 },
        { label: "actions", top: 1065, height: 49 },
        { label: "note", top: 1138, height: 19 },
      ],
    },
    768: {
      content: { top: 108, height: 1189 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "guidance", top: 249, height: 108 },
        { label: "table", top: 381, height: 518 },
        { label: "error", top: 923, height: 118 },
        { label: "actions", top: 1065, height: 49 },
        { label: "note", top: 1138, height: 19 },
      ],
    },
    375: {
      content: { top: 88, height: 1784 },
      blocks: [
        { label: "greeting", top: 24, height: 111 },
        { label: "filters", top: 159, height: 260 },
        { label: "guidance", top: 443, height: 127 },
        { label: "table", top: 594, height: 799 },
        { label: "error", top: 1417, height: 164 },
        { label: "actions", top: 1605, height: 112 },
        { label: "note", top: 1741, height: 19 },
      ],
    },
  },
  "/teacher/notice": {
    1440: {
      content: { top: 108, height: 589 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "audience", top: 149, height: 76 },
        { label: "table", top: 249, height: 308 },
      ],
    },
    768: {
      content: { top: 108, height: 609 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "audience", top: 149, height: 76 },
        { label: "table", top: 249, height: 328 },
      ],
    },
    375: {
      content: { top: 88, height: 648 },
      blocks: [
        { label: "greeting", top: 24, height: 111 },
        { label: "audience", top: 159, height: 76 },
        { label: "table", top: 259, height: 365 },
      ],
    },
  },
  "/teacher/gallery": {
    1440: {
      content: { top: 108, height: 1341 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "intro", top: 149, height: 35 },
        { label: "album", top: 208, height: 76 },
        { label: "drop", top: 308, height: 259 },
        { label: "table", top: 591, height: 248 },
        { label: "upload", top: 863, height: 47 },
        { label: "preview", top: 934, height: 375 },
      ],
    },
    768: {
      content: { top: 108, height: 1341 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "intro", top: 149, height: 35 },
        { label: "album", top: 208, height: 76 },
        { label: "drop", top: 308, height: 259 },
        { label: "table", top: 591, height: 248 },
        { label: "upload", top: 863, height: 47 },
        { label: "preview", top: 934, height: 375 },
      ],
    },
    375: {
      content: { top: 88, height: 1351 },
      blocks: [
        { label: "greeting", top: 24, height: 111 },
        { label: "intro", top: 159, height: 35 },
        { label: "album", top: 218, height: 76 },
        { label: "drop", top: 318, height: 313 },
        { label: "table", top: 655, height: 253 },
        { label: "upload", top: 932, height: 47 },
        { label: "preview", top: 1003, height: 324 },
      ],
    },
  },
  "/admin/dashboard": {
    1440: {
      content: { top: 108, height: 1538 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "metrics", top: 149, height: 166 },
        { label: "chart", top: 339, height: 385 },
        { label: "attentionHeading", top: 748, height: 35 },
        { label: "attentionTable", top: 807, height: 308 },
        { label: "activityHeading", top: 1139, height: 35 },
        { label: "activityTable", top: 1198, height: 308 },
      ],
    },
    768: {
      content: { top: 108, height: 1538 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "metrics", top: 149, height: 166 },
        { label: "chart", top: 339, height: 385 },
        { label: "attentionHeading", top: 748, height: 35 },
        { label: "attentionTable", top: 807, height: 308 },
        { label: "activityHeading", top: 1139, height: 35 },
        { label: "activityTable", top: 1198, height: 308 },
      ],
    },
    375: {
      content: { top: 88, height: 1890 },
      blocks: [
        { label: "greeting", top: 24, height: 152 },
        { label: "metrics", top: 200, height: 174 },
        { label: "metrics2", top: 398, height: 155 },
        { label: "chart", top: 577, height: 433 },
        { label: "attentionHeading", top: 1034, height: 35 },
        { label: "attentionTable", top: 1093, height: 345 },
        { label: "activityHeading", top: 1462, height: 35 },
        { label: "activityTable", top: 1521, height: 345 },
      ],
    },
  },
  "/admin/users": {
    1440: {
      content: { top: 108, height: 765 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "actions", top: 249, height: 49 },
        { label: "table", top: 322, height: 368 },
        { label: "pagination", top: 714, height: 19 },
      ],
    },
    768: {
      content: { top: 108, height: 845 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "actions", top: 249, height: 49 },
        { label: "table", top: 322, height: 448 },
        { label: "pagination", top: 794, height: 19 },
      ],
    },
    375: {
      content: { top: 88, height: 1215 },
      blocks: [
        { label: "greeting", top: 24, height: 111 },
        { label: "filters", top: 159, height: 168 },
        { label: "actions", top: 351, height: 112 },
        { label: "table", top: 487, height: 661 },
        { label: "pagination", top: 1172, height: 19 },
      ],
    },
  },
  "/admin/classes": {
    1440: {
      content: { top: 108, height: 1144 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "addClass", top: 149, height: 47 },
        { label: "table", top: 220, height: 428 },
        { label: "allocationHeading", top: 672, height: 35 },
        { label: "allocationTable", top: 731, height: 308 },
        { label: "assignSubject", top: 1063, height: 49 },
      ],
    },
    768: {
      content: { top: 122, height: 1144 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "addClass", top: 149, height: 47 },
        { label: "table", top: 220, height: 428 },
        { label: "allocationHeading", top: 672, height: 35 },
        { label: "allocationTable", top: 731, height: 308 },
        { label: "assignSubject", top: 1063, height: 49 },
      ],
    },
    375: {
      content: { top: 88, height: 1424 },
      blocks: [
        { label: "greeting", top: 24, height: 111 },
        { label: "addClass", top: 159, height: 47 },
        { label: "table", top: 230, height: 669 },
        { label: "allocationHeading", top: 923, height: 35 },
        { label: "allocationTable", top: 982, height: 345 },
        { label: "assignSubject", top: 1351, height: 49 },
      ],
    },
  },
  "/admin/users?import=csv": {
    1440: {
      content: { top: 108, height: 1227 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "actions", top: 249, height: 49 },
        { label: "table", top: 322, height: 368 },
        { label: "pagination", top: 714, height: 19 },
        { label: "import", top: 757, height: 438 },
      ],
    },
    768: {
      content: { top: 108, height: 1307 },
      blocks: [
        { label: "greeting", top: 32, height: 93 },
        { label: "filters", top: 149, height: 76 },
        { label: "actions", top: 249, height: 49 },
        { label: "table", top: 322, height: 448 },
        { label: "pagination", top: 794, height: 19 },
        { label: "import", top: 837, height: 438 },
      ],
    },
    375: {
      content: { top: 88, height: 1700 },
      blocks: [
        { label: "greeting", top: 24, height: 111 },
        { label: "filters", top: 159, height: 168 },
        { label: "actions", top: 351, height: 112 },
        { label: "table", top: 487, height: 661 },
        { label: "pagination", top: 1172, height: 19 },
        { label: "import", top: 1215, height: 461 },
      ],
    },
  },
};
const route = process.argv[2] ?? "/student/dashboard";
const width = Number(process.argv[3] ?? 1440);
const positional = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const height = Number(positional[2] ?? 2400);

const target = expected[process.argv.find((arg) => arg.startsWith("--ref="))?.split("=")[1] ?? route]?.[width];
if (!target) {
  console.log(`no Figma reference for ${route} @ ${width}`);
  process.exit(1);
}

/**
 * The parts Figma draws inside a block, measured against the content box.
 * A probe names a selector and the box Figma gives it.
 */
const probes = JSON.parse(
  (() => {
    const arg = process.argv.find((entry) => entry.startsWith("--probes="));
    if (!arg) return "[]";
    // The JSON itself holds "=", so only the first one separates it.
    const at = arg.indexOf("=");
    return arg.slice(at + 1);
  })(),
);

const endpoint = await (await fetch("http://localhost:9222/json")).json();
const page = endpoint.find((t) => t.type === "page");
if (!page) {
  console.log("NO PAGE TARGET");
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  }
});

await new Promise((resolve) => ws.addEventListener("open", resolve));
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: `http://localhost:3111${route}` });
await new Promise((resolve) => setTimeout(resolve, 2500));

// A tab can be opened before the page is measured, so the tab panels are
// compared in the state Figma draws.
const tabArg = process.argv.find((arg) => arg.startsWith("--tab="));

if (tabArg) {
  const wanted = tabArg.split("=")[1];
  await send("Runtime.evaluate", {
    expression: `(() => {
      const tab = [...document.querySelectorAll('button[role="tab"]')]
        .find((b) => b.textContent.trim() === ${JSON.stringify(wanted)});
      if (!tab) return;
      const fire = (el, type) => el.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse',
        isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1,
      }));
      fire(tab, 'pointerdown');
      fire(tab, 'mousedown');
      fire(tab, 'pointerup');
      fire(tab, 'mouseup');
      tab.click();
    })()`,
  });
  await new Promise((resolve) => setTimeout(resolve, 800));
}

// Dark mode is checked with the same geometry, so the theme is forced before
// the page is measured.
if (process.argv.includes("--dark")) {
  await send("Runtime.evaluate", {
    expression: `(() => {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    })()`,
  });
  await new Promise((resolve) => setTimeout(resolve, 400));
}

// A state that cannot be reached by a URL — an invalid mark, a published
// sheet — is produced by an expression before the page is measured.
const evalArg = process.argv.find((arg) => arg.startsWith("--eval="));
if (evalArg) {
  const source = evalArg.slice("--eval=".length);
  const expression = source.endsWith(".js")
    ? (await import("node:fs")).readFileSync(source, "utf8")
    : source;

  await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
  });
  await new Promise((resolve) => setTimeout(resolve, 800));
}

const expression = `(() => {
  const content = document.querySelector('[data-portal="content"]');
  if (!content) return null;
  const root = content.firstElementChild;
  const cr = content.getBoundingClientRect();
  const rr = root.getBoundingClientRect();

  // Probes are measured against the content box, so a page can check the
  // parts Figma draws inside a block.
  const probes = ${JSON.stringify(probes)}.map((probe) => {
    const el = document.querySelector(probe.selector);
    if (!el) return { label: probe.label, missing: true };
    const r = el.getBoundingClientRect();
    return {
      label: probe.label,
      top: Math.round(r.top - cr.top),
      height: Math.round(r.height),
      width: Math.round(r.width),
      text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 34),
    };
  });

  // Blocks are the direct children of the page body. Elements that use
  // "display: contents" do not box themselves, so their children are lifted
  // into the parent's list — that is how the metric rows become blocks of
  // their own on mobile. A grid is split into its rows, because Figma draws
  // each row of a grid as its own frame.
  const flatten = (parent) => {
    const out = [];
    for (const el of parent.children) {
      const style = getComputedStyle(el);
      if (style.display === 'contents') {
        out.push(...flatten(el));
      } else if (style.display === 'grid' || style.display === 'inline-grid') {
        out.push(...gridRows(el));
      } else {
        out.push(el);
      }
    }
    return out;
  };

  // Groups the children of a grid into rows by their top edge. A grid whose
  // children all share one top edge is a single row and stays one block.
  const gridRows = (grid) => {
    const children = Array.from(grid.children);
    if (children.length < 2) return [grid];

    const rows = [];
    for (const child of children) {
      const rect = child.getBoundingClientRect();
      const top = Math.round(rect.top);
      const row = rows.find((candidate) => candidate.top === top);
      if (row) {
        row.bottom = Math.max(row.bottom, rect.bottom);
        row.elements.push(child);
      } else {
        rows.push({ top, bottom: rect.bottom, elements: [child] });
      }
    }

    if (rows.length < 2) return [grid];

    return rows.map((row) => {
      const lefts = row.elements.map((el) => el.getBoundingClientRect().left);
      const rights = row.elements.map((el) => el.getBoundingClientRect().right);
      const width = Math.round(Math.max(...rights) - Math.min(...lefts));
      const text = row.elements
        .map((el) => (el.textContent || '').trim().replace(/\\s+/g, ' '))
        .join(' ')
        .slice(0, 34);
      return {
        top: row.top,
        height: Math.round(row.bottom - row.top),
        width,
        text,
        rows: row.elements,
      };
    });
  };

  const blocks = flatten(root).map((entry) => {
    if (entry.rows) {
      const rects = entry.rows.map((el) => el.getBoundingClientRect());
      return {
        tag: entry.rows.length === 1 ? entry.rows[0].tagName.toLowerCase() : 'grid',
        top: Math.round(rects[0].top - rr.top),
        height: Math.round(entry.height),
        width: Math.round(rects[0].width),
        text: entry.text,
      };
    }

    const r = entry.getBoundingClientRect();
    return {
      tag: entry.tagName.toLowerCase(),
      top: Math.round(r.top - rr.top + 0),
      height: Math.round(r.height),
      width: Math.round(r.width),
      text: (entry.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 34),
    };
  });

  return {
    content: {
      top: Math.round(cr.top),
      height: Math.round(rr.height),
    },
    blocks,
    probes,
  };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
});

const actual = result.result.value;
let failures = 0;

function report(label, want, got) {
  if (!got) {
    if (want.optional) {
      console.log(`${label.padEnd(16)} absent (optional)`);
      return;
    }
    console.log(`${label.padEnd(16)} MISSING  <-- CHECK`);
    failures += 1;
    return;
  }

  const dTop = got.top - want.top;
  // An optional block may carry content Figma does not draw — the page can
  // hold more than the frame — so only its position is checked.
  const dHeight =
    want.height === undefined || want.optional ? 0 : got.height - want.height;
  const flag =
    Math.abs(dTop) > 6 || Math.abs(dHeight) > 6 ? "  <-- CHECK" : "";

  // A block Figma does not draw is reported, but it never fails the run.
  if (want.extra) {
    console.log(
      `${label.padEnd(16)} top ${String(got.top).padStart(5)}  h ${String(got.height).padStart(4)}  (extra, not in Figma)`,
    );
    return;
  }

  if (flag) failures += 1;

  console.log(
    `${label.padEnd(16)} top ${String(got.top).padStart(5)} (want ${String(want.top).padStart(5)}, d${dTop})` +
      `  h ${String(got.height).padStart(4)} (want ${String(want.height).padStart(4)}, d${dHeight})${flag}`,
  );
}

console.log(`=== ${route} @ ${width}px${process.argv.includes("--dark") ? " (dark)" : ""} ===`);

report(
  "content",
  { ...target.content, optional: target.content.optional },
  actual.content,
);

// The page may carry blocks Figma does not draw, so the count is checked
// against the number of blocks Figma draws.
const figmaBlocks = target.blocks.filter(
  (block) => !block.extra && !block.optional,
).length;

target.blocks.forEach((want, index) => {
  const got = actual.blocks[index];
  report(want.label, want, got);
});

if (actual.blocks.length < figmaBlocks) {
  console.log(
    `${"blockCount".padEnd(16)} ${actual.blocks.length} (want at least ${figmaBlocks})  <-- CHECK`,
  );
  failures += 1;
}

for (const probe of actual.probes ?? []) {
  if (probe.missing) {
    console.log(`${probe.label.padEnd(16)} MISSING  <-- CHECK`);
    failures += 1;
    continue;
  }

  const want = probes.find((entry) => entry.label === probe.label);
  if (!want) continue;

  // A probe may be measured against another probe instead of the content box,
  // which is how Figma's 16px rhythm between the method options is checked.
  if (want.gapFrom) {
    const anchor = actual.probes.find((entry) => entry.label === want.gapFrom);
    if (!anchor) continue;
    const gap = probe.top - anchor.top;
    const flag = Math.abs(gap - want.gap) > 6 ? "  <-- CHECK" : "";
    if (flag) failures += 1;
    console.log(
      `${probe.label.padEnd(16)} gap ${String(gap).padStart(5)} from ${want.gapFrom}` +
        ` (want ${String(want.gap).padStart(5)}, d${gap - want.gap})${flag}`,
    );
    continue;
  }

  const dTop = probe.top - want.top;
  const dHeight = want.height === undefined ? 0 : probe.height - want.height;
  const dWidth = want.width === undefined ? 0 : probe.width - want.width;
  const flag =
    Math.abs(dTop) > 6 || Math.abs(dHeight) > 6 || Math.abs(dWidth) > 6
      ? "  <-- CHECK"
      : "";
  if (flag) failures += 1;

  console.log(
    `${probe.label.padEnd(16)} top ${String(probe.top).padStart(5)} (want ${String(want.top).padStart(5)}, d${dTop})` +
      `  h ${String(probe.height).padStart(4)} (want ${String(want.height ?? "-").padStart(4)}, d${dHeight})` +
      `  w ${String(probe.width).padStart(4)} (want ${String(want.width ?? "-").padStart(4)}, d${dWidth})${flag}`,
  );
}

console.log(
  failures === 0
    ? "ALL WITHIN TOLERANCE"
    : `${failures} block(s) out of tolerance`,
);

ws.close();
