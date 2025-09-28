/** @type {import('jest').Config} */
const config = {
  // 테스트 환경
  testEnvironment: 'node',

  // 테스트 파일 패턴
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],

  // 변환 설정
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'esnext',
        target: 'es2020',
        moduleResolution: 'bundler',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true
      }
    }]
  },

  // 모듈 해석
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },

  // 확장자 해석
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // 설정 파일
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // 커버리지 설정
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'core/**/*.{ts,tsx}',
    'data/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.test.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
    '!**/node_modules/**',
    '!**/.next/**'
  ],

  // 커버리지 임계값
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // 계약 테스트는 더 높은 커버리지 요구
    'tests/contract/**/*.test.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },

  // 커버리지 리포터
  coverageReporters: ['text', 'lcov', 'html'],

  // 테스트 타임아웃 (각 프로젝트에서 개별 설정)

  // 병렬 실행
  maxWorkers: '50%',

  // 캐시 설정
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  // 상세 출력
  verbose: true,

  // 에러 시 즉시 중단하지 않음
  bail: false,

  // 테스트 결과 알림 비활성화 (의존성 문제 방지)
  notify: false,

  // 감시 모드 설정
  watchman: true,

  // 전역 설정
  globals: {
    'ts-jest': {
      useESM: true
    }
  },

  // ESM 지원
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // 테스트 환경별 설정
  projects: [
    {
      displayName: 'contract-tests',
      testMatch: ['<rootDir>/tests/contract/**/*.test.ts'],
      coverageThreshold: {
        global: {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      }
    },
    {
      displayName: 'unit-tests',
      testMatch: [
        '<rootDir>/app/**/*.test.ts',
        '<rootDir>/core/**/*.test.ts',
        '<rootDir>/data/**/*.test.ts'
      ],
      coverageThreshold: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    },
    {
      displayName: 'integration-tests',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testTimeout: 60000,
      coverageThreshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  ]
};

module.exports = config;
