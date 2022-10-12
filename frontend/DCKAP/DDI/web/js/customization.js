
require([
    'jquery',
    'mage/url',
    'mage/mage'
], function($,url) {
    $(document).ready(function(){

        if($('#elementpayment').attr('checked', true)) {
            $("#elementpayment-method > div.payment-method-content").css("display", "block");
        }else{
            console.log("credit card not checked");
        }
    });


    $(document).on('click', '#review-eve', function () {
        if($('#elementpayment').is(':checked')) {
            $("#elementpayment-method > div.payment-method-content").css("display", "block");
        }else{
            console.log("credit card not checked");
        }

    });


    $(document).on('click', '.radio', function () {
        var inputValue = $(this).attr("value");
        if (inputValue != "elementpayment"){
            $("#elementpayment-method > div.payment-method-content").css("display", "none");
        }
    });

});

