/// <reference lib="DOM" />

declare namespace JSX {
    type Element = HTMLElement | Node | null | undefined | string | number | Element[] | PElement | PNode
    type ElementMap = HTMLElementTagNameMap
    
    type Tag = keyof ElementMap

    type IntrinsicElementMap = {
        [K in keyof ElementMap]: {
            [Attr in keyof HtmlElementAttributes[K]]?: HtmlElementAttributes[K][Attr]
        } & {
            [key: string]: any
        }
    }

    interface IntrinsicElements extends IntrinsicElementMap { }
    
    // interface Component {
    //     (properties?: Record<string, any>, children?: Element[]): Element
    // }
    
    interface ElementChildrenAttribute {
        children: unknown  // specify children name to use
    }
    
    type Component<T extends Record<string, any> = {}> = (props: T) => Element
}

declare function jsx(tag: JSX.Tag | JSX.Component, attributes: { [key: string]: any } | null, ...children: JSX.Element[]): JSX.Element
declare function jsxFragment()

type GlobalHtmlAttribute = {
    accesskey: string,
    autocapitalize: string,
    autofocus: string,
    /**
     * Often used with CSS to style elements with common properties.
     */
    class: string,
    contenteditable: string,
    dir: string,
    draggable: boolean,
    enterkeyhint: string,
    hidden: boolean,
    id: string,
    inert: string,
    inputmode: string,
    is: string,
    itemid: string,
    itemprop: string,
    itemref: string,
    itemscope: string,
    itemtype: string,
    lang: string,
    nonce: string,
    popover: string,
    slot: string,
    spellcheck: string,
    style: string | Partial<CSSStyleDeclaration>,
    tabindex: string,
    title: string,
    translate: string,
    writingsuggestions: string,
    ref: (e: any) => void,
    transition: TransitionRunner
} & Partial<Omit<GlobalEventHandlers, 'oninput'>> & {
    oninput?: (value: string) => void
    onfocusout?: (this: GlobalEventHandlers, ev: FocusEvent) => any,
}

