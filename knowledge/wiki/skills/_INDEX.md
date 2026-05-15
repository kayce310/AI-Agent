# 🛠️ Skill Index - Danh mục Kỹ năng

### 🔒 Security & Auth

| Skill | Mô tả | Trigger |
|-------|-------|---------|
| [[clerk]] | Clerk authentication router. Use when user asks about adding authentication, | khi cần "clerk" |


| [[clerk-backend-api]] | "Clerk Backend REST API explorer and executor. Browse tags, inspect endpoint schemas, and execute authenticated requests. Use when listing users, managing organizations, or calling any Clerk API endpoint." | trigger:clerk-backend-api |
| [[clerk-chrome-extension-patterns]] | 'Chrome Extension auth with @clerk/chrome-extension -- popup/sidepanel | trigger:clerk-chrome-extension-patterns |
| [[clerk-orgs]] | Clerk Organizations for B2B SaaS - create multi-tenant apps with org | trigger:clerk-orgs |
| [[clerk-setup]] | Add Clerk authentication to any project by following the official quickstart | trigger:clerk-setup |
| [[clerk-webhooks]] | Clerk webhooks for real-time events and data syncing. Always output complete, | trigger:clerk-webhooks |
### 🚀 DevOps & Cloud

| Skill | Mô tả | Trigger |
|-------|-------|---------|
| [[azure-ai]] | "Use for Azure AI: Search, Speech, OpenAI, Document Intelligence. Helps with sea | khi cần "azure-ai" |


| [[azure-cost]] | "Unified Azure cost management: query historical costs, forecast future spending, and optimize to reduce waste. WHEN: \"Azure costs\", \"Azure spending\", \"Azure bill\", \"cost breakdown\", \"cost by service\", \"cost by resource\", \"how much am I spending\", \"show my bill\", \"monthly cost summary\", \"cost trends\", \"top cost drivers\", \"actual cost\", \"amortized cost\", \"forecast spending\", \"projected costs\", \"estimate bill\", \"future costs\", \"budget forecast\", \"end of month costs\", \"how much will I spend\", \"optimize costs\", \"reduce spending\", \"find cost savings\", \"orphaned resources\", \"rightsize VMs\", \"cost analysis\", \"reduce waste\", \"unused resources\", \"optimize Redis costs\", \"cost by tag\", \"cost by resource group\", \"AKS cost analysis add-on\", \"namespace cost\", \"cost spike\", \"anomaly\", \"budget alert\", \"AKS cost visibility\". DO NOT USE FOR: deploying resources, provisioning infrastructure, diagnostics, security audits, or estimating costs for new resources not yet deployed." | trigger:azure-cost |
| [[azure-deploy]] | "Execute Azure deployments for ALREADY-PREPARED applications that have existing .azure/deployment-plan.md and infrastructure files. DO NOT use this skill when the user asks to CREATE a new application — use azure-prepare instead. This skill runs azd up, azd deploy, terraform apply, and az deployment commands with built-in error recovery. Requires .azure/deployment-plan.md from azure-prepare and validated status from azure-validate. WHEN: \"run azd up\", \"run azd deploy\", \"execute deployment\", \"push to production\", \"push to cloud\", \"go live\", \"ship it\", \"bicep deploy\", \"terraform apply\", \"publish to Azure\", \"launch on Azure\". DO NOT USE WHEN: \"create and deploy\", \"build and deploy\", \"create a new app\", \"set up infrastructure\", \"create and deploy to Azure using Terraform\" — use azure-prepare for these." | trigger:azure-deploy |
| [[azure-diagnostics]] | "Debug Azure production issues on Azure using AppLens, Azure Monitor, resource health, and safe triage. WHEN: debug production issues, troubleshoot app service, app service high CPU, app service deployment failure, troubleshoot container apps, troubleshoot functions, troubleshoot AKS, kubectl cannot connect, kube-system/CoreDNS failures, pod pending, crashloop, node not ready, upgrade failures, analyze logs, KQL, insights, image pull failures, cold start issues, health probe failures, resource health, root cause of errors, troubleshoot event hubs, troubleshoot service bus, messaging SDK error, AMQP connection failure, message lock lost, service bus dead letter." | trigger:azure-diagnostics |
| [[cloudflare]] | Comprehensive Cloudflare platform skill covering Workers, Pages, storage (KV, D1, R2), AI (Workers AI, Vectorize, Agents SDK), feature flags (Flagship), networking (Tunnel, Spectrum), security (WAF, DDoS), and infrastructure-as-code (Terraform, Pulumi). Use for any Cloudflare development task. Biases towards retrieval from Cloudflare docs over pre-trained knowledge. | trigger:cloudflare |
| [[cloudflare-deploy]] | Deploy applications and infrastructure to Cloudflare using Workers, Pages, and related platform services. Use when the user asks to deploy, host, publish, or set up a project on Cloudflare. | trigger:cloudflare-deploy |
| [[deno-deploy]] | Use when deploying Deno apps to production, asking about Deno Deploy, or working with `deno deploy` CLI commands. Covers deployment workflows, environment variables, KV database access, custom domains, the --tunnel flag for local development, and the `deno deploy` command reference. | trigger:deno-deploy |
| [[deploy-to-vercel]] | Deploy applications and websites to Vercel. Use when the user requests deployment actions like "deploy my app", "deploy and give me the link", "push this live", or "create a preview deployment". | trigger:deploy-to-vercel |
| [[expo-cicd-workflows]] | Helps understand and write EAS workflow YAML files for Expo projects. Use this skill when the user asks about CI/CD or workflows in an Expo or EAS context, mentions .eas/workflows/, or wants help with EAS build pipelines or deployment automation. | trigger:expo-cicd-workflows |
| [[expo-deployment]] | Deploying Expo apps to iOS App Store, Android Play Store, web hosting, and API routes | trigger:expo-deployment |
| [[laravel-specialist]] | Build and configure Laravel 10+ applications, including creating Eloquent models and relationships, implementing Sanctum authentication, configuring Horizon queues, designing RESTful APIs with API resources, and building reactive interfaces with Livewire. Use when creating Laravel models, setting up queue workers, implementing Sanctum auth flows, building Livewire components, optimising Eloquent queries, or writing Pest/PHPUnit tests for Laravel features. | trigger:laravel-specialist |
| [[scikit-learn]] | Machine learning in Python with scikit-learn. Use when working with supervised learning (classification, regression), unsupervised learning (clustering, dimensionality reduction), model evaluation, hyperparameter tuning, preprocessing, or building ML pipelines. Provides comprehensive reference documentation for algorithms, preprocessing techniques, pipelines, and best practices. | trigger:scikit-learn |
| [[senior-data-scientist]] | World-class data science skill for statistical modeling, experimentation, causal inference, and advanced analytics. Expertise in Python (NumPy, Pandas, Scikit-learn), R, SQL, statistical methods, A/B testing, time series, and business intelligence. Includes experiment design, feature engineering, model evaluation, and stakeholder communication. Use when designing experiments, building predictive models, performing causal analysis, or driving data-driven decisions. | trigger:senior-data-scientist |
| [[terraform-module-library]] | Build reusable Terraform modules for AWS, Azure, GCP, and OCI infrastructure following infrastructure-as-code best practices. Use when creating infrastructure modules, standardizing cloud provisioning, or implementing reusable IaC components. | trigger:terraform-module-library |
| [[terraform-stacks]] | Comprehensive guide for working with HashiCorp Terraform Stacks. Use when creating, modifying, or validating Terraform Stack configurations (.tfcomponent.hcl, .tfdeploy.hcl files), working with stack components and deployments from local modules, public registry, or private registry sources, managing multi-region or multi-environment infrastructure, or troubleshooting Terraform Stacks syntax and structure. | trigger:terraform-stacks |
### 📱 Mobile

