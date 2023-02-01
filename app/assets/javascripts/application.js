//
// For guidance on how to add JavaScript see:
// https://prototype-kit.service.gov.uk/docs/adding-css-javascript-and-images
//

window.GOVUKPrototypeKit.documentReady(() => {
  var $searchItem = $('.gem-c-search__item');
  toggleFocus($searchItem);
  $searchItem.on('change', function() {
    toggleFocus(this);
  });
})

function toggleFocus(elem) {
    if(hasValue(elem)) {
        $(elem).addClass('focus');
    }
    else {
        $(elem).removeClass('focus');
    }
}

function hasValue(elem) {
    return $(elem).filter(function() { return $(this).val(); }).length > 0;
}
