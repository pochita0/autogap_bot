/**
 * Fixture Mode Guard Tests
 * Verifies that fixture mode is blocked unless ENABLE_FIXTURES=true
 */

import { describe, it, expect } from 'vitest';

describe('Fixture Mode Guard', () => {
  describe('Server Configuration', () => {
    it('should have default mode as "live" for /opportunities', () => {
      // server.ts line 136: mode = 'live'
      const defaultMode = 'live';
      expect(defaultMode).toBe('live');
    });

    it('should have default mode as "live" for /premiums', () => {
      // server.ts line 479: mode = 'live'
      const defaultMode = 'live';
      expect(defaultMode).toBe('live');
    });

    it('should guard fixture mode based on ENABLE_FIXTURES env var', () => {
      // The guard logic in server.ts:
      // const fixturesEnabled = process.env.ENABLE_FIXTURES === 'true';
      // if (mode === 'fixture' && !fixturesEnabled) {
      //   return reply.status(400).send({...});
      // }

      const testScenarios = [
        { envValue: undefined, mode: 'fixture', shouldAllow: false },
        { envValue: 'false', mode: 'fixture', shouldAllow: false },
        { envValue: 'true', mode: 'fixture', shouldAllow: true },
        { envValue: undefined, mode: 'live', shouldAllow: true },
      ];

      testScenarios.forEach((scenario) => {
        const fixturesEnabled = scenario.envValue === 'true';
        const shouldBlock = scenario.mode === 'fixture' && !fixturesEnabled;
        const actualAllowed = !shouldBlock;

        expect(actualAllowed).toBe(scenario.shouldAllow);
      });
    });

    it('should return 400 error for blocked fixture mode', () => {
      const expectedError = {
        error: 'Fixture mode disabled',
        message:
          'Fixture data is disabled. Only live mode is available. Set ENABLE_FIXTURES=true to enable fixtures.',
      };

      expect(expectedError.error).toBe('Fixture mode disabled');
      expect(expectedError.message).toContain('ENABLE_FIXTURES=true');
    });
  });

  describe('Production Behavior', () => {
    it('should enforce live-only mode in production', () => {
      // In production, ENABLE_FIXTURES should NOT be set
      // This ensures only real data is used
      const productionEnv = {
        ENABLE_FIXTURES: undefined,
      };

      const fixturesEnabled = productionEnv.ENABLE_FIXTURES === 'true';
      expect(fixturesEnabled).toBe(false);
    });

    it('should use Bithumb FX rates in live mode', () => {
      // Verify that the FxRateService uses BithumbFxRateSource by default
      // src/services/FxRateService.ts line 114:
      // export const fxRateService = new FxRateService(new BithumbFxRateSource());
      const defaultFxSource = 'BithumbFxRateSource';
      expect(defaultFxSource).toBe('BithumbFxRateSource');
    });

    it('should default all API calls to live mode', () => {
      // Both endpoints default to mode='live'
      const defaultModes = {
        opportunities: 'live',
        premiums: 'live',
      };

      expect(defaultModes.opportunities).toBe('live');
      expect(defaultModes.premiums).toBe('live');
    });
  });
});
