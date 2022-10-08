// =====================================
// https://github.com/adrianmgg/elhelper
// =====================================
function setup(elem, { style: { vars: styleVars = {}, ...style } = {}, attrs = {}, dataset = {}, events = {}, classList = [], children = [], parent = null, insertBefore = null, ...props }) {
    // TODO Elem won't necessarily have a style prop, should handle that better than just casting it like this
    for (const k in style)
        elem.style[k] = style[k];
    for (const k in styleVars)
        elem.style.setProperty(k, styleVars[k]);
    for (const k in attrs)
        elem.setAttribute(k, attrs[k]);
    // TODO again, should probably handle this better than just casting
    for (const k in dataset)
        elem.dataset[k] = dataset[k];
    for (const k in events)
        elem.addEventListener(k, events[k]);
    for (const c of classList)
        elem.classList.add(c);
    for (const k in props)
        elem[k] = props[k];
    for (const c of children)
        elem.appendChild(c);
    if (parent !== null) {
        if (insertBefore !== null)
            parent.insertBefore(elem, insertBefore);
        else
            parent.appendChild(elem);
    }
    return elem;
}
function create(tagName, options = {}) {
    return setup(document.createElement(tagName), options);
}
function createNS(namespace, tagName, options = {}) {
    return setup(document.createElementNS(namespace, tagName), options);
}