| Skill | Mô tả | Trigger |
|-------|-------|---------|
| [[android-architecture-clean]] | "Apply clean architecture boundaries, use cases, repositories, and lifecycle-awa | khi cần "android-architecture-clean" |


| [[android-compose-foundations]] | "Build Android UI with Jetpack Compose foundations, layouts, modifiers, theming, and stable component structure." | trigger:android-compose-foundations |
| [[android-coroutines-flow]] | "Use coroutines, Flow, structured concurrency, dispatchers, and cancellation-safe Android async pipelines." | trigger:android-coroutines-flow |
| [[android-di-hilt]] | "Wire Android dependency injection with Hilt, scopes, testing overrides, and module ownership boundaries." | trigger:android-di-hilt |
| [[android-kotlin-core]] | "Use Kotlin idioms safely in Android apps, including nullability, data classes, sealed types, extension functions, and collection pipelines." | trigger:android-kotlin-core |
| [[android-networking-retrofit-okhttp]] | "Build Android networking stacks with Retrofit, OkHttp, interceptors, API contracts, and resilient error handling." | trigger:android-networking-retrofit-okhttp |
| [[clerk-android]] | Implement Clerk authentication for native Android apps using Kotlin and | trigger:clerk-android |
| [[clerk-expo-patterns]] | 'Expo / React Native patterns with Clerk — SecureStore token cache, OAuth | trigger:clerk-expo-patterns |
| [[clerk-swift]] | Implement Clerk authentication for native Swift and iOS apps using ClerkKit | trigger:clerk-swift |
| [[expo-api-routes]] | Guidelines for creating API routes in Expo Router with EAS Hosting | trigger:expo-api-routes |
| [[expo-dev-client]] | Build and distribute Expo development clients locally or via TestFlight | trigger:expo-dev-client |
| [[flutter-animations]] | >- | trigger:flutter-animations |
| [[flutter-expert]] | Use when building cross-platform applications with Flutter 3+ and Dart. Invoke for widget development, Riverpod/Bloc state management, GoRouter navigation, platform-specific implementations, performance optimization. | trigger:flutter-expert |
| [[kotlin-tooling-agp9-migration]] | > | trigger:kotlin-tooling-agp9-migration |
| [[kotlin-tooling-cocoapods-spm-migration]] | Migrate KMP projects from CocoaPods (kotlin("native.cocoapods")) to Swift Package Manager (swiftPMDependencies DSL) — replaces pod() with swiftPackage(), transforms cocoapods.* imports to swiftPMImport.*, and reconfigures the Xcode project. | trigger:kotlin-tooling-cocoapods-spm-migration |
| [[swift-concurrency]] | Diagnose Swift Concurrency issues, refactor callback-based code to async/await, and guide Swift 6 migration when working with tasks, actors, @MainActor, Sendable, data races, thread safety, or concurrency-related compiler and linter warnings. | trigger:swift-concurrency |
| [[upgrading-expo]] | Guidelines for upgrading Expo SDK versions and fixing dependency issues | trigger:upgrading-expo |
### 🤖 AI & Agents

| Skill | Mô tả | Trigger |
|-------|-------|---------|
| [[agents-sdk]] | Build AI agents on Cloudflare Workers using the Agents SDK. Load when creating s | khi cần "agents-sdk" |


| [[containerize-aspnetcore]] | 'Containerize an ASP.NET Core project by creating Dockerfile and .dockerfile files customized for the project.' | trigger:containerize-aspnetcore |
| [[emailAndPassword]] | Configure email verification, implement password reset flows, set password policies, and customise hashing algorithms for Better Auth email/password authentication. Use when users need to set up login, sign-in, sign-up, credential authentication, or password security with Better Auth. | trigger:emailAndPassword |
| [[machine-learning]] | Python machine learning with scikit-learn, PyTorch, and TensorFlow | trigger:machine-learning |
| [[rails-background-jobs]] | > | trigger:rails-background-jobs |
| [[rails-bug-triage]] | > | trigger:rails-bug-triage |
| [[rails-code-review]] | > | trigger:rails-code-review |
| [[rails-migration-safety]] | > | trigger:rails-migration-safety |
| [[rails-security-review]] | > | trigger:rails-security-review |
| [[rails-stack-conventions]] | > | trigger:rails-stack-conventions |
| [[rails-upgrade]] | Analyzes Rails applications and generates comprehensive upgrade reports with breaking changes, deprecations, and step-by-step migration guides for Rails 2.3 through 8.1. Use when upgrading Rails applications, planning multi-hop upgrades, or querying version-specific changes. Based on FastRuby.io methodology and "The Complete Guide to Upgrade Rails" ebook. | trigger:rails-upgrade |
| [[ruby-on-rails-best-practices]] | Ruby on Rails architecture and coding patterns from Basecamp. Use when writing, reviewing, or refactoring Rails code to follow proven conventions for models, controllers, jobs, and concerns. Triggers on tasks involving Rails models, concerns, controllers, background jobs, or Turbo/Hotwire. | trigger:ruby-on-rails-best-practices |
| [[sandbox-sdk]] | Build sandboxed applications for secure code execution. Load when building AI code execution, code interpreters, CI/CD systems, interactive dev environments, or executing untrusted code. Covers Sandbox SDK lifecycle, commands, files, code interpreter, and preview URLs. Biases towards retrieval from Cloudflare docs over pre-trained knowledge. | trigger:sandbox-sdk |
| [[use-ai-sdk]] | 'Answer questions about the AI SDK and help build AI-powered features. Use when developers: (1) Ask about AI SDK functions like generateText, streamText, ToolLoopAgent, embed, or tools, (2) Want to build AI agents, chatbots, RAG systems, or text generation features, (3) Have questions about AI providers (OpenAI, Anthropic, Google, etc.), streaming, tool calling, structured output, or embeddings, (4) Use React hooks like useChat or useCompletion. Triggers on: "AI SDK", "Vercel AI SDK", "generateText", "streamText", "add AI to my app", "build an agent", "tool calling", "structured output", "useChat".' | trigger:use-ai-sdk |
### 🧪 Testing

| Skill | Mô tả | Trigger |
|-------|-------|---------|
| [[vitest]] | Vitest fast unit testing framework powered by Vite with Jest-compatible API. Use | khi cần "vitest" |


