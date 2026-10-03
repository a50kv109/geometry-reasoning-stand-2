// src/kernel/research/researchFindingStore.ts
// Phase 3A — Resilient JSONL Persistent Store for Research Findings

import { ResearchFinding } from './researchFinding';

export class ResearchFindingStore {
  private filepath: string = 'research_findings.jsonl';
  private findings: Map<string, ResearchFinding> = new Map();
  private isFsAvailable: boolean = false;

  // Track skipped/corrupted records count for reporting and isolation checks
  public corruptedRecordsCount: number = 0;
  public lastError: string | null = null;

  constructor(filepath?: string) {
    if (filepath) {
      this.filepath = filepath;
    }
    // Probe filesystem availability safely
    try {
      if (typeof process !== 'undefined' && process.release && process.version) {
        this.isFsAvailable = true;
      }
    } catch {
      this.isFsAvailable = false;
    }
  }

  public addFinding(finding: ResearchFinding): void {
    this.findings.set(finding.findingId, finding);
  }

  public getFinding(id: string): ResearchFinding | undefined {
    return this.findings.get(id);
  }

  public findBySnapshot(snapshot: string, version: string): ResearchFinding | undefined {
    for (const finding of this.findings.values()) {
      if (finding.fingerprintSnapshot === snapshot && finding.fingerprintVersion === version) {
        return finding;
      }
    }
    return undefined;
  }

  public listFindings(): ResearchFinding[] {
    return Array.from(this.findings.values());
  }

  public clearInMemory(): void {
    this.findings.clear();
    this.corruptedRecordsCount = 0;
    this.lastError = null;
  }

  /**
   * Persists all currently held findings into the JSONL file.
   * Leverages atomic replacement logic if filesystem is available.
   */
  public async save(): Promise<void> {
    if (!this.isFsAvailable) {
      // Fallback for browser client context to prevent failures
      return;
    }

    try {
      const fs = await import('fs');
      const lines: string[] = [];
      for (const finding of this.findings.values()) {
        lines.push(JSON.stringify(finding));
      }
      const data = lines.join('\n') + '\n';

      // Atomic replace strategy using temporary file
      const tempPath = `${this.filepath}.tmp`;
      fs.writeFileSync(tempPath, data, 'utf-8');
      fs.renameSync(tempPath, this.filepath);
    } catch (err: any) {
      this.lastError = err.message || String(err);
      throw new Error(`PERSISTENCE_FAILURE: Could not write findings store: ${err.message}`);
    }
  }

  /**
   * Loads findings from JSONL file with robust, corrupted-record tolerant parsing.
   */
  public async load(): Promise<void> {
    if (!this.isFsAvailable) {
      return;
    }

    try {
      const fs = await import('fs');
      if (!fs.existsSync(this.filepath)) {
        return;
      }

      const content = fs.readFileSync(this.filepath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const finding: ResearchFinding = JSON.parse(trimmed);
          if (finding && finding.findingId && finding.schemaVersion) {
            this.findings.set(finding.findingId, finding);
          } else {
            this.corruptedRecordsCount++;
          }
        } catch (parseErr) {
          // Robust parser: skip corrupted or partially written lines
          this.corruptedRecordsCount++;
        }
      }
    } catch (err: any) {
      this.lastError = err.message || String(err);
      throw new Error(`RELOAD_FAILURE: Could not load findings store: ${err.message}`);
    }
  }
}
