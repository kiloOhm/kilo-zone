# cli

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.42. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

```typescript
import 'prismjs/themes/prism.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css'; // Line numbers CSS

export const markdown: FC<{ raw: string }> = async ({ raw }) => {
	const md = new MarkdownIt({
		html: false,
		linkify: false,
	}).use(markdownItPrism, { plugins: ['line-numbers'] });

	const html: string = md.render(raw);
	return <div class="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />;
};
```
