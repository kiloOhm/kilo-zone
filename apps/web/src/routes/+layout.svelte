<script lang="ts">
  import Lightswitch from "$lib/components/ui/lightswitch.svelte";
  import ScrollArea from "$lib/components/ui/scroll-area/scroll-area.svelte";
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
  import { pageTitle } from "$lib/stores/global";

  let { children } = $props();
</script>

<svelte:head>
  <title>{$pageTitle}</title>
</svelte:head>

<ModeWatcher />
<div class="main-layout">
  <header>
    <h1>{$pageTitle}</h1>
    <Lightswitch />
  </header>
  <main>
    <ScrollArea class="p-3 w-full h-full" orientation="both">
      {@render children()}
    </ScrollArea>
  </main>
</div>

<style lang="scss">
  .main-layout {
    @apply flex flex-col h-screen;
    > header {
      @apply flex justify-between items-center p-2 pl-4 border-b;
      > h1 {
        @apply text-4xl font-bold;
      }
    }
    > main {
      @apply flex-grow p-1;
    }
  }
</style>
