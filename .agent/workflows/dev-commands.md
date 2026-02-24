---
description: Common development commands with auto-run enabled
---

// turbo-all

## Development Server

1. Start the development server:
> [!IMPORTANT]
> **CRITICAL RULE**: When asked to start the server or run `cmd /c "npm run dev"`, execute the command immediately. Do NOT perform any preliminary checks, check for open ports, analyze logs, or do any other extra steps. Just run it.
```bash
cmd /c "npm run dev"
```

2. Build for production:
```bash
cmd /c "npm run build"
```

## Git Operations

3. Pull latest changes:
```bash
git pull
```

4. Push changes:
```bash
git push
```

5. Add all changes:
```bash
git add .
```

6. Commit with message (replace MESSAGE):
```bash
git commit -m "MESSAGE"
```

7. Check status:
```bash
git status
```

8. View recent commits:
```bash
git log -n 5 --oneline
```
