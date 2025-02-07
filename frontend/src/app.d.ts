import "unplugin-icons/types/svelte";
import { RPC } from "../../backend/src/index";
export * from "../../shared";

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    interface Platform {
      env: {
        BACKEND: RPC;
      };
    }
  }
}

export {};