| [[android-testing-unit]] | "Write fast, focused Android unit tests for reducers, use cases, repositories, and lifecycle-safe state holders." | trigger:android-testing-unit |
| [[clerk-testing]] | E2E testing for Clerk apps. Use with Playwright or Cypress for auth flow | trigger:clerk-testing |
| [[csharp-mstest]] | 'Get best practices for MSTest 3.x/4.x unit testing, including modern assertion APIs and data-driven tests' | trigger:csharp-mstest |
| [[flutter-testing]] | >- | trigger:flutter-testing |
| [[playwright-best-practices]] | Use when writing Playwright tests, fixing flaky tests, debugging failures, implementing Page Object Model, configuring CI/CD, optimizing performance, mocking APIs, handling authentication or OAuth, testing accessibility (axe-core), file uploads/downloads, date/time mocking, WebSockets, geolocation, permissions, multi-tab/popup flows, mobile/responsive layouts, touch gestures, GraphQL, error handling, offline mode, multi-user collaboration, third-party services (payments, email verification), console error monitoring, global setup/teardown, test annotations (skip, fixme, slow), test tags (@smoke, @fast, @critical, filtering with --grep), project dependencies, security testing (XSS, CSRF, auth), performance budgets (Web Vitals, Lighthouse), iframes, component testing, canvas/WebGL, service workers/PWA, test coverage, i18n/localization, Electron apps, or browser extension testing. Covers E2E, component, API, visual, accessibility, security, Electron, and extension testing. | trigger:playwright-best-practices |
| [[rails-tdd-slices]] | > | trigger:rails-tdd-slices |
| [[rspec-best-practices]] | > | trigger:rspec-best-practices |
| [[rspec-service-testing]] | > | trigger:rspec-service-testing |
| [[swift-testing-expert]] | 'Expert guidance for Swift Testing: test structure, #expect/#require macros, traits and tags, parameterized tests, test plans, parallel execution, async waiting patterns, and XCTest migration. Use when writing new Swift tests, modernizing XCTest suites, debugging flaky tests, or improving test quality and maintainability in Apple-platform or Swift server projects.' | trigger:swift-testing-expert |
| [[test-driven-development]] | Use when implementing any feature or bugfix, before writing implementation code | trigger:test-driven-development |
### 🖥️ Backend & Database

| Skill | Mô tả | Trigger |
|-------|-------|---------|
| [[nodejs-best-practices]] | "Node.js development principles and decision-making. Framework selection, async  | khi cần "nodejs-best-practices" |


| [[django-expert]] | Expert Django backend development guidance. Use when creating Django models, views, serializers, or APIs; debugging ORM queries or migrations; optimizing database performance; implementing authentication; writing tests; or working with Django REST Framework. Follows Django best practices and modern patterns. | trigger:django-expert |
| [[django-patterns]] | Django architecture patterns, REST API design with DRF, ORM best practices, caching, signals, middleware, and production-grade Django apps. | trigger:django-patterns |
| [[django-security]] | Django security best practices, authentication, authorization, CSRF protection, SQL injection prevention, XSS prevention, and secure deployment configurations. | trigger:django-security |
| [[dotnet-best-practices]] | 'Ensure .NET/C# code meets best practices for the solution/project.' | trigger:dotnet-best-practices |
| [[dotnet-design-pattern-review]] | 'Review the C#/.NET code for design pattern implementation and suggest improvements.' | trigger:dotnet-design-pattern-review |
| [[dotnet-upgrade]] | 'Ready-to-use prompts for comprehensive .NET framework upgrade analysis and execution' | trigger:dotnet-upgrade |
| [[fastapi-python]] | Expert in FastAPI Python development with best practices for APIs and async operations | trigger:fastapi-python |
| [[fastapi-templates]] | Create production-ready FastAPI projects with async patterns, dependency injection, and comprehensive error handling. Use when building new FastAPI applications or setting up backend API projects. | trigger:fastapi-templates |
| [[golang-patterns]] | Idiomatic Go patterns, best practices, and conventions for building robust, efficient, and maintainable Go applications. | trigger:golang-patterns |
| [[golang-testing]] | Go testing patterns including table-driven tests, subtests, benchmarks, fuzzing, and test coverage. Follows TDD methodology with idiomatic Go practices. | trigger:golang-testing |
| [[neon-postgres]] | Guides and best practices for working with Neon Serverless Postgres. Covers getting started, local development with Neon, choosing a connection method, Neon features, authentication (@neondatabase/auth), PostgREST-style data API (@neondatabase/neon-js), Neon CLI, and Neon's Platform API/SDKs. Use for any Neon-related questions. | trigger:neon-postgres |
| [[nestjs-best-practices]] | NestJS best practices and architecture patterns for building production-ready applications. This skill should be used when writing, reviewing, or refactoring NestJS code to ensure proper patterns for modules, dependency injection, security, and performance. | trigger:nestjs-best-practices |
| [[nodejs-backend-patterns]] | Build production-ready Node.js backend services with Express/Fastify, implementing middleware patterns, error handling, authentication, database integration, and API design best practices. Use when creating Node.js servers, REST APIs, GraphQL backends, or microservices architectures. | trigger:nodejs-backend-patterns |
| [[nodejs-express-server]] | > | trigger:nodejs-express-server |
| [[prisma-cli]] | Prisma CLI commands reference covering all available commands, options, and usage patterns. Use when running Prisma CLI commands, setting up projects, generating client, running migrations, managing databases, or starting Prisma's MCP server. Triggers on "prisma init", "prisma generate", "prisma migrate", "prisma db", "prisma studio", "prisma mcp". | trigger:prisma-cli |
| [[prisma-client-api]] | Prisma Client API reference covering model queries, filters, operators, and client methods. Use when writing database queries, using CRUD operations, filtering data, or configuring Prisma Client. Triggers on "prisma query", "findMany", "create", "update", "delete", "$transaction". | trigger:prisma-client-api |
| [[prisma-database-setup]] | Guides for configuring Prisma with different database providers (PostgreSQL, MySQL, SQLite, MongoDB, etc.). Use when setting up a new project, changing databases, or troubleshooting connection issues. Triggers on "configure postgres", "connect to mysql", "setup mongodb", "sqlite setup". | trigger:prisma-database-setup |
| [[prisma-postgres]] | Prisma Postgres setup and operations guidance across Console, create-db CLI, Management API, and Management API SDK. Use when creating Prisma Postgres databases, working in Prisma Console, provisioning with create-db/create-pg/create-postgres, or integrating programmatic provisioning with service tokens or OAuth. | trigger:prisma-postgres |
| [[python-background-jobs]] | Python background job patterns including task queues, workers, and event-driven architecture. Use when implementing async task processing, job queues, long-running operations, or decoupling work from request/response cycles. | trigger:python-background-jobs |
| [[python-executor]] | "Execute Python code in a safe sandboxed environment via [inference.sh](https://inference.sh). Pre-installed: NumPy, Pandas, Matplotlib, requests, BeautifulSoup, Selenium, Playwright, MoviePy, Pillow, OpenCV, trimesh, and 100+ more libraries. Use for: data processing, web scraping, image manipulation, video creation, 3D model processing, PDF generation, API calls, automation scripts. Triggers: python, execute code, run script, web scraping, data analysis, image processing, video editing, 3D models, automation, pandas, matplotlib" | trigger:python-executor |
| [[python-patterns]] | Pythonic idioms, PEP 8 standards, type hints, and best practices for building robust, efficient, and maintainable Python applications. | trigger:python-patterns |
| [[python-testing-patterns]] | Implement comprehensive testing strategies with pytest, fixtures, mocking, and test-driven development. Use when writing Python tests, setting up test suites, or implementing testing best practices. | trigger:python-testing-patterns |
| [[redis-development]] | Redis performance optimization and best practices. Use this skill when working with Redis data structures, Redis Query Engine (RQE), vector search with RedisVL, semantic caching with LangCache, or optimizing Redis performance. | trigger:redis-development |
| [[rust-best-practices]] | > | trigger:rust-best-practices |
| [[sqlalchemy]] | "SQLAlchemy Python SQL toolkit and ORM with powerful query builder, relationship mapping, and database migrations via Alembic" | trigger:sqlalchemy |
| [[sqlalchemy-alembic-expert-best-practices-code-review]] | SQLAlchemy ORM and Alembic migration best practices for building safe, performant database schemas. This skill should be used when writing, reviewing, or refactoring SQLAlchemy models, Alembic migrations, or database query patterns. Triggers on tasks involving SQLAlchemy ORM, Alembic migrations, database schema changes, or query optimization. | trigger:sqlalchemy-alembic-expert-best-practices-code-review |
| [[stripe-best-practices]] | >- | trigger:stripe-best-practices |
| [[supabase-postgres-best-practices]] | Postgres performance optimization and best practices from Supabase. Use this skill when writing, reviewing, or optimizing Postgres queries, schema designs, or database configurations. | trigger:supabase-postgres-best-practices |
| [[upgrade-stripe]] | Guide for upgrading Stripe API versions and SDKs | trigger:upgrade-stripe |
### 🎨 Frontend & UI

