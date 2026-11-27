import readmeRaw from '../../README.md?raw';
import projectPlanRaw from '../../docs/PROJECT_PLAN.md?raw';
import architectureRaw from '../../docs/ARCHITECTURE.md?raw';
import roadmapRaw from '../../docs/ROADMAP.md?raw';
import integrationRaw from '../../docs/INTEGRATION.md?raw';
import securityRaw from '../../docs/SECURITY.md?raw';

export interface RepoDocEntry {
  readonly id: string;
  readonly filename: string;
  readonly title: string;
  readonly summary: string;
  readonly content: string;
}

export const REPO_DOCS: readonly RepoDocEntry[] = [
  {
    id: 'readme',
    filename: 'README.md',
    title: 'Mission & Design Rules',
    summary: 'Repository baseline, DIPINDIA-first rule, target layout, and 8 core design rules.',
    content: readmeRaw,
  },
  {
    id: 'architecture',
    filename: 'docs/ARCHITECTURE.md',
    title: 'Architecture & Boundaries',
    summary: 'Dependency direction, proposed modules, money/time/state rules, and provider boundaries.',
    content: architectureRaw,
  },
  {
    id: 'project-plan',
    filename: 'docs/PROJECT_PLAN.md',
    title: 'Project Plan',
    summary: 'Workstreams WS1–WS7, delivery phases 0–6, priorities, and acceptance criteria.',
    content: projectPlanRaw,
  },
  {
    id: 'roadmap',
    filename: 'docs/ROADMAP.md',
    title: 'Roadmap & Release Gates',
    summary: 'Milestones C0–C8 across P0/P1/P2 priorities and production adoption gates.',
    content: roadmapRaw,
  },
  {
    id: 'integration',
    filename: 'docs/INTEGRATION.md',
    title: 'Ecosystem Integration Contract',
    summary: 'Consumer matrix across DIPINDIA, dip-api, dip-ui, dip-sdk, and prohibited patterns.',
    content: integrationRaw,
  },
  {
    id: 'security',
    filename: 'docs/SECURITY.md',
    title: 'Security Requirements',
    summary: 'Input trust, sensitive data handling, authorization boundaries, and financial correctness.',
    content: securityRaw,
  },
];

export interface RoadmapMilestone {
  readonly id: string;
  readonly name: string;
  readonly priority: 'P0' | 'P1' | 'P2';
  readonly deliverable: string;
  readonly dependsOn: string;
  readonly statusInWorkbench: 'Prototyped in Core' | 'Pending DIPINDIA Audit' | 'Planned';
}

export const ROADMAP_MILESTONES: readonly RoadmapMilestone[] = [
  {
    id: 'C0',
    name: 'DIPINDIA domain discovery',
    priority: 'P0',
    deliverable: 'Source map and glossary',
    dependsOn: 'DIPINDIA audit',
    statusInWorkbench: 'Pending DIPINDIA Audit',
  },
  {
    id: 'C1',
    name: 'Package foundation',
    priority: 'P0',
    deliverable: 'Typed package, build and test standards',
    dependsOn: 'C0',
    statusInWorkbench: 'Prototyped in Core',
  },
  {
    id: 'C2',
    name: 'Common primitives',
    priority: 'P0',
    deliverable: 'IDs, errors, money/time, results',
    dependsOn: 'C1',
    statusInWorkbench: 'Prototyped in Core',
  },
  {
    id: 'C3',
    name: 'Workflow contracts',
    priority: 'P0',
    deliverable: 'Application state and transitions',
    dependsOn: 'C0–C2',
    statusInWorkbench: 'Prototyped in Core',
  },
  {
    id: 'C4',
    name: 'Catalogue and forms',
    priority: 'P1',
    deliverable: 'Service, pricing and form schemas',
    dependsOn: 'C2',
    statusInWorkbench: 'Prototyped in Core',
  },
  {
    id: 'C5',
    name: 'Documents and payments',
    priority: 'P1',
    deliverable: 'Requirement and payment domain models',
    dependsOn: 'C2',
    statusInWorkbench: 'Prototyped in Core',
  },
  {
    id: 'C6',
    name: 'Consumer adapters',
    priority: 'P1',
    deliverable: 'DIPINDIA compatibility layer',
    dependsOn: 'C3–C5',
    statusInWorkbench: 'Pending DIPINDIA Audit',
  },
  {
    id: 'C7',
    name: 'Versioned release',
    priority: 'P1',
    deliverable: 'Changelog and consumer contract checks',
    dependsOn: 'C6',
    statusInWorkbench: 'Planned',
  },
  {
    id: 'C8',
    name: 'Advanced domain tooling',
    priority: 'P2',
    deliverable: 'Schema generation and property tests',
    dependsOn: 'C7',
    statusInWorkbench: 'Planned',
  },
];
