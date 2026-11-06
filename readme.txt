=== GhostLabs Glide ===
Contributors: ghostlabs
Tags: slider, carousel, blocks, scrollytelling, sticky
Requires at least: 6.6
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 1.0.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Scrollytelling sections for the block editor: a contents rail that follows the reader down the page, and a full content slider.

== Description ==

Glide adds four blocks that work together to build scroll-driven sections and
sliders, with no shortcodes and no page-builder lock-in. Everything renders
server-side, so a step or a slide is real content in your post, and a Sticky
Chapters section is readable with JavaScript switched off.

**Sticky Chapters** — a contents rail that stays in view beside your steps and
highlights the one being read, built from the headings you already wrote. Put it
on either side or across the top, with numbered, dot or plain markers, a
progress line and a step counter. On phones it becomes a strip above the steps
that scrolls sideways to keep the current chapter in view. A step can take a
title of its own, or stay on the page but out of the rail.

**Content Slider** — one to six slides per view, with arrows, dots, a progress
bar or no controls, autoplay, loop, drag-free scrolling, keyboard navigation and
thumbnails below, above or beside the slides. Fit it to the tallest slide, or
set a height for desktop, tablet and phone. An overlay block holds content of
its own on top of the slider.

**Video backgrounds** — from your Media Library, YouTube, Vimeo or another
oEmbed provider, with play and mute buttons for Media Library, YouTube and Vimeo
video. In the slider, a video pauses when its slide leaves. A Media Library
video with no thumbnail gets a poster made from one of its frames (see "Video
thumbnails use ffmpeg" below).

**While you edit** — the sidebar warns you about settings that cost readers
control: arrows, dots and thumbnails all switched off, controls hidden until
hover, or a video background with no play and mute buttons.

= Glide Pro =

Glide Pro adds three more sticky-scroll layouts (Sticky Media, Stacking Cards
and Horizontal Pin), a marquee that loops any blocks left, right, up or down,
the Scale and Barn Doors transitions for the content slider, and chapter links
made from each step's title. It is a separate plugin, sold at
<https://theghostlab.io/glide>, and this plugin contains none of its features.

= Accessibility =

* Arrow and pause controls are real buttons with labels, not styled divs.
* Autoplay starts paused when the visitor asks for reduced motion, and the
  pause control still works so they can start it if they want to.
* Off-screen slides are marked inert, so tabbing does not wander into content
  nobody can see.
* Sticky Chapters is CSS `position: sticky`, so the layout holds with JavaScript
  switched off.
* A live region tells screen reader users which slide is showing, and stays
  quiet during autoplay.
* With arrows, dots and thumbnails all switched off, previous and next buttons
  are still added for keyboard users, visible only while they have focus.

== External services and server requirements ==

Glide sends nothing about your site, your visitors or your content anywhere. It
has no telemetry and no update server — updates come from WordPress.org like any
other plugin in the directory. Settings → Glide links to the GhostLabs website
and to your GhostLabs account; those are links you choose to follow, and the
plugin itself sends nothing to either. This section covers the two server-side
details a reader of the source will find and should not have to guess about,
and the video providers a slide can embed.

= Video thumbnails use ffmpeg, if your host has it =

When you give a slide a video from your Media Library and that video has no
poster image, Glide extracts a single frame so the slide has something to show
before the video loads. It runs `ffmpeg` on your own server, on a file already in
your own uploads directory.

* It is reached only through a REST route that requires the `upload_files`
  capability — Author and above. That is the same capability WordPress already
  requires to add the video in the first place, and the same one core's image
  editor runs under.
* No text from the request reaches the shell. The request carries an attachment
  ID; WordPress resolves that to a path, the path is resolved with `realpath()`
  and must land inside your uploads directory, and every value interpolated into
  a command goes through `escapeshellarg()`.
* If your host has no ffmpeg, or disables `exec()`, nothing errors. Glide falls
  back to capturing the frame in the browser instead.

Nothing about this is required. A slide with a poster image set, or a video from
YouTube or Vimeo, never reaches it at all.

= YouTube and Vimeo embeds =

A slide with a YouTube or Vimeo video background embeds that provider's player,
which loads from the provider and is subject to their terms and privacy policy —
the same as any embedded video anywhere on your site. It happens only on a slide
where you have set one, and only in the visitor's browser.

* YouTube — player embedded from `www.youtube.com`:
  <https://www.youtube.com/t/terms> and <https://policies.google.com/privacy>
* Vimeo — player embedded from `player.vimeo.com`, with `dnt=1` set:
  <https://vimeo.com/terms> and <https://vimeo.com/privacy>

While you are editing, pasting a video URL fetches a thumbnail for the slide
preview: from `img.youtube.com` for YouTube, and from Vimeo's public oEmbed
endpoint for Vimeo. Both requests carry only the video URL you pasted.

That thumbnail is saved as the slide's poster image at the provider's address.
The poster appears only in the thumbnail strip, so on a slider with thumbnail
navigation each visitor's browser loads it from `img.youtube.com`, or from
Vimeo's image server, `i.vimeocdn.com`. Choose a poster from your media library
instead, after setting the video URL, and that request goes away.

= Other video providers =

Any other video URL is embedded through WordPress's own oEmbed support: your
server asks that provider for its embed code, keeps the answer for a day, and
the visitor's browser loads the provider's player. Which provider, and whose
terms apply, depends on the URL you paste. If the provider has no embed for
that URL, the slide shows no video, and your server asks again an hour later.

== Source code ==

Glide's compiled JavaScript and CSS are minified. The readable sources they were
built from, and the build configuration that produced them, are published here:

<https://github.com/theghostlab/wp-ghostlabs-glide>

The repository builds with no credentials and no private packages:
`pnpm install && pnpm run build` reproduces the `build/` directory that ships
inside the plugin, byte for byte.

== Frequently Asked Questions ==

= Does it work with my theme? =

Glide styles structure — surfaces, spacing, the reading measure and the chrome it
generates itself — and leaves type to your theme. Colors are derived from the
text color they inherit, so the blocks follow whatever palette they land in,
including a dark one.

= Will it slow my site down? =

Each mode's JavaScript and CSS load only when a block on the page uses it, and
the slider module loads when the block scrolls into view rather than on page
load.

= How does it behave on a phone? =

The Sticky Chapters rail becomes a strip above the steps, which scrolls sideways
to keep the current chapter in view. The content slider shows one slide at a
time and moves its arrows below the slides, so they don't sit over your text,
and on a short or zoomed-in screen it grows to fit each slide's content instead
of cutting it off.

= How do I switch to Glide Pro? =

Glide Pro is a separate plugin, and you install it the way you install any
plugin from outside the directory:

1. Download Glide Pro from your GhostLabs account.
2. Upload it from the Add Plugins screen, with its Upload Plugin button.
3. Activate it, then enter your license key under Settings → Glide.

When Glide Pro is activated it switches this plugin off. Every block you have
built and every setting stays exactly as it is: both editions read the same
data, so there is nothing to migrate. The one thing that changes is Sticky
Chapters' links: Glide Pro makes each step's link from its title, so a link to a
chapter shared from the free edition stops landing on it. Settings → Glide
repeats these steps under "Already own Glide Pro?".

== Screenshots ==

1. The layout picker on a freshly inserted Glide block.
2. A content slider with thumbnails and a progress bar.
3. The Sticky Chapters layout, with its contents rail.

== Changelog ==

= 1.0.4 =
* Bug fixes.

= 1.0.2 =
* Bug fixes.

= 0.9.0 =
* First public release.
