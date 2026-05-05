# Project Issues Analysis

*Generated on: Tue May 05 2026*

## Critical Issues

### 1. Invalid Dependency Versions in client_web
**File:** `apps/client_web/package.json`

- **TypeScript `~6.0.2`** (line 31) - TypeScript 6.x does not exist (current: 5.x)
- **Vite `^8.0.4`** (line 32) - Vite 8.x does not exist (current: 5.x/6.x)
- **Impact:** `pnpm install` will fail with version resolution errors

**Fix:** Change to valid versions:
```json
"typescript": "^5.6.0",
"vite": "^6.0.0"
```

### 2. Security: Sensitive .env File
**File:** `apps/server/.env`

- Contains database credentials, JWT secret, and API keys
- **Risk:** If committed to git, credentials are exposed
- **Fix:** Ensure `apps/server/.env` is in `.gitignore`

### 3. Missing `client_dist` Directory
**File:** `apps/server/src/index.ts` (lines 20-21)

- Server references `/home/x/Documents/easy-update/client_dist` for static file serving
- Directory does not exist - SPA fallback will fail
- **Fix:** Create the directory or update the path to `apps/client_web/dist`

---

## High Priority Issues

### 4. Unused Dependencies in Server
**File:** `apps/server/package.json`

| Package | Status | Action |
|---------|--------|--------|
| `compression` | Never imported/used | Remove from dependencies |
| `csurf` | Imported but middleware never mounted | Remove + delete `src/middleware/csrfProtection.ts` |

### 5. Test Configuration Broken
**File:** `apps/server/vitest.config.ts`

- `include` pattern: `["src/**/*.{test,spec}.{ts,tsx}"]` does not match `src/__tests__/placeholder.test.ts`
- **Fix:** Add `"src/__tests__/**/*.{test,spec}.{ts,tsx}"` to include array

### 6. Incorrect Import in Test File
**File:** `apps/server/src/middleware/auth.test.ts` (line 7)

- Imports `UnauthorizedError` from `../middleware/auth.js`
- Should import from `../utils/errors.js`
- **Fix:** Update import statement

### 7. Deprecated `csurf` Package
**File:** `apps/server/src/middleware/csrfProtection.ts`

- `csurf@1.11.0` is deprecated and expects Express 4.x (project uses 5.x)
- **Fix:** Remove entirely or use modern alternative if CSRF protection needed

### 8. README Inaccuracies
**File:** `README.md`

| Line | Issue | Actual Status |
|------|-------|---------------|
| 22 | Says "React 18" | Actually React ^19.2.5 |
| 26 | Mentions "Zustand" | Not in dependencies |
| 32 | Mentions "Better Auth" | Uses JWT with bcryptjs |
| 38 | Mentions "GitHub Actions" | No `.github/workflows/` exists |
| 155 | Mentions PM2 | No PM2 config file present |

### 9. Missing LICENSE File
- README references MIT License with link to LICENSE file
- No LICENSE file exists in repository

### 10. Placeholder Mobile Apps Not Proper Packages
**Directories:** `apps/client_android/`, `apps/client_ios/`

- Contain only `.gitkeep` files
- No `package.json` - not recognized as workspace packages
- **Fix:** Add minimal package.json or document as future placeholders

---

## Medium Priority Issues

### 11. Oversized Components
| File | Lines | Recommendation |
|------|-------|----------------|
| `apps/client_web/src/App.tsx` | 2047 | Split into `InputPage`, `NoticePage`, `SettingPage` |
| `apps/client_web/src/Calendar.tsx` | 775 | Extract modal components and form handlers |

### 12. Unused `auth.css` File
**File:** `apps/client_web/src/auth/auth.css` (215 lines)

- Never imported by `AuthScreen.tsx` or any other file
- **Fix:** Delete file or add import in `AuthScreen.tsx`

### 13. Unused Code in Server
**File:** `apps/server/src/middleware/requestId.ts` (lines 28-53)

- `requestLoggerWithId` function defined but never exported or used
- **Fix:** Remove or export/use the function

### 14. `.prettierignore` References Non-existent Directories
**File:** `.prettierignore`

- Lists `dist-client` and `dist-server`
- Actual dist directories are `apps/client_web/dist` and `apps/server/dist`
- **Fix:** Update to `apps/*/dist`

### 15. Duplicate `.env.example` Files
- Root `.env.example` has more complete documentation
- `apps/server/.env.example` is less complete
- **Fix:** Consolidate or clarify which one to use (README mentions copying to `apps/server/.env`)

### 16. No CI/CD Setup
- README mentions GitHub Actions
- No `.github/workflows/` directory exists
- `render.yaml` and `vercel.json` exist but no GitHub Actions

### 17. Hardcoded Fallback Origin
**File:** `apps/server/src/routes/eventsRoutes.ts` (line 116)

- Uses `"http://localhost:4000"` as fallback
- **Fix:** Use environment variable

### 18. Suspicious `lucide-react` Version
**File:** `apps/client_web/package.json` (line 21)

- Version `^0.525.0` seems abnormally high (typical: 0.200-0.400)
- **Fix:** Verify this is intentional

---

## Low Priority Issues

### 19. Root `vitest` Dependency Unnecessary
**File:** `package.json` (root)

- Root has `vitest` as devDependency
- Tests only run in `apps/server`
- **Fix:** Remove from root, keep only in server

### 20. `AuthScreen.tsx` Uses Hard Page Reload
**File:** `apps/client_web/src/auth/AuthScreen.tsx` (line 25)

- Uses `window.location.reload()` instead of React navigation
- **Fix:** Use React state management or React Router navigation

### 21. `@easy-update/types` Package Missing `exports` Field
**File:** `packages/types/package.json`

- Uses `main` and `types` fields pointing to `index.ts`
- Modern NodeNext resolution prefers `exports` field
- **Fix:** Add exports field for better compatibility

### 22. Build Output in `.gitignore`
- `.gitignore` ignores `*.tsbuildinfo` at root
- `apps/server/tsconfig.tsbuildinfo` exists but may not be properly gitignored

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 7 |
| Medium | 10 |
| Low | 4 |
| **Total** | **24** |

### Immediate Actions Recommended:
1. Fix invalid dependency versions in `apps/client_web/package.json`
2. Verify `.env` is in `.gitignore`
3. Create `client_dist` or fix the path in server
4. Clean up unused dependencies and files
5. Fix test configuration
6. Update README to match actual project state
