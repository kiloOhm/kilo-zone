<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<pre><code>{JSON.stringify(data.page.data, null, 2)}</code></pre>