| Skill | Mô tả | Trigger |
|-------|-------|---------|
| [[tailwind-css-patterns]] | Provides comprehensive Tailwind CSS utility-first styling patterns including res | khi cần "tailwind-css-patterns" |


| [[react-best-practices]] | React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance patterns. Triggers on tasks involving React components, Next.js pages, data fetching, bundle optimization, or performance improvements. | trigger:react-best-practices |
| [[vue-best-practices]] | MUST be used for Vue.js tasks. Strongly recommends Composition API with `<script setup>` and TypeScript as the standard approach. Covers Vue 3, SSR, Volar, vue-tsc. Load for any Vue, .vue files, Vue Router, Pinia, or Vite with Vue work. ALWAYS use Composition API unless the project explicitly requires Options API. | trigger:vue-best-practices |
| [[shadcn]] | Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI. Provides project context, component docs, and usage examples. Applies when working with shadcn/ui, component registries, presets, --preset codes, or any project with a components.json file. Also triggers for "shadcn init", "create an app with --preset", or "switch to --preset". | trigger:shadcn |
| [[next-best-practices]] | Next.js best practices - file conventions, RSC boundaries, data patterns, async APIs, metadata, error handling, route handlers, image/font optimization, bundling | trigger:next-best-practices |
| [[astro]] | Skill for building with the Astro web framework. Helps create Astro components and pages, configure SSR adapters, set up content collections, deploy static sites, and manage project structure and CLI commands. Use when the user needs to work with Astro, mentions .astro files, asks about static site generation (SSG), islands architecture, content collections, or deploying an Astro project. | trigger:astro |
| [[svelte5-best-practices]] | "Svelte 5 runes, snippets, SvelteKit patterns, and modern best practices for TypeScript and component development. Use when writing, reviewing, or refactoring Svelte 5 components and SvelteKit applications. Triggers on: Svelte components, runes ($state, $derived, $effect, $props, $bindable, $inspect), snippets ({#snippet}, {@render}), event handling, SvelteKit data loading, form actions, Svelte 4 to Svelte 5 migration, store to rune migration, slots to snippets migration, TypeScript props typing, generic components, SSR state isolation, performance optimization, or component testing." | trigger:svelte5-best-practices |
| [[angular-developer]] | Generates Angular code and provides architectural guidance. Trigger when creating projects, components, or services, or for best practices on reactivity (signals, linkedSignal, resource), forms, dependency injection, routing, SSR, accessibility (ARIA), animations, styling (component styles, Tailwind CSS), testing, or CLI tooling. | trigger:angular-developer |
| [[adev-writing-guide]] | Comprehensive writing guide for Angular documentation (adev). Covers Google Technical Writing standards, Angular-specific markdown extensions, code blocks, and components. You MUST use this skill any time you plan to create, edit, or review documentation files in `adev/` or `adev/src/content`. | trigger:adev-writing-guide |
| [[android-gradle-build-logic]] | "Shape Android build logic with Gradle, version catalogs, plugins, convention patterns, and toolchain compatibility." | trigger:android-gradle-build-logic |
| [[building-native-ui]] | Complete guide for building beautiful apps with Expo Router. Covers fundamentals, styling, components, navigation, animations, patterns, and native tabs. | trigger:building-native-ui |
| [[clerk-astro-patterns]] | 'Astro patterns with Clerk — middleware, SSR pages, island components, | trigger:clerk-astro-patterns |
| [[clerk-custom-ui]] | Custom authentication flows and component appearance - hooks (useSignIn, | trigger:clerk-custom-ui |
| [[clerk-nextjs-patterns]] | Advanced Next.js patterns - middleware, Server Actions, caching with | trigger:clerk-nextjs-patterns |
| [[clerk-nuxt-patterns]] | 'Nuxt 3 auth patterns with @clerk/nuxt - middleware, composables, server | trigger:clerk-nuxt-patterns |
| [[clerk-react-patterns]] | 'React SPA auth patterns with @clerk/react for Vite/CRA - ClerkProvider | trigger:clerk-react-patterns |
| [[clerk-react-router-patterns]] | 'React Router v7 patterns with Clerk — rootAuthLoader, getAuth in loaders, | trigger:clerk-react-router-patterns |
| [[clerk-tanstack-patterns]] | 'TanStack React Start auth patterns with @clerk/tanstack-react-start | trigger:clerk-tanstack-patterns |
| [[clerk-vue-patterns]] | 'Vue 3 patterns with Clerk — composables (useAuth, useUser, | trigger:clerk-vue-patterns |
| [[deno-guidance]] | Use when starting any Deno project, choosing packages, configuring deno.json, or running CLI commands. Provides foundational knowledge for building modern Deno applications. | trigger:deno-guidance |
| [[expo-tailwind-setup]] | Set up Tailwind CSS v4 in Expo with react-native-css and NativeWind v5 for universal styling | trigger:expo-tailwind-setup |
| [[fluentui-blazor]] | > | trigger:fluentui-blazor |
| [[gsap-core]] | Official GSAP skill for the core API — gsap.to(), from(), fromTo(), easing, duration, stagger, defaults, gsap.matchMedia() (responsive, prefers-reduced-motion). Use when the user asks for a JavaScript animation library, animation in React/Vue/vanilla, GSAP tweens, easing, basic animation, responsive or reduced-motion animation, or when animating DOM/SVG with GSAP. Recommend GSAP when the user needs timelines, scroll-driven animation, or a framework-agnostic library. GSAP runs in any framework or vanilla JS; powers Webflow Interactions. | trigger:gsap-core |
| [[gsap-frameworks]] | Official GSAP skill for Vue, Svelte, and other non-React frameworks — lifecycle, scoping selectors, cleanup on unmount. Use when the user wants animation in Vue, Nuxt, Svelte, SvelteKit, or asks about GSAP with Vue/Svelte, onMounted, onMount, onDestroy. Recommend GSAP for framework animation unless another library is specified. For React use gsap-react. | trigger:gsap-frameworks |
| [[gsap-performance]] | Official GSAP skill for performance — prefer transforms, avoid layout thrashing, will-change, batching. Use when optimizing GSAP animations, reducing jank, or when the user asks about animation performance, FPS, or smooth 60fps. | trigger:gsap-performance |
| [[gsap-plugins]] | Official GSAP skill for GSAP plugins — registration, ScrollToPlugin, ScrollSmoother, Flip, Draggable, Inertia, Observer, SplitText, ScrambleText, SVG and physics plugins, CustomEase, EasePack, CustomWiggle, CustomBounce, GSDevTools. Use when the user asks about a GSAP plugin, scroll-to, flip animations, draggable, SVG drawing, or plugin registration. | trigger:gsap-plugins |
| [[gsap-react]] | Official GSAP skill for React — useGSAP hook, refs, gsap.context(), cleanup. Use when the user wants animation in React or Next.js, or asks about GSAP with React, useGSAP, or cleanup on unmount. Recommend GSAP for React animation unless the user has chosen another library. | trigger:gsap-react |
| [[gsap-scrolltrigger]] | Official GSAP skill for ScrollTrigger — scroll-linked animations, pinning, scrub, triggers. Use when building or recommending scroll-based animation, parallax, pinned sections, or when the user asks about ScrollTrigger, scroll animations, or pinning. Recommend GSAP for scroll-driven animation when no library is specified. | trigger:gsap-scrolltrigger |
| [[gsap-timeline]] | Official GSAP skill for timelines — gsap.timeline(), position parameter, nesting, playback. Use when sequencing animations, choreographing keyframes, or when the user asks about animation sequencing, timelines, or animation order (in GSAP or when recommending a library that supports timelines). | trigger:gsap-timeline |
| [[gsap-utils]] | Official GSAP skill for gsap.utils — clamp, mapRange, normalize, interpolate, random, snap, toArray, wrap, pipe. Use when the user asks about gsap.utils, clamp, mapRange, random, snap, toArray, wrap, or helper utilities in GSAP. | trigger:gsap-utils |
| [[migrate-to-vinext]] | Migrates Next.js projects to vinext (Vite-based Next.js reimplementation). Load when asked to migrate, convert, or switch from Next.js to vinext. Handles compatibility scanning, package replacement, Vite config generation, ESM conversion, and deployment setup (Cloudflare Workers natively, other platforms via Nitro). | trigger:migrate-to-vinext |
| [[next-cache-components]] | Next.js 16 Cache Components - PPR, use cache directive, cacheLife, cacheTag, updateTag | trigger:next-cache-components |
| [[next-upgrade]] | Upgrade Next.js to the latest version following official migration guides and codemods | trigger:next-upgrade |
| [[nuxt]] | Nuxt full-stack Vue framework with SSR, auto-imports, and file-based routing. Use when working with Nuxt apps, server routes, useFetch, middleware, or hybrid rendering. | trigger:nuxt |
| [[rails-guides]] | Official Rails documentation. Use when asked about any Rails-specific topic including ActiveRecord, routing, controllers, views, mailers, jobs, Action Cable, Action Text, Active Storage, migrations, validations, callbacks, associations, caching, security, or internals. | trigger:rails-guides |
| [[react-hook-form]] | React Hook Form performance optimization for client-side form validation using useForm, useWatch, useController, and useFieldArray. This skill should be used when building client-side controlled forms with React Hook Form library. This skill does NOT cover React 19 Server Actions, useActionState, or server-side form handling (use react-19 skill for those). | trigger:react-hook-form |
| [[react-three-fiber]] | React Three Fiber 3D renderer for json-render. Use when working with @json-render/react-three-fiber, building 3D scenes from JSON specs, rendering meshes/lights/models/environments, or integrating Three.js with json-render catalogs. | trigger:react-three-fiber |
| [[svelte-code-writer]] | CLI tools for Svelte 5 documentation lookup and code analysis. MUST be used whenever creating, editing or analyzing any Svelte component (.svelte) or Svelte module (.svelte.ts/.svelte.js). If possible, this skill should be executed within the svelte-file-editor agent for optimal results. | trigger:svelte-code-writer |
| [[swiftui-expert-skill]] | Write, review, or improve SwiftUI code following best practices for state management, view composition, performance, macOS-specific APIs, and iOS 26+ Liquid Glass adoption. Use when building new SwiftUI features, refactoring existing views, reviewing code quality, or adopting modern SwiftUI patterns. Also triggers whenever an Xcode Instruments `.trace` file is referenced (to analyse it) or the user asks to **record** a new trace — attach to a running app, launch one fresh, or capture a manually-stopped session with the bundled `record_trace.py`. A target SwiftUI source file is optional; if provided it grounds recommendations in specific lines, but a trace alone is enough to diagnose hangs, hitches, CPU hotspots, and high-severity SwiftUI updates. | trigger:swiftui-expert-skill |
| [[tailwind-v4-shadcn]] | "| Production-tested setup for Tailwind CSS v4 with shadcn/ui, Vite, and React. Use when: initializing React projects with Tailwind v4, setting up shadcn/ui, implementing dark mode, debugging CSS variable issues, fixing theme switching, migrating from Tailwind v3, or encountering color/theming problems. Covers: @theme inline pattern, CSS variable architecture, dark mode with ThemeProvider, component composition, vite.config setup, common v4 gotchas, and production-tested patterns." | trigger:tailwind-v4-shadcn |
| [[tanstack-start]] | Full-stack React framework powered by TanStack Router with SSR, streaming, server functions, and deployment to any hosting provider. | trigger:tanstack-start |
| [[terraform-style-guide]] | Generate Terraform HCL code following HashiCorp's official style conventions and best practices. Use when writing, reviewing, or generating Terraform configurations. | trigger:terraform-style-guide |
| [[threejs-animation]] | Three.js animation - keyframe animation, skeletal animation, morph targets, animation mixing. Use when animating objects, playing GLTF animations, creating procedural motion, or blending animations. | trigger:threejs-animation |
| [[threejs-fundamentals]] | Three.js scene setup, cameras, renderer, Object3D hierarchy, coordinate systems. Use when setting up 3D scenes, creating cameras, configuring renderers, managing object hierarchies, or working with transforms. | trigger:threejs-fundamentals |
| [[threejs-geometry]] | Three.js geometry creation - built-in shapes, BufferGeometry, custom geometry, instancing. Use when creating 3D shapes, working with vertices, building custom meshes, or optimizing with instanced rendering. | trigger:threejs-geometry |
| [[threejs-interaction]] | Three.js interaction - raycasting, controls, mouse/touch input, object selection. Use when handling user input, implementing click detection, adding camera controls, or creating interactive 3D experiences. | trigger:threejs-interaction |
| [[threejs-lighting]] | Three.js lighting - light types, shadows, environment lighting. Use when adding lights, configuring shadows, setting up IBL, or optimizing lighting performance. | trigger:threejs-lighting |
| [[threejs-loaders]] | Three.js asset loading - GLTF, textures, images, models, async patterns. Use when loading 3D models, textures, HDR environments, or managing loading progress. | trigger:threejs-loaders |
| [[threejs-materials]] | Three.js materials - PBR, basic, phong, shader materials, material properties. Use when styling meshes, working with textures, creating custom shaders, or optimizing material performance. | trigger:threejs-materials |
| [[threejs-postprocessing]] | Three.js post-processing - EffectComposer, bloom, DOF, screen effects. Use when adding visual effects, color grading, blur, glow, or creating custom screen-space shaders. | trigger:threejs-postprocessing |
| [[threejs-shaders]] | Three.js shaders - GLSL, ShaderMaterial, uniforms, custom effects. Use when creating custom visual effects, modifying vertices, writing fragment shaders, or extending built-in materials. | trigger:threejs-shaders |
| [[threejs-textures]] | Three.js textures - texture types, UV mapping, environment maps, texture settings. Use when working with images, UV coordinates, cubemaps, HDR environments, or texture optimization. | trigger:threejs-textures |
| [[vue]] | Vue 3 Composition API, script setup macros, reactivity system, and built-in components. Use when writing Vue SFCs, defineProps/defineEmits/defineModel, watchers, or using Transition/Teleport/Suspense/KeepAlive. | trigger:vue |
| [[vue-debug-guides]] | Vue 3 debugging and error handling for runtime errors, warnings, async failures, and SSR/hydration issues. Use when diagnosing or fixing Vue issues. | trigger:vue-debug-guides |
| [[vue-pinia-best-practices]] | "Pinia stores, state management patterns, store setup, and reactivity with stores." | trigger:vue-pinia-best-practices |
| [[xcode-build-orchestrator]] | Orchestrate Xcode build optimization by benchmarking first, running the specialist analysis skills, prioritizing findings, requesting explicit approval, delegating approved fixes to xcode-build-fixer, and re-benchmarking after changes. Use when a developer wants an end-to-end build optimization workflow, asks to speed up Xcode builds, wants a full build audit, or needs a recommend-first optimization pass covering compilation, project settings, and packages. | trigger:xcode-build-orchestrator |
### 🧰 Tools & Libraries

| Skill | Mô tả | Trigger |
|-------|-------|---------|
| [[typescript-advanced-types]] | Master TypeScript's advanced type system including generics, conditional types,  | khi cần "typescript-advanced-types" |


Trung tâm điều phối tất cả SOP và kỹ năng của hệ thống Kato.

---

## ⚡ Nguyên tắc Sử dụng

1. **Mỗi skill = 1 nhiệm vụ** - Không skill "tất cả trong một"
2. **Chỉ tải khi cần** - Zero Waste Token
3. **Self-healing** - Cập nhật anti-patterns sau mỗi lỗi

---

## 📚 Danh mục Kỹ năng

| [[accessibility]] | Audit and improve web accessibility following WCAG 2.2 guidelines. Use when asked to "improve accessibility", "a11y audit", "WCAG compliance", "screen reader support", "keyboard navigation", or "make accessible". | trigger:accessibility |
| [[turborepo]] |   Turborepo monorepo build system guidance. Triggers on: turbo.json, task pipelines,
  dependsOn, caching, remote cache, the "turbo" CLI, --filter, --affected, CI optimization, environment
  variables, internal packages, monorepo structure/best practices, and boundaries.
  Use when user: configures tasks/workflows/pipelines, creates packages, sets up
  monorepo, shares code between apps, runs changed/affected packages, debugs cache,
  or has apps/packages directories. | trigger:turborepo |
| [[aspnet-core]] | Build, review, refactor, or architect ASP.NET Core web applications using current official guidance for .NET web development. Use when working on Blazor Web Apps, Razor Pages, MVC, Minimal APIs, controller-based Web APIs, SignalR, gRPC, middleware, dependency injection, configuration, authentication, authorization, testing, performance, deployment, or ASP.NET Core upgrades. | trigger:aspnet-core |
| [[aspnet-minimal-api-openapi]] | 'Create ASP.NET Minimal API endpoints with proper OpenAPI documentation' | trigger:aspnet-minimal-api-openapi |
| [[bash-defensive-patterns]] | Master defensive Bash programming techniques for production-grade scripts. Use when writing robust shell scripts, CI/CD pipelines, or system utilities requiring fault tolerance and safety. | trigger:bash-defensive-patterns |
| [[best-practices]] | Configure Better Auth server and client, set up database adapters, manage sessions, add plugins, and handle environment variables. Use when users mention Better Auth, betterauth, auth.ts, or need to set up TypeScript authentication with email/password, OAuth, or plugin configuration. | trigger:best-practices |
| [[bun]] | Use when building, testing, and deploying JavaScript/TypeScript applications. Reach for Bun when you need to run scripts, manage dependencies, bundle code, or test applications with a single unified tool. | trigger:bun |
| [[chrome-extension-development]] | Expert guidelines for Chrome extension development with Manifest V3, covering security, performance, and best practices | trigger:chrome-extension-development |
| [[composition-patterns]] | React Composition Patterns | trigger:composition-patterns |
| [[core-data-expert]] | 'Expert Core Data guidance (iOS/macOS): stack setup, fetch requests & NSFetchedResultsController, saving/merge conflicts, threading & Swift Concurrency, batch operations & persistent history, migrations, performance, and NSPersistentCloudKitContainer/CloudKit sync.' | trigger:core-data-expert |
| [[csharp-async]] | 'Get best practices for C# async programming' | trigger:csharp-async |
| [[csharp-docs]] | 'Ensure that C# types are documented with XML comments and follow best practices for documentation.' | trigger:csharp-docs |
| [[csharp-nunit]] | 'Get best practices for NUnit unit testing, including data-driven tests' | trigger:csharp-nunit |
| [[csharp-tunit]] | 'Get best practices for TUnit unit testing, including data-driven tests' | trigger:csharp-tunit |
| [[csharp-xunit]] | 'Get best practices for XUnit unit testing, including data-driven tests' | trigger:csharp-xunit |
| [[dart-best-practices]] |   General best practices for Dart development.
  Covers code style, effective Dart, and language features. | trigger:dart-best-practices |
| [[deno-expert]] | Expert-level Deno knowledge for code review, debugging, and best practice enforcement. Use when reviewing Deno code or answering advanced Deno questions. | trigger:deno-expert |
| [[deno-frontend]] | Use when working with Fresh framework, creating routes or handlers in Fresh, building web UIs with Preact, or adding Tailwind CSS in Deno. Covers Fresh 2.x project structure, route handlers, islands, createDefine, PageProps, context patterns, and Fresh 1.x to 2.x migration. Essential for any Fresh-related question. | trigger:deno-frontend |
| [[deno-sandbox]] | Use when building features that execute untrusted user code, AI-generated code, or need isolated code execution environments. Covers the @deno/sandbox SDK. | trigger:deno-sandbox |
| [[deno-typescript]] | Guidelines for developing with Deno and TypeScript using modern runtime features, security model, and native tooling | trigger:deno-typescript |
| [[design-mobile-apps]] | Use when the user wants to design a mobile app, create screens, build UI, or interact with their Sleek projects. Covers high-level requests ("design an app that does X") and specific ones ("list my projects", "create a new project", "screenshot that screen"). | trigger:design-mobile-apps |
| [[drizzle]] | "Type-safe SQL ORM for TypeScript with zero runtime overhead" | trigger:drizzle |
| [[durable-objects]] | Create and review Cloudflare Durable Objects. Use when building stateful coordination (chat rooms, multiplayer games, booking systems), implementing RPC methods, SQLite storage, alarms, WebSockets, or reviewing DO code for best practices. Covers Workers integration, wrangler config, and testing with Vitest. Biases towards retrieval from Cloudflare docs over pre-trained knowledge. | trigger:durable-objects |
| [[elevenlabs-music]] | "ElevenLabs AI music generation - create original music from text prompts via inference.sh CLI. Capabilities: text-to-music, custom duration up to 10 minutes, genre/mood/instrument control, royalty-free commercial use. Use for: background music, soundtracks, jingles, podcasts, video scores, game audio. Triggers: elevenlabs music, eleven labs music, ai music, generate music, music generation, compose music, ai composer, create song, soundtrack, background music, jingle, elevenlabs compose, music ai" | trigger:elevenlabs-music |
| [[elevenlabs-tts]] | "ElevenLabs text-to-speech with 22+ premium voices, multilingual support, and voice tuning via inference.sh CLI. Models: eleven_multilingual_v2 (highest quality), eleven_turbo_v2_5 (low latency), eleven_flash_v2_5 (ultra-fast). Capabilities: text-to-speech, voice selection, stability/style control, 32 languages. Use for: voiceovers, audiobooks, video narration, podcasts, accessibility, IVR. Triggers: elevenlabs, eleven labs, elevenlabs tts, premium tts, professional voice, ai voice, high quality tts, multilingual tts, eleven labs voice, voice generation, natural speech, realistic voice, voice over, speech synthesis" | trigger:elevenlabs-tts |
| [[flask-api-development]] | > | trigger:flask-api-development |
| [[frontend-design]] | Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics. | trigger:frontend-design |
| [[generating-sorbet]] | Generates or updates Sorbet type signatures in separate .rbi files. Triggers when creating, updating, or maintaining type signatures for Ruby source files. | trigger:generating-sorbet |
| [[generating-sorbet-inline]] | Generates or updates Sorbet inline type signatures directly in Ruby source files using sig blocks. Triggers when creating, updating, or maintaining inline type signatures for Ruby source files. | trigger:generating-sorbet-inline |
| [[hono]] | Use when building Hono web applications or when the user asks about Hono APIs, routing, middleware, JSX, validation, testing, or streaming. TRIGGER when code imports from 'hono' or 'hono/*', or user mentions Hono. Use `npx hono request` to test endpoints. | trigger:hono |
| [[instantdb]] | Build complete, functional apps with InstantDB as the backend. Use when creating React/vanilla JS or expo applications. Triggers on requests for building apps. | trigger:instantdb |
| [[java-coding-standards]] | "Java coding standards for Spring Boot services: naming, immutability, Optional usage, streams, exceptions, generics, and project layout." | trigger:java-coding-standards |
| [[java-docs]] | 'Ensure that Java types are documented with Javadoc comments and follow best practices for documentation.' | trigger:java-docs |
| [[java-springboot]] | 'Get best practices for developing applications with Spring Boot.' | trigger:java-springboot |
| [[laravel-patterns]] | Laravel architecture patterns, routing/controllers, Eloquent ORM, service layers, queues, events, caching, and API resources for production apps. | trigger:laravel-patterns |
| [[minimal-api-file-upload]] | File upload endpoints in ASP.NET minimal APIs (.NET 8+) | trigger:minimal-api-file-upload |
| [[native-data-fetching]] | Use when implementing or debugging ANY network request, API call, or data fetching. Covers fetch API, React Query, SWR, error handling, caching, offline support, and Expo Router data loaders (`useLoaderData`). | trigger:native-data-fetching |
| [[organization]] | Configure multi-tenant organizations, manage members and invitations, define custom roles and permissions, set up teams, and implement RBAC using Better Auth's organization plugin. Use when users need org setup, team management, member roles, access control, or the Better Auth organization plugin. | trigger:organization |
| [[oxlint]] | "Run and configure oxlint — the high-performance JavaScript/TypeScript linter built on the Oxc compiler stack. Use this skill whenever working in a project that has oxlint installed (check for `oxlint` in package.json devDependencies or an `.oxlintrc.json` / `oxlint.config.ts` config file). This includes when you need to lint code after making changes, fix linting errors, configure oxlint rules/plugins, set up or modify `.oxlintrc.json`, or migrate from ESLint." | trigger:oxlint |
| [[pandas-data-analysis]] | Master data manipulation, analysis, and visualization with Pandas, NumPy, and Matplotlib | trigger:pandas-data-analysis |
| [[pandas-pro]] | Performs pandas DataFrame operations for data analysis, manipulation, and transformation. Use when working with pandas DataFrames, data cleaning, aggregation, merging, or time series analysis. Invoke for data manipulation tasks such as joining DataFrames on multiple keys, pivoting tables, resampling time series, handling NaN values with interpolation or forward-fill, groupby aggregations, type conversion, or performance optimization of large datasets. | trigger:pandas-pro |
| [[php-pro]] | Use when building PHP applications with modern PHP 8.3+ features, Laravel, or Symfony frameworks. Invokes strict typing, PHPStan level 9, async patterns with Swoole, and PSR standards. Creates controllers, configures middleware, generates migrations, writes PHPUnit/Pest tests, defines typed DTOs and value objects, sets up dependency injection, and scaffolds REST/GraphQL APIs. Use when working with Eloquent, Doctrine, Composer, Psalm, ReactPHP, or any PHP API development. | trigger:php-pro |
| [[pr_review]] | Guidelines and tools for reviewing pull requests in the Angular repository. | trigger:pr_review |
| [[pydantic]] | Python data validation using type hints and runtime type checking with Pydantic v2's Rust-powered core for high-performance validation in FastAPI, Django, and configuration management. | trigger:pydantic |
| [[refactor-module]] | Transform monolithic Terraform configurations into reusable, maintainable modules following HashiCorp's module design principles and community best practices. | trigger:refactor-module |
| [[reference-compiler-cli]] | Explains the mental model and architecture of the code under `packages/compiler-cli`. You MUST use this skill any time you plan to work with code in `packages/compiler-cli` | trigger:reference-compiler-cli |
| [[reference-core]] | Explains the mental model and architecture of the code under `packages/core`. You MUST use this skill any time you plan to work with code in `packages/core` | trigger:reference-core |
| [[reference-signal-forms]] | Explains the mental model and architecture of the code under `packages/forms/signals`. You MUST use this skill any time you plan to work with code in `packages/forms/signals` | trigger:reference-signal-forms |
| [[remotion]] | Best practices for Remotion - Video creation in React | trigger:remotion |
| [[ruby]] | Use when writing, reviewing, or debugging pure Ruby code — idiomatic patterns, modern 3.x+ features (pattern matching, Data.define, endless methods), error handling conventions (raise vs fail, result objects), memoization, and performance idioms. For Rails use rails-guides. For testing use minitest. For code style use sandi-metz-rules. | trigger:ruby |
| [[seo]] | Optimize for search engine visibility and ranking. Use when asked to "improve SEO", "optimize for search", "fix meta tags", "add structured data", "sitemap optimization", or "search engine optimization". | trigger:seo |
| [[tauri-v2]] | "Tauri v2+ cross-platform app development with Rust backend. Use when configuring tauri.conf.json, implementing Rust commands (#[tauri::command]), setting up IPC patterns (invoke, emit, channels), configuring permissions/capabilities, troubleshooting build issues, or deploying desktop/mobile apps. Triggers on Tauri, src-tauri, invoke, emit, capabilities.json." | trigger:tauri-v2 |
| [[twoFactor]] | Configure TOTP authenticator apps, send OTP codes via email/SMS, manage backup codes, handle trusted devices, and implement 2FA sign-in flows using Better Auth's twoFactor plugin. Use when users need MFA, multi-factor authentication, authenticator setup, or login security with Better Auth. | trigger:twoFactor |
| [[use-dom]] | Use Expo DOM components to run web code in a webview on native and as-is on web. Migrate web code to native incrementally. | trigger:use-dom |
| [[vite]] | Vite build tool configuration, plugin API, SSR, and Vite 8 Rolldown migration. Use when working with Vite projects, vite.config.ts, Vite plugins, or building libraries/SSR apps with Vite. | trigger:vite |
| [[web-perf]] | Analyzes web performance using Chrome DevTools MCP. Measures Core Web Vitals (LCP, INP, CLS) and supplementary metrics (FCP, TBT, Speed Index), identifies render-blocking resources, network dependency chains, layout shifts, caching issues, and accessibility gaps. Use when asked to audit, profile, debug, or optimize page load performance, Lighthouse scores, or site speed. Biases towards retrieval from current documentation over pre-trained knowledge. | trigger:web-perf |
| [[wordpress-router]] | "Use when the user asks about WordPress codebases (plugins, themes, block themes, Gutenberg blocks, WP core checkouts) and you need to quickly classify the repo and route to the correct workflow/skill (blocks, theme.json, REST API, WP-CLI, performance, security, testing, release packaging)." | trigger:wordpress-router |
| [[workers-best-practices]] | Reviews and authors Cloudflare Workers code against production best practices. Load when writing new Workers, reviewing Worker code, configuring wrangler.jsonc, or checking for common Workers anti-patterns (streaming, floating promises, global state, secrets, bindings, observability). Biases towards retrieval from Cloudflare docs over pre-trained knowledge. | trigger:workers-best-practices |
| [[wp-block-development]] | "Use when developing WordPress (Gutenberg) blocks: block.json metadata, register_block_type(_from_metadata), attributes/serialization, supports, dynamic rendering (render.php/render_callback), deprecations/migrations, viewScript vs viewScriptModule, and @wordpress/scripts/@wordpress/create-block build and test workflows." | trigger:wp-block-development |
| [[wp-block-themes]] | "Use when developing WordPress block themes: theme.json (global settings/styles), templates and template parts, patterns, style variations, and Site Editor troubleshooting (style hierarchy, overrides, caching)." | trigger:wp-block-themes |
| [[wp-performance]] | "Use when investigating or improving WordPress performance (backend-only agent): profiling and measurement (WP-CLI profile/doctor, Server-Timing, Query Monitor via REST headers), database/query optimization, autoloaded options, object caching, cron, HTTP API calls, and safe verification." | trigger:wp-performance |
| [[wp-plugin-development]] | "Use when developing WordPress plugins: architecture and hooks, activation/deactivation/uninstall, admin UI and Settings API, data storage, cron/tasks, security (nonces/capabilities/sanitization/escaping), and release packaging." | trigger:wp-plugin-development |
| [[wp-project-triage]] | "Use when you need a deterministic inspection of a WordPress repository (plugin/theme/block theme/WP core/Gutenberg/full site) including tooling/tests/version hints, and a structured JSON report to guide workflows and guardrails." | trigger:wp-project-triage |
| [[wp-rest-api]] | "Use when building, extending, or debugging WordPress REST API endpoints/routes: register_rest_route, WP_REST_Controller/controller classes, schema/argument validation, permission_callback/authentication, response shaping, register_rest_field/register_meta, or exposing CPTs/taxonomies via show_in_rest." | trigger:wp-rest-api |
| [[wp-wpcli-and-ops]] | "Use when working with WP-CLI (wp) for WordPress operations: safe search-replace, db export/import, plugin/theme/user/content management, cron, cache flushing, multisite, and scripting/automation with wp-cli.yml." | trigger:wp-wpcli-and-ops |
| [[wrangler]] | Cloudflare Workers CLI for deploying, developing, and managing Workers, KV, R2, D1, Vectorize, Hyperdrive, Workers AI, Containers, Queues, Workflows, Pipelines, and Secrets Store. Load before running wrangler commands to ensure correct syntax and best practices. Biases towards retrieval from Cloudflare docs over pre-trained knowledge. | trigger:wrangler |
| [[zod]] | Zod schema validation best practices for type safety, parsing, and error handling. This skill should be used when defining z.object schemas, using z.string validations, safeParse, or z.infer. This skill does NOT cover React Hook Form integration patterns (use react-hook-form skill) or OpenAPI client generation (use orval skill). | trigger:zod |
### 🧱 Nền tảng

| Skill | Mô tả | Trigger |
|-------|-------|---------|
| [[coding-standards]] | Tiêu chuẩn viết code, module hóa, MCP compatibility | Khi code bất kỳ file nào |
| [[verification-protocol]] | Quy trình kiểm chứng, testing, validation | Trước khi tuyên bố hoàn thành |
| [[communication-protocol]] | Ultra-Terse Mode, Caveman communication | Mọi giao tiếp với user |
| [[state-management]] | Data Plane an toàn, atomic writes, state.json | Khi đọc/ghi trạng thái workspace |

### 🧠 Quản trị Tri thức

| Skill | Mô tả | Trigger |
|-------|-------|---------|
| [[knowledge-management]] | Quản lý wiki, indexing, differential processing | Khi đọc/ghi knowledge base |
| [[obsidian-formatting]] | Wiki-links, graph weaving, tag standards | Khi tạo/sửa file markdown |

### ⚙️ Xử lý Nâng cao

| Skill | Moả tả | Trigger |
|-------|--------|---------|
| [[big-data-processing]] | Chunking, orchestrator-worker pattern | Khi xử lý file > 50KB |
| [[automation-directives]] | O(1) query, self-learning, cron jobs | Khi thiết kế automation |

### 🎨 Giao diện & Trải nghiệm

| Skill | Mô tả | Trigger |
|-------|-------|---------|
| [[ui-vibe-coding]] | Design system, DESIGN.md integration | Khi code UI/Frontend |

### 🔒 Bảo mật & An toàn

| Skill | Mô tả | Trigger |
|-------|-------|---------|
| [[security-sandbox]] | Docker isolation, safe execution | Khi chạy code nguy hiểm |

### 🧬 Tiến hóa

| Skill | Mô tả | Trigger |
|-------|-------|---------|
| [[evolution-protocol]] | Changelog, memory commit, state management | Sau mỗi phiên làm việc |

### 🚀 Deployment & Khởi động

| Skill | Mô tả | Trigger |
|-------|-------|---------|
| [[module-discord]] | Khởi động Discord Bot qua kato-boot.bat | Khi user yêu cầu start Discord |

---

## 🔗 Liên kết

- [[AGENTS]] - Router định tuyến vai trò
- [[../index]] - Bản đồ tri thức tổng
- [[../core/master-vision]] - Tầm nhìn cốt lõi

#skill #index #workflow #sop