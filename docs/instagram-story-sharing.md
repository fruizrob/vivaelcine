# Instagram Story sharing references

The Story preview's **Copiar enlace** now uses the same generated short screening
URL as the share menu and invitations. [Short-link generation and preview behavior](short-sharing-links.md).

Checked November 4, 2026. Source review only; no iPhone/Android Instagram handoff tested.

## Best starting points

- **Browser implementation and author walkthrough:** Benjamin Kaiser's [2021 article](https://benkaiser.dev/sharing-images-using-the-web-share-api/), [repository](https://github.com/benkaiser/web-share-images), and [live demo](https://benkaiser.github.io/web-share-images/). Covers sharing images, Canvas contents, and HTML rendered with html2canvas. The [Canvas example](https://github.com/benkaiser/web-share-images/blob/master/src/examples/WebShareCanvas.tsx) converts Canvas → data URL → Blob → File → `navigator.share`; [HTML example](https://github.com/benkaiser/web-share-images/blob/master/src/examples/WebShareHTML.tsx) adds HTML rasterization. Treat browser support statements in the article as historical. These examples demonstrate the OS share sheet, not a dedicated Instagram Stories destination.
- **Google's implementation guide:** [How to share files](https://web.dev/articles/files/share-files). Includes file capability detection, a complete share/download fallback, cancellation handling, and a runnable demo. Best reference for the production sharing helper.
- **API behavior:** [MDN `navigator.share`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share). Requires HTTPS and user activation; available destinations depend on the device. Sharing a file does not guarantee Instagram appears or opens its Story composer.

## Story image generators with inspectable code

| Project | Verified implementation | Usefulness |
| --- | --- | --- |
| [YTStories](https://github.com/Considerasrl/ytstories) | [app/page.tsx](https://github.com/Considerasrl/ytstories/blob/main/app/page.tsx): 1080 × 1920 Canvas, thumbnail with blurred background, wrapped title, JPEG preview and download. No `navigator.share` call in that page. [GPL-3.0](https://github.com/Considerasrl/ytstories/blob/main/LICENSE). | Closest content-to-Story card example; replace YouTube metadata with screening metadata. |
| [MemeDrop](https://github.com/vincenzo-afk/MemeDrop) | [script.js](https://github.com/vincenzo-afk/MemeDrop/blob/main/script.js#L446-L453): 540 × 960 Story mode. [exportStory](https://github.com/vincenzo-afk/MemeDrop/blob/main/script.js#L533-L536) downloads a PNG; [nativeShare](https://github.com/vincenzo-afk/MemeDrop/blob/main/script.js#L519-L523) shares a URL/text, not the generated image. [MIT](https://github.com/vincenzo-afk/MemeDrop/blob/main/LICENSE). | Small vanilla-JavaScript reference for Canvas export; needs image-file sharing added. |
| [meta-gyro-tilt](https://github.com/silky-x0/meta-gyro-tilt) | [saveOrShareImage](https://github.com/silky-x0/meta-gyro-tilt/blob/main/app.js#L432-L454): JPEG Blob → File → `canShare` → `share`, then download fallback. Includes a 1080 × 1920 preset. Its [license](https://github.com/silky-x0/meta-gyro-tilt/blob/main/LICENSE) adds a testing/educational-only condition to MIT text. | Confirms browser file-sharing pattern; prefer Google's guide as implementation reference. |

## Dedicated native Stories integration

[React Native Share's Instagram Stories documentation](https://react-native-share.github.io/react-native-share/docs/share-single#share-instagram-stories) documents its `INSTAGRAM_STORIES` target and platform setup. This is a native-app reference, not a drop-in API for this static website. Meta's official [Sharing to Stories page](https://developers.facebook.com/docs/instagram-platform/sharing-to-stories/) could not be fetched during research (HTTP 429); its contents were not independently verified here.

## Story artwork

The 1080 × 1920 Canvas composition uses the same verified poster identity and festival selection as screening details and agenda cards. Single films use TMDB's `w780` image size, contained without cropping. A confirmed world premiere takes precedence; otherwise the mark says **Primera aparición registrada** (or preserves a recorded territorial premiere scope). Festival artwork comes from the existing local assets. The mark includes its year; programmes identify the individual film and never borrow its poster for the whole programme. Separately titled parts only use their own poster/history keys.

Artwork loads in parallel with anonymous image requests and a four-second limit. Failed posters or logos are omitted independently; unknown festival identities retain their name. If Canvas export rejects artwork, generation retries without images. The PNG is fully prepared before the share click, preserving the existing native sharing flow. Closing or replacing a preview invalidates pending generation. Short screening links remain available through **Copiar enlace**.

## Artwork validation

November 14, 2026: `npm test` passed all 156 tests and checked 219 generated programme pages and 194 short links. Regression tests cover image identity, premiere semantics, failed images, export retries, and closing/replacing pending previews. Headless Chrome at 390 × 900 and 1440 × 900 verified keyboard Story activation, Escape/focus return, real CDN artwork, 1080 × 1920 PNG downloads, retained short links and calendar controls, and export with the poster CDN blocked. All 194 screenings were checked in artwork and text layouts (388 compositions) for text bounds; artwork dimensions were simulated for that catalogue layout check. No physical-phone Instagram handoff was tested for this change.

## Suggested application here

Use YTStories as a card-layout reference, Kaiser's Canvas example to understand image-file creation, and Google's guide for capability detection and download fallback. Generate the screening card locally; offer file sharing, image download, and a separate copyable deep link. Validate Instagram handoff on physical iOS and Android devices before promising a direct Stories flow.
