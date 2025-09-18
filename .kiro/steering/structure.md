# Project Structure

## Root Level Files
- `package.json`: Package configuration with n8n-specific metadata
- `tsconfig.json`: TypeScript configuration with strict settings
- `.eslintrc.js`: ESLint configuration with n8n-specific rules
- `.eslintrc.prepublish.js`: Stricter linting for pre-publish checks
- `gulpfile.js`: Build tasks for asset copying
- `index.js`: Package entry point

## Core Directories

### `/nodes/`
Contains n8n node implementations. Each node gets its own subdirectory:
- `NodeName/NodeName.node.ts`: Main node class implementing `INodeType`
- `NodeName/NodeName.node.json`: Optional node metadata
- `NodeName/*.svg`: Node icons (copied to dist during build)
- Supporting files like description modules

**Naming Convention**: 
- Directory: PascalCase matching node name
- Files: `NodeName.node.ts` format

### `/credentials/`
Contains credential type definitions for API authentication:
- `ServiceName.credentials.ts`: Implements `ICredentialType`
- Defines authentication properties and test methods

**Naming Convention**: 
- Files: `ServiceNameApi.credentials.ts` format
- Class names: End with "Api" suffix

## Configuration Files
- `.editorconfig`: Editor formatting rules
- `.prettierrc.js`: Prettier configuration
- `.gitignore`: Git ignore patterns
- `.npmignore`: npm publish ignore patterns

## Build Artifacts
- `/dist/`: Compiled output (git-ignored, npm-published)
  - Mirrors source structure with compiled `.js` files
  - Includes copied icons and assets

## n8n Integration
The `package.json` includes n8n-specific configuration:
- `n8n.credentials[]`: Array of credential file paths in dist
- `n8n.nodes[]`: Array of node file paths in dist
- `n8n.n8nNodesApiVersion`: API version compatibility