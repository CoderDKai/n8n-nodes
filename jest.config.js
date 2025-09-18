module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/nodes', '<rootDir>/credentials'],
	testMatch: ['**/__tests__/**/*.test.ts'],
	collectCoverageFrom: [
		'nodes/**/*.ts',
		'credentials/**/*.ts',
		'!**/__tests__/**',
		'!**/*.d.ts',
	],
	setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
	moduleFileExtensions: ['ts', 'js', 'json'],
	transform: {
		'^.+\\.ts$': 'ts-jest',
	},
};