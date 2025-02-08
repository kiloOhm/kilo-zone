<script lang="ts">
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<pre><code>{JSON.stringify(data.page, null, 2)}</code></pre>

{#if data.page?.type === "paste"}{/if}
