# Dart Best Practices

> **Nguồn:** [kevmoo/dash_skills](kevmoo/dash_skills/dart-best-practices)
> **Commit:** `e56fe5d`
> **Generated:** 2026-05-03

> **Review:** ✅ approved

---



### 1. When to use this skill
Use this skill when:
-   Writing or reviewing Dart code.
-   Looking for guidance on idiomatic Dart usage.

### 2. Best Practices

#### Multi-line Strings
Prefer using multi-line strings (`'''`) over concatenating strings with `+` and
`\n`, especially for large blocks of text like SQL queries, HTML, or
PEM-encoded keys. This improves readability and avoids
`lines_longer_than_80_chars` lint errors by allowing natural line breaks.

**Avoid:**
```dart
final pem = '-----BEGIN RSA PRIVATE KEY-----\n' +
    base64Encode(fullBytes) +
    '\n-----END RSA PRIVATE KEY-----';
```

**Prefer:**
```dart
final pem = '''
${base64Encode(fullBytes)}
```

#### Line Length
Avoid lines longer than 80 characters, even in Markdown files and comments.
This ensures code is readable in split-screen views and on smaller screens
without horizontal scrolling.

**Prefer:**
Target 80 characters for wrapping text. Exceptions are allowed for long URLs
or identifiers that cannot be broken.

### Discovery

#### Multi-line Strings
To find candidates for multi-line strings, search for string concatenation
with `+` involving newlines:
- **Regex**: `['"]\s*\+\s*['"]`
- **Regex**: `\+\s*['"].*\\n`

#### Line Length
- Rely on the `lines_longer_than_80_chars` lint from the analyzer.

### Related Skills

- **[dart-modern-features]**: For idiomatic
  usage of modern Dart features like Pattern Matching (useful for deep JSON
  extraction), Records, and Switch Expressions.

[dart-modern-features]: https://github.com/kevmoo/dash_skills/blob/main/.agent/skills/dart-modern-features/SKILL.md


---

*Converted from autoskills — source: kevmoo/dash_skills/dart-best-practices @ e56fe5d*