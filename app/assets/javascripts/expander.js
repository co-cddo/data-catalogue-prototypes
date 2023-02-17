window.GOVUKPrototypeKit.documentReady(() => {
    // Simple and crude filter mechanism
    $('.app-c-expander__button').on('click', function (e) {
        let toggleValue = 'true'
        $(this).attr('aria-expanded') === 'true' ? toggleValue = 'false' : toggleValue = 'true';
        $(this).attr('aria-expanded', toggleValue)
        // console.log($(this).closest('app-c-expander__content'))
        $(this).parent().next('.app-c-expander__content').toggleClass('app-c-expander__content--visible')
    })
});
