# Technology Stack

## Core Technologies
- **TypeScript**: Primary development language with strict configuration
- **Node.js**: Runtime environment (minimum version 20.15)
- **pnpm**: Package manager for dependency management
- **n8n-workflow**: Peer dependency for n8n integration types and utilities

## Build System & Tools
- **TypeScript Compiler**: Compiles to CommonJS modules targeting ES2019
- **Gulp**: Asset pipeline for copying icons and resources
- **ESLint**: Code linting with n8n-specific rules via `eslint-plugin-n8n-nodes-base`
- **Prettier**: Code formatting

## Package Manager
- **pnpm**: Fast, disk space efficient package manager

## Development Dependencies
- `@typescript-eslint/parser`: TypeScript parsing for ESLint
- `eslint-plugin-n8n-nodes-base`: n8n-specific linting rules
- `gulp`: Build automation
- `prettier`: Code formatting
- `typescript`: TypeScript compiler

## Common Commands

### Development
```bash
pnpm dev          # Watch mode compilation
pnpm build        # Full build (compile + copy icons)
pnpm format       # Format code with Prettier
```

### Quality Assurance
```bash
pnpm lint         # Run ESLint checks
pnpm lintfix      # Auto-fix ESLint issues
```

### Publishing
```bash
pnpm prepublishOnly  # Pre-publish checks (build + lint with strict rules)
```

## Build Output
- Compiled JavaScript files output to `dist/` directory
- Icons and assets copied from source to corresponding `dist/` locations
- Only `dist/` folder is included in published package