export function bindMethods<T extends Object>(obj: T): T {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "function") {
      (obj as any)[key] = value.bind(obj);
    }
  }
  return obj;
}
