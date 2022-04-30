// JSDoc plugin for hiding inherited methods

exports.handlers = {
    processingComplete: function (data)
    {
        data.doclets
        .filter(item => item.inherited)
        .forEach(item => item.undocumented = true);
    }
};
