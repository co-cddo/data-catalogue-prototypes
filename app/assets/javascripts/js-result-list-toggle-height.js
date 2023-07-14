window.GOVUKPrototypeKit.documentReady(() => {
    $('.js-result-list-toggle-height').on('click', function (e) {
        let toggleValue = 'true'
        let text = "Show more";
        let chevronClass = "govuk-accordion-nav__chevron--down";
        $(this).attr('aria-expanded') === 'true' ? toggleValue = 'false' : toggleValue = 'true';
        $(this).attr('aria-expanded') === 'true' ? text = 'Show more' : text = 'Show less';
        if ($(this).attr('aria-expanded') === 'true') {
            $(this).find('.govuk-accordion-nav__chevron').removeClass('govuk-accordion-nav__chevron--up').addClass('govuk-accordion-nav__chevron--down');
        }
        else {
            $(this).find('.govuk-accordion-nav__chevron').removeClass('govuk-accordion-nav__chevron--down').addClass('govuk-accordion-nav__chevron--up');
        }       
        $(this).attr('aria-expanded', toggleValue);
        $(this).find('.govuk-accordion__section-toggle-text').text(text);
        $(this).parent('.result-list__item').find('.result-list__limit-height').toggleClass('theres-no-limit');
        $(this).parent('.gem-c-document-list__item').find('.result-list__limit-height').toggleClass('theres-no-limit');
        $(this).parent('.govuk-grid-column-two-thirds-from-desktop').find('.result-list__limit-height').toggleClass('theres-no-limit');
        
        
    })
});
