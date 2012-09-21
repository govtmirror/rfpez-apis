
(function() {
  var formTimes = {};

  var initFormTimer = function(){

    $forms = $('form');

    $forms.children(':input').on('focus', function(e){
      var formId = $(e.target).closest('form').attr('id');
      if (typeof formTimes[formId] === 'undefined') {
        formTimes[formId] = {formId: formId, startTime: new Date()};
      }
    });

    $forms.on('submit', function(e){
      var formId = $(e.target).attr('id');
      if (typeof formTimes[formId] !== 'undefined') {
        formTimes[formId].endTime = new Date();
        formTimes[formId].duration = formTimes[formId].endTime.getTime() - formTimes[formId].startTime.getTime();
        //would ideally use POST and rely on CORS, but trying to place nice with ye olde browsers
        $.getJSON('/formtimer/create', formTimes[formId], function(data) {
          //console.log(data);
        });
      }
    });
  };

  if (typeof window.jQuery === 'undefined') {

    window.onload = function() {
      if(window.jQuery) {
        initFormTimer();
      }
    };

    var jq = document.createElement('script'); jq.type = 'text/javascript'; jq.async = true;
    jq.src = ('https:' == document.location.protocol ? 'https://' : 'http://') + 'ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(jq, s);

  } else {
    initFormTimer();
  }

})();