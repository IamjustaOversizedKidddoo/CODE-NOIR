import AdmZip from 'adm-zip';

export type BenchmarkTier = 'TINY' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'VERY_LARGE' | 'POLYGLOT' | 'MONOREPO';

export function createBenchmarkArchive(tier: BenchmarkTier): Buffer {
  const zip = new AdmZip();

  switch (tier) {
    case 'TINY': {
      // 10 files
      zip.addFile('package.json', Buffer.from(JSON.stringify({ name: 'bench-tiny', dependencies: { express: '^4.18.2' } })));
      zip.addFile('tsconfig.json', Buffer.from('{"compilerOptions": {"target": "ES2022"}}'));
      for (let i = 1; i <= 8; i++) {
        zip.addFile(
          `src/module_${i}.ts`,
          Buffer.from(`
import { helper_${i > 1 ? i - 1 : 1} } from './helper_${i > 1 ? i - 1 : 1}';

export function processItem_${i}(id: string): string {
  return "processed_" + id;
}

export function helper_${i}(val: number): number {
  return val * ${i};
}
`)
        );
      }
      break;
    }

    case 'SMALL': {
      // 50 files
      zip.addFile('package.json', Buffer.from(JSON.stringify({ name: 'bench-small', dependencies: { next: '15.0.0', react: '19.0.0' } })));
      for (let i = 1; i <= 48; i++) {
        zip.addFile(
          `src/components/Comp_${i}.tsx`,
          Buffer.from(`
export interface CompProps_${i} { id: string; count: number; }
export function Comp_${i}(props: CompProps_${i}) {
  return <div>Component ${i} #{props.id}</div>;
}
`)
        );
      }
      zip.addFile('README.md', Buffer.from('# Small Benchmark Case\n50 file sample.'));
      break;
    }

    case 'MEDIUM': {
      // 150 files
      zip.addFile('package.json', Buffer.from(JSON.stringify({ name: 'bench-medium', dependencies: { '@nestjs/core': '^10.0.0' } })));
      for (let i = 1; i <= 148; i++) {
        zip.addFile(
          `src/services/Service_${i}.ts`,
          Buffer.from(`
export class Service_${i} {
  public executeTask_${i}(data: any) {
    return { status: 'ok', step: ${i} };
  }
}
`)
        );
      }
      zip.addFile('README.md', Buffer.from('# Medium Benchmark Case\n150 file sample.'));
      break;
    }

    case 'LARGE': {
      // 550 files
      zip.addFile('package.json', Buffer.from(JSON.stringify({ name: 'bench-large', dependencies: { express: '^4.18.2' } })));
      for (let i = 1; i <= 548; i++) {
        zip.addFile(
          `src/domain/entity_${i}.ts`,
          Buffer.from(`
export interface Entity_${i} { id: string; version: number; }
export function validateEntity_${i}(e: Entity_${i}): boolean {
  return e.version > 0;
}
`)
        );
      }
      zip.addFile('README.md', Buffer.from('# Large Benchmark Case\n550 file sample.'));
      break;
    }

    case 'VERY_LARGE': {
      // 2100 files
      zip.addFile('package.json', Buffer.from(JSON.stringify({ name: 'bench-very-large', dependencies: { typescript: '^5.0.0' } })));
      for (let i = 1; i <= 2098; i++) {
        zip.addFile(
          `src/generated/model_${i}.ts`,
          Buffer.from(`
export interface GeneratedModel_${i} { id: number; field_${i}: string; }
export const SCHEMA_VERSION_${i} = ${i};
`)
        );
      }
      zip.addFile('README.md', Buffer.from('# Very Large Benchmark Case\n2100 file sample.'));
      break;
    }

    case 'POLYGLOT': {
      // Polyglot repository
      zip.addFile('package.json', Buffer.from('{"name": "polyglot-case", "dependencies": {"express": "^4.18.2"}}'));
      zip.addFile('src/index.ts', Buffer.from('export function startNode() { return "Node service"; }'));
      zip.addFile('requirements.txt', Buffer.from('fastapi==0.100.0\n'));
      zip.addFile('server/main.py', Buffer.from('def start_python(): return "Python service"'));
      zip.addFile('go.mod', Buffer.from('module example.com/go-svc\ngo 1.21\n'));
      zip.addFile('cmd/main.go', Buffer.from('package main\nfunc StartGo() string { return "Go service" }'));
      zip.addFile('Cargo.toml', Buffer.from('[package]\nname = "rust-svc"\nversion = "0.1.0"\n'));
      zip.addFile('src/lib.rs', Buffer.from('pub fn start_rust() -> &\'static str { "Rust service" }'));
      zip.addFile('Dockerfile', Buffer.from('FROM node:20-alpine\nCMD ["node", "src/index.js"]\n'));
      zip.addFile('infra/main.tf', Buffer.from('resource "aws_s3_bucket" "b" { bucket = "my-bucket" }\n'));
      break;
    }

    case 'MONOREPO': {
      // Monorepo with workspaces
      zip.addFile('pnpm-workspace.yaml', Buffer.from("packages:\n  - 'apps/*'\n  - 'packages/*'\n"));
      zip.addFile('turbo.json', Buffer.from('{"pipeline": {"build": {}}}'));
      for (let a = 1; a <= 3; a++) {
        zip.addFile(`apps/app_${a}/package.json`, Buffer.from(`{"name": "@monorepo/app-${a}", "dependencies": {"next": "15.0.0"}}`));
        zip.addFile(`apps/app_${a}/src/page.tsx`, Buffer.from(`export default function App${a}() { return <div>App ${a}</div>; }`));
      }
      for (let p = 1; p <= 5; p++) {
        zip.addFile(`packages/pkg_${p}/package.json`, Buffer.from(`{"name": "@monorepo/pkg-${p}", "version": "1.0.0"}`));
        zip.addFile(`packages/pkg_${p}/src/index.ts`, Buffer.from(`export interface PkgDto_${p} { id: string; }`));
      }
      break;
    }
  }

  return zip.toBuffer();
}
