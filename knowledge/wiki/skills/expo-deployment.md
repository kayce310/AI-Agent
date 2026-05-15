# Deployment

> **Nguồn:** [expo/skills](expo/skills/expo-deployment)
> **Commit:** `8f26555`
> **Generated:** 2026-05-03

> **Review:** ✅ approved

---



This skill covers deploying Expo applications across all platforms using EAS (Expo Application Services).

### References

Consult these resources as needed:

- ./references/workflows.md -- CI/CD workflows for automated deployments and PR previews
- ./references/testflight.md -- Submitting iOS builds to TestFlight for beta testing
- ./references/app-store-metadata.md -- Managing App Store metadata and ASO optimization
- ./references/play-store.md -- Submitting Android builds to Google Play Store
- ./references/ios-app-store.md -- iOS App Store submission and review process

### Quick Start

#### Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

#### Initialize EAS

```bash
npx eas-cli@latest init
```

This creates `eas.json` with build profiles.

### Build Commands

#### Production Builds

```bash
npx eas-cli@latest build -p ios --profile production

npx eas-cli@latest build -p android --profile production

npx eas-cli@latest build --profile production
```

#### Submit to Stores

```bash
npx eas-cli@latest build -p ios --profile production --submit

npx eas-cli@latest build -p android --profile production --submit

npx testflight
```

### Web Deployment

Deploy web apps using EAS Hosting:

```bash
npx expo export -p web
npx eas-cli@latest deploy --prod

npx eas-cli@latest deploy
```

### EAS Configuration

Standard `eas.json` for production deployments:

```json
{
  "cli": {
    "version": ">= 16.0.1",
    "appVersionSource": "remote"
  },
  "build": {
    "production": {
      "autoIncrement": true,
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "1234567890"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### Platform-Specific Guides

#### iOS

- Use `npx testflight` for quick TestFlight submissions
- Configure Apple credentials via `eas credentials`
- See ./reference/testflight.md for credential setup
- See ./reference/ios-app-store.md for App Store submission

#### Android

- Set up Google Play Console service account
- Configure tracks: internal → closed → open → production
- See ./reference/play-store.md for detailed setup

#### Web

- EAS Hosting provides preview URLs for PRs
- Production deploys to your custom domain
- See ./reference/workflows.md for CI/CD automation

### Automated Deployments

Use EAS Workflows for CI/CD:

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  build-ios:
    type: build
    params:
      platform: ios
      profile: production

  submit-ios:
    type: submit
    needs: [build-ios]
    params:
      platform: ios
      profile: production
```

See ./reference/workflows.md for more workflow examples.

### Version Management

EAS manages version numbers automatically with `appVersionSource: "remote"`:

```bash
eas build:version:get

eas build:version:set -p ios --build-number 42
```

### Monitoring

```bash
eas build:list

eas build:view

eas submit:list
```


---

*Converted from autoskills — source: expo/skills/expo-deployment @ 8f26555*