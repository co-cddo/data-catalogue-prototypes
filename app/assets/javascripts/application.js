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
  
  var checkboxes = document.querySelectorAll("#searchForm input[type='checkbox']");
  var button = document.querySelector(".moj-filter__options button");
  
  for (var i = 0; i < checkboxes.length; i++) {
    checkboxes[i].addEventListener("change", function() {
      button.click();
    });
  }

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



