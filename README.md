# obsidian2hugo
A simple markdown conversion program from obsidian format to hugo format (fixit theme).

## Feature
- Convert obsidian link `[[]]` into hugo file link `{{<ref >}}`.
- Convert obsidian image link `![[]]` into hugo image link `{{<figure src=xxx title=xxx>}}`.
- Add `{{<raw>}}` around obsidian math sections to ensure math can be renderred correctly.

## Usage
1. Select the folder to expose.
2. Fill in the blog path (root path).
3. Fill in the post path and static path relative to the root path.
4. Use `Export the selected folder` command or icons on the side to export.

## Static file config
Static file config setting controls where other formats will go.

```js
// If static path is  `static`
{
    "images": "png|jpg|svg|webp", // png,jpg,svg and webp will go into static/images folder
    "other": "pdf" // pdf will go into static/other folder
}
```

Other formats will be ignored.
