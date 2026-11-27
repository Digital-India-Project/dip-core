import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as core from '../../src/core/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');

interface IntegrationManifest {
  packageName: string;
  repositoryVersion: string;
  entrypoints: {
    main: string;
    types: string;
  };
  publicExports: string[];
  environmentVariables: string[];
}

interface ContractVectors {
  syntheticOnly: boolean;
  pricingQuoteVectors: Array<{
    name: string;
    serviceId: string;
    quantity: number;
    concession: core.ConcessionTier;
    roundingMode: core.RoundingMode;
    expected: {
      statutorySubtotalPaise: number;
      facilitationTaxablePaise: number;
      gstAmountPaise: number;
      totalPayablePaise: number;
    };
  }>;
  rupeeToPaiseVectors: Array<{ rupees: number; expectedPaise: number }>;
  applicationStatusMappingVectors: Array<{ legacy: string; core: core.ApplicationState }>;
  cashfreeStatusMappingVectors: Array<{ provider: string; core: core.PaymentState }>;
}

describe('Integration Manifest & Shared Contract Vectors', () => {
  it('keeps integration/manifest.json synchronized with package.json, .env.example, and core exports', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'integration', 'manifest.json'), 'utf8')
    ) as IntegrationManifest;
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8')) as {
      name: string;
      version: string;
      main: string;
      types: string;
    };

    assert.equal(manifest.packageName, pkg.name);
    assert.equal(manifest.repositoryVersion, pkg.version);
    assert.equal(manifest.entrypoints.main, pkg.main);
    assert.equal(manifest.entrypoints.types, pkg.types);
    assert.equal(
      manifest.repositoryVersion,
      core.formatSchemaVersion(core.CORE_CONTRACT_VERSION)
    );

    const actualExports = Object.keys(core).sort();
    assert.deepEqual([...manifest.publicExports].sort(), actualExports);

    const envExample = fs.readFileSync(path.join(ROOT_DIR, '.env.example'), 'utf8');
    const envKeys = envExample
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => l.split('=')[0]);
    assert.deepEqual([...manifest.environmentVariables].sort(), envKeys.sort());
  });

  it('executes shared cross-repository synthetic contract vectors', () => {
    const vectors = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'tests', 'fixtures', 'contract-vectors.json'), 'utf8')
    ) as ContractVectors;

    assert.equal(vectors.syntheticOnly, true);

    for (const v of vectors.pricingQuoteVectors) {
      const svc = core.SYNTHETIC_SERVICES.find((s) => s.id === v.serviceId);
      assert.ok(svc, `Missing synthetic service ${v.serviceId}`);
      const res = core.calculateServiceQuote({
        service: svc,
        quantity: v.quantity,
        concession: v.concession,
        roundingMode: v.roundingMode,
      });
      assert.equal(res.ok, true, `${v.name} failed`);
      if (res.ok) {
        assert.equal(res.value.statutorySubtotal.minorUnits, v.expected.statutorySubtotalPaise);
        assert.equal(res.value.facilitationTaxable.minorUnits, v.expected.facilitationTaxablePaise);
        assert.equal(res.value.gstAmount.minorUnits, v.expected.gstAmountPaise);
        assert.equal(res.value.totalPayable.minorUnits, v.expected.totalPayablePaise);
      }
    }

    for (const rv of vectors.rupeeToPaiseVectors) {
      const r = core.convertRupeesToPaise(rv.rupees);
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.value.minorUnits, rv.expectedPaise);
    }

    for (const av of vectors.applicationStatusMappingVectors) {
      const r = core.mapLegacyApplicationStatus(av.legacy);
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.value, av.core);
    }

    for (const pv of vectors.cashfreeStatusMappingVectors) {
      const r = core.mapLegacyPaymentStatus(pv.provider);
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.value, pv.core);
    }
  });

  it('validates page request sort/filter arrays and form schema definitions', () => {
    const badSortArr = core.createPageRequest(
      { page: 1, pageSize: 10, sort: [{ field: 'secretKey', direction: 'asc' }] },
      ['updatedAt']
    );
    assert.equal(badSortArr.ok, false);

    const badFilter = core.createPageRequest({
      page: 1,
      pageSize: 10,
      filters: { criteria: [{ field: '__proto__', operator: 'eq', value: 'x' }] },
    });
    assert.equal(badFilter.ok, false);

    const dupSchemaRes = core.validateFormSchemaDefinition({
      schemaId: 'dup.test',
      version: '1.0.0',
      allowUnknownKeys: false,
      fields: [
        { key: 'name', label: 'Name', kind: 'text', required: true },
        { key: 'name', label: 'Duplicate', kind: 'text', required: false },
      ],
    });
    assert.equal(dupSchemaRes.ok, false);
  });
});
