export class TargetResolver {
  private targets: Map<string, any> = new Map();

  registerTarget(id: string, ref: any, layout: any) {
    this.targets.set(id, { ref, layout });
  }

  unregisterTarget(id: string) {
    this.targets.delete(id);
  }

  resolve(id: string): any {
    return this.targets.get(id) || null;
  }
}
