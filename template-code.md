# Template Code

See `src/pages/example.html` for usage example.

## Render Data
tags: #data

Render a data. The following attributes are valid:

- `b-data`: Insert data content as content of the tag.
- `b-attr-href`: Insert data content as `href` attribute.
- `b-attr-src`: Insert data content as `src` attribute.

If you need a specific attribute, search `#attributes` in builder.js and modify the code.

```html
<a b-attr-href="blog.homepageUrl" b-data="blog.title"></a>
```

# Conditional Tags
tags: #conditinal, #if

Use `b-if` attribute to render a tag conditionally. Add exclamation mark (`!`) for inverse condition.

```html
<div b-if="isHomepage">
    <h1>
        <a b-attr-href="blog.homepageUrl" b-data="blog.title"></a>
    </h1>
    <p b-data="view.description"></p>
</div>
<div b-if="!isHomepage">
    <a b-attr-href="blog.homepageUrl" b-data="blog.title"></a>
</div>
```

## Blog Section
tags: #section

Use `b-section` tag to insert a `<b:section>` widgets. You have to define the widget templates to display the each widget's content (explained in the next section).

```html
<!-- content of <b:section id="footer"> will be inserted here -->
<b-section id="footer"></b-section>
```

## Blog Widget
tags: #widget

Create a template element to render a blog widget. There are three ways to define a widget template, listed below in priority order (higher number means higher priority):

1. Create a template element with an ID of a valid Blogger widget types. In the following example, widget `Blog1` has a type of "Blog".

```html
<b-widget id="Blog1"></b-widget>

<template id="Blog">
    Default Blog widget template
</template>
```

2. Add a `b-section` attribute on the template element to target a specific section only. In the following example, if the `footer` section contains a `LinkList` widget, that widget will use the second template instead of the first one:

```html
<!-- content of <b:section id="footer"> will be inserted here -->
<b-section id="footer"></b-section>

<template id="LinkList">
    Default LinkList
</template>
<template id="LinkList" b-section="footer">
    Footer LinkList
</template>
```

3. Use a specific template using `template` attribute on the the widget element.

```html
<b-widget id="LinkList1" template="PageLinks"></b-widget>

<template id="PageLinks">
    Specific LinkList
</template>
```

# Render Structured Data
tags: #loop, #array, #object

To render a structured data (array or object), use `b-data` together with `b-template`, where `b-template` is the ID of the template element. For example, the following renders blog posts inside a `Blog` widget:

```html
<b-widget id="Blog1" template="BlogWidget"></b-widget>

<template id="BlogWidget">
    <div b-data="posts" b-template="PostWidget"></div>

    <a b-attr-href="newerPageUrl">Newer Post</a>
    <a b-attr-href="olderPageUrl">Older Post</a>
</template>

<template id="PostWidget">
    <a b-attr-href="url" b-data="title"></a>
    <small b-data="date"></small>
</template>
```

## Includables
tags: #include

Render a template content. useful for refactoring layout code so that you have less nested tags.

```html
<div>
    <b-include template="Header"></b-include>
    <b-include template="Footer"></b-include>
</div>

<template id="Header">
    <!-- header HTML -->
</template>
<template id="Footer">
    <!-- footer HTML -->
</template>
```

## Inject File
tags: #file, #inject

Inject HTML from another file (relative path):

```html
<b-file src="components/header.html"></b-file>
```