type HtmlElementAttributes = {
    a: GlobalHtmlAttribute & {
        charset: string,
        coords: string,
        download: string,
        href: string,
        hreflang: string,
        name: string,
        ping: string,
        referrerpolicy: string,
        rel: string,
        rev: string,
        shape: string,
        target: string,
        type: string,
    },
    applet: GlobalHtmlAttribute & {
        align: string,
        alt: string,
        archive: string,
        code: string,
        codebase: string,
        height: string,
        hspace: string,
        name: string,
        object: string,
        vspace: string,
        width: string,
    },
    area: GlobalHtmlAttribute & {
        alt: string,
        coords: string,
        download: string,
        href: string,
        hreflang: string,
        nohref: string,
        ping: string,
        referrerpolicy: string,
        rel: string,
        shape: string,
        target: string,
        type: string,
    },
    audio: GlobalHtmlAttribute & {
        autoplay: string,
        controls: string,
        crossorigin: string,
        loop: string,
        muted: string,
        preload: string,
        src: string,
    },
    base: GlobalHtmlAttribute & {
        href: string,
        target: string,
    },
    basefont: GlobalHtmlAttribute & {
        color: string,
        face: string,
        size: string,
    },
    blockquote: GlobalHtmlAttribute & {
        cite: string,
    },
    body: GlobalHtmlAttribute & {
        alink: string,
        background: string,
        bgcolor: string,
        link: string,
        text: string,
        vlink: string,
    },
    br: GlobalHtmlAttribute & {
        clear: string,
    },
    button: GlobalHtmlAttribute & {
        disabled: boolean,
        form: string,
        formaction: string,
        formenctype: string,
        formmethod: string,
        formnovalidate: string,
        formtarget: string,
        name: string,
        popovertarget: string,
        popovertargetaction: string,
        type: string,
        value: string,
    },
    canvas: GlobalHtmlAttribute & {
        height: string,
        width: string,
    },
    caption: GlobalHtmlAttribute & {
        align: string,
    },
    col: GlobalHtmlAttribute & {
        align: string,
        char: string,
        charoff: string,
        span: string,
        valign: string,
        width: string,
    },
    colgroup: GlobalHtmlAttribute & {
        align: string,
        char: string,
        charoff: string,
        span: string,
        valign: string,
        width: string,
    },
    data: GlobalHtmlAttribute & {
        value: string,
    },
    del: GlobalHtmlAttribute & {
        cite: string,
        datetime: string,
    },
    details: GlobalHtmlAttribute & {
        name: string,
        open: string,
    },
    dialog: GlobalHtmlAttribute & {
        open: string,
    },
    dir: GlobalHtmlAttribute & {
        compact: string,
    },
    div: GlobalHtmlAttribute & {
        align: string,
    },
    dl: GlobalHtmlAttribute & {
        compact: string,
    },
    embed: GlobalHtmlAttribute & {
        height: string,
        src: string,
        type: string,
        width: string,
    },
    fieldset: GlobalHtmlAttribute & {
        disabled: string,
        form: string,
        name: string,
    },
    font: GlobalHtmlAttribute & {
        color: string,
        face: string,
        size: string,
    },
    form: GlobalHtmlAttribute & {
        accept: string,
        'accept-charset': string,
        action: string,
        autocomplete: string,
        enctype: string,
        method: string,
        name: string,
        novalidate: string,
        target: string,
    },
    frame: GlobalHtmlAttribute & {
        frameborder: string,
        longdesc: string,
        marginheight: string,
        marginwidth: string,
        name: string,
        noresize: string,
        scrolling: string,
        src: string,
    },
    frameset: GlobalHtmlAttribute & {
        cols: string, rows: string,
    },
    h1: GlobalHtmlAttribute & {
        align: string,
    },
    h2: GlobalHtmlAttribute & {
        align: string,
    },
    h3: GlobalHtmlAttribute & {
        align: string,
    },
    h4: GlobalHtmlAttribute & {
        align: string,
    },
    h5: GlobalHtmlAttribute & {
        align: string,
    },
    h6: GlobalHtmlAttribute & {
        align: string,
    },
    head: GlobalHtmlAttribute & {
        profile: string,
    },
    hr: GlobalHtmlAttribute & {
        align: string,
        noshade: string,
        size: string,
        width: string,
    },
    html: GlobalHtmlAttribute & {
        manifest: string,
        version: string,
    },
    iframe: GlobalHtmlAttribute & {
        align: string,
        allow: string,
        allowfullscreen: string,
        allowpaymentrequest: string,
        allowusermedia: string,
        frameborder: string,
        height: string,
        loading: string,
        longdesc: string,
        marginheight: string,
        marginwidth: string,
        name: string,
        referrerpolicy: string,
        sandbox: string,
        scrolling: string,
        src: string,
        srcdoc: string,
        width: string,
    },
    img: GlobalHtmlAttribute & {
        align: string,
        alt: string,
        border: string,
        crossorigin: string,
        decoding: string,
        fetchpriority: string,
        height: string,
        hspace: string,
        ismap: string,
        loading: string,
        longdesc: string,
        name: string,
        referrerpolicy: string,
        sizes: string,
        src: string,
        srcset: string,
        usemap: string,
        vspace: string,
        width: string,
    },
    input: GlobalHtmlAttribute & {
        accept: string,
        align: string,
        alt: string,
        autocomplete: string,
        checked: boolean,
        dirname: string,
        disabled: boolean,
        form: string,
        formaction: string,
        formenctype: string,
        formmethod: string,
        formnovalidate: string,
        formtarget: string,
        height: string,
        ismap: string,
        list: string,
        max: string,
        maxlength: string,
        min: string,
        minlength: string,
        multiple: string,
        name: string,
        pattern: string,
        placeholder: string,
        popovertarget: string,
        popovertargetaction: string,
        readonly: boolean,
        required: boolean,
        size: string,
        src: string,
        step: string,
        type: string,
        usemap: string,
        value: string,
        width: string,
    },
    ins: GlobalHtmlAttribute & {
        cite: string,
        datetime: string
    },
    isindex: GlobalHtmlAttribute & {
        prompt: string,
    },
    label: GlobalHtmlAttribute & {
        for: string,
        form: string,
    },
    legend: GlobalHtmlAttribute & {
        align: string, },
    li: GlobalHtmlAttribute & {
        type: string,
        value: string,
    },
    link: GlobalHtmlAttribute & {
        as: string,
        blocking: string,
        charset: string,
        color: string,
        crossorigin: string,
        disabled: string,
        fetchpriority: string,
        href: string,
        hreflang: string,
        imagesizes: string,
        imagesrcset: string,
        integrity: string,
        media: string,
        referrerpolicy: string,
        rel: string,
        rev: string,
        sizes: string,
        target: string,
        type: string,
    },
    map: GlobalHtmlAttribute & {
        name: string,
    },
    menu: GlobalHtmlAttribute & {
        compact: string,
    },
    meta: GlobalHtmlAttribute & {
        charset: string,
        content: string,
        'http-equiv': string,
        media: string,
        name: string,
        scheme: string,
    },
    meter: GlobalHtmlAttribute & {
        high: string,
        low: string,
        max: string,
        min: string,
        optimum: string,
        value: string,
    },
    nav: GlobalHtmlAttribute,
    object: GlobalHtmlAttribute & {
        align: string,
        archive: string,
        border: string,
        classid: string,
        codebase: string,
        codetype: string,
        data: string,
        declare: string,
        form: string,
        height: string,
        hspace: string,
        name: string,
        standby: string,
        type: string,
        typemustmatch: string,
        usemap: string,
        vspace: string,
        width: string,
    },
    ol: GlobalHtmlAttribute & {
        compact: string,
        reversed: string,
        start: string,
        type: string,
    },
    optgroup: GlobalHtmlAttribute & {
        disabled: string,
        label: string,
    },
    option: GlobalHtmlAttribute & {
        disabled: string,
        label: string,
        selected: boolean,
        value: string,
    },
    output: GlobalHtmlAttribute & {
        for: string,
        form: string,
        name: string,
    },
    p: GlobalHtmlAttribute & {
        align: string,
    },
    param: GlobalHtmlAttribute & {
        name: string,
        type: string,
        value: string,
        valuetype: string,
    },
    pre: GlobalHtmlAttribute & {
        width: string,
    },
    progress: GlobalHtmlAttribute & {
        max: string,
        value: string,
    },
    q: GlobalHtmlAttribute & {
        cite: string,
    },
    script: GlobalHtmlAttribute & {
        async: string,
        blocking: string,
        charset: string,
        crossorigin: string,
        defer: string,
        fetchpriority: string,
        integrity: string,
        language: string,
        nomodule: string,
        referrerpolicy: string,
        src: string,
        type: string,
    },
    select: GlobalHtmlAttribute & {
        autocomplete: string,
        disabled: string,
        form: string,
        multiple: string,
        name: string,
        required: string,
        size: string,
    },
    slot: GlobalHtmlAttribute & { name },
    source: GlobalHtmlAttribute & {
        height: string,
        media: string,
        sizes: string,
        src: string,
        srcset: string,
        type: string,
        width: string
    },
    span: GlobalHtmlAttribute,
    table: GlobalHtmlAttribute & {
        align: string,
        bgcolor: string,
        border: string,
        cellpadding: string,
        cellspacing: string,
        frame: string,
        rules: string,
        summary: string,
        width: string,
    },
    tbody: GlobalHtmlAttribute & {
        align: string,
        char: string,
        charoff: string,
        valign: string,
    },
    td: GlobalHtmlAttribute & {
        abbr: string,
        align: string,
        axis: string,
        bgcolor: string,
        char: string,
        charoff: string,
        colspan: string,
        headers: string,
        height: string,
        nowrap: string,
        rowspan: string,
        scope: string,
        valign: string,
        width: string,
    },
    template: GlobalHtmlAttribute & {
        shadowrootclonable: string,
        shadowrootdelegatesfocus: string,
        shadowrootmode: string,
    },
    textarea: GlobalHtmlAttribute & {
        autocomplete: string,
        cols: string,
        dirname: string,
        disabled: string,
        form: string,
        maxlength: string,
        minlength: string,
        name: string,
        placeholder: string,
        readonly: string,
        required: string,
        rows: string,
        wrap: string,
    },
    tfoot: GlobalHtmlAttribute & {
        align: string,
        char: string,
        charoff: string,
        valign: string,
    },
    th: GlobalHtmlAttribute & {
        abbr: string,
        align: string,
        axis: string,
        bgcolor: string,
        char: string,
        charoff: string,
        colspan: string,
        headers: string,
        height: string,
        nowrap: string,
        rowspan: string,
        scope: string,
        valign: string,
        width: string,
    },
    thead: GlobalHtmlAttribute & {
        align: string,
        char: string,
        charoff: string,
        valign: string,
    },
    time: GlobalHtmlAttribute & {
        datetime: string,
    },
    tr: GlobalHtmlAttribute & {
        align: string,
        bgcolor: string,
        char: string,
        charoff: string,
        valign: string,
    },
    track: GlobalHtmlAttribute & {
        default: string,
        kind: string,
        label: string,
        src: string,
        srclang: string, },
    ul: GlobalHtmlAttribute & {
        compact: string,
        type: string,
    },
    video: GlobalHtmlAttribute & {
        autoplay: string,
        controls: string,
        crossorigin: string,
        height: string,
        loop: string,
        muted: string,
        playsinline: string,
        poster: string,
        preload: string,
        src: string,
        width: string,
    },
    
    style: {
        css: Css
        children: Css
    }
}

type HTMLAttributes<T extends keyof HtmlElementAttributes> = Partial<GlobalHtmlAttribute & HtmlElementAttributes[T]>