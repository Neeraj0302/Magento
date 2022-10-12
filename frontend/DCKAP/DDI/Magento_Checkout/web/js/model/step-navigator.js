/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

/**
 * @api
 */
define([
    'jquery',
    'ko',
    'mage/url',
    'Magento_Checkout/js/model/quote',
    'Magento_Checkout/js/checkout-data',
    'Magento_Ui/js/modal/modal',
    'jquery/jquery.cookie'
], function ($, ko, urlBuilder, quote, checkoutData, modal) {
    'use strict';

    var steps = ko.observableArray();

    return {
        steps: steps,
        stepCodes: [],
        validCodes: [],

        /**
         * @return {Boolean}
         */
        handleHash: function () {
            var hashString = window.location.hash.replace('#', ''),
                isRequestedStepVisible;

            if (hashString === '') {
                return false;
            }

            if ($.inArray(hashString, this.validCodes) === -1) {
                window.location.href = window.checkoutConfig.pageNotFoundUrl;

                return false;
            }

            isRequestedStepVisible = steps.sort(this.sortItems).some(function (element) {
                return (element.code == hashString || element.alias == hashString) && element.isVisible(); //eslint-disable-line
            });

            //if requested step is visible, then we don't need to load step data from server
            if (isRequestedStepVisible) {
                return false;
            }

            steps().sort(this.sortItems).forEach(function (element) {
                if (element.code == hashString || element.alias == hashString) { //eslint-disable-line eqeqeq
                    element.navigate(element);
                } else {
                    element.isVisible(false);
                }

            });

            return false;
        },

        /**
         * @param {String} code
         * @param {*} alias
         * @param {*} title
         * @param {Function} isVisible
         * @param {*} navigate
         * @param {*} sortOrder
         */
        registerStep: function (code, alias, title, isVisible, navigate, sortOrder) {
            var hash, active;

            if ($.inArray(code, this.validCodes) !== -1) {
                throw new DOMException('Step code [' + code + '] already registered in step navigator');
            }

            if (alias != null) {
                if ($.inArray(alias, this.validCodes) !== -1) {
                    throw new DOMException('Step code [' + alias + '] already registered in step navigator');
                }
                this.validCodes.push(alias);
            }
            this.validCodes.push(code);
            steps.push({
                code: code,
                alias: alias != null ? alias : code,
                title: title,
                isVisible: isVisible,
                navigate: navigate,
                sortOrder: sortOrder
            });
            active = this.getActiveItemIndex();
            steps.each(function (elem, index) {
                if (active !== index) {
                    elem.isVisible(false);
                }
            });
            this.stepCodes.push(code);
            hash = window.location.hash.replace('#', '');

            if (hash != '' && hash != code) { //eslint-disable-line eqeqeq
                //Force hiding of not active step
                isVisible(false);
            }
        },

        /**
         * @param {Object} itemOne
         * @param {Object} itemTwo
         * @return {Number}
         */
        sortItems: function (itemOne, itemTwo) {
            return itemOne.sortOrder > itemTwo.sortOrder ? 1 : -1;
        },

        /**
         * @return {Number}
         */
        getActiveItemIndex: function () {
            var activeIndex = 0;

            steps().sort(this.sortItems).some(function (element, index) {
                if (element.isVisible()) {
                    activeIndex = index;

                    return true;
                }

                return false;
            });

            return activeIndex;
        },

        /**
         * @param {*} code
         * @return {Boolean}
         */
        isProcessed: function (code) {
            var activeItemIndex = this.getActiveItemIndex(),
                sortedItems = steps().sort(this.sortItems),
                requestedItemIndex = -1;

            sortedItems.forEach(function (element, index) {
                if (element.code == code) { //eslint-disable-line eqeqeq
                    requestedItemIndex = index;
                }
            });

            return activeItemIndex > requestedItemIndex;
        },

        /**
         * @param {*} code
         * @param {*} scrollToElementId
         */
        navigateTo: function (code, scrollToElementId) {
            var sortedItems = steps().sort(this.sortItems),
                bodyElem = $('body');

            scrollToElementId = scrollToElementId || null;

            if (!this.isProcessed(code)) {
                return;
            }
            var type = window.checkoutConfig.checkoutReviewData.review_type;
            sortedItems.forEach(function (element) {
                if (element.code == code) {

                    if (type == "review_quote") {
                        //eslint-disable-line eqeqeq
                        if (code == "shipping") {
                            window.location.href = window.checkoutConfig.checkoutUrl + '?type=quote#' + code;
                            location.reload();
                        }
                        element.isVisible(true);
                        bodyElem.animate({
                            scrollTop: $('?type=quote#' + code).offset().top
                        }, 0, function () {
                            window.location = window.checkoutConfig.checkoutUrl + '?type=quote#' + code;
                            location.reload();
                        });

                        if (scrollToElementId && $('#' + scrollToElementId).length) {
                            bodyElem.animate({
                                scrollTop: $('#' + scrollToElementId).offset().top
                            }, 0);
                        }
                    } else {
                        //eslint-disable-line eqeqeq
                        if (code == "shipping") {

                            location.reload();


                        }
                        element.isVisible(true);
                        bodyElem.animate({
                            scrollTop: $('#' + code).offset().top
                        }, 0, function () {
                            window.location = window.checkoutConfig.checkoutUrl + '#' + code;
                        });

                        if (scrollToElementId && $('#' + scrollToElementId).length) {
                            bodyElem.animate({
                                scrollTop: $('#' + scrollToElementId).offset().top
                            }, 0);
                        }

                    }
                } else {
                    element.isVisible(false);
                }

            });
        },

        /**
         * Sets window location hash.
         *
         * @param {String} hash
         */
        setHash: function (hash) {
            window.location.hash = hash;
        },

        /**
         * Next step.
         */
        next: function () {
            var self = this;
            var quoteType = self.getUrlParams('type');
            var activeIndex = 0,
                code;

            steps().sort(this.sortItems).forEach(function (element, index) {
                if (element.isVisible()) {
                    element.isVisible(false);
                    activeIndex = index;
                }
            });

            if (steps().length > activeIndex + 1) {
                code = steps()[activeIndex + 1].code;
                if (code === 'confirmation-step' && quoteType !== 'quote') {
                    $('#erppriceupdate > div > button').css("display", "none");
                    $('#shipping-method-buttons-container > div > button').css("display", "block");
                    self.navigateToReviewStep();
                }
                if (code === 'confirmation-step' && quoteType === 'quote') {
                    $('#erppriceupdate > div > button').css("display", "none");
                    $('#shipping-method-buttons-container > div > button').css("display", "block");
                    self.quotepriceupdate();
                }
                steps()[activeIndex + 1].isVisible(true);
                this.setHash(code);
                document.body.scrollTop = document.documentElement.scrollTop = 0;
            }
        },
        quotepriceupdate: function () {


            var refreshIntervaltime_shiptoupdate= setInterval(shiptoupdateprice, 1000);
            function shiptoupdateprice() {
                if ($(".ddierpupdate").length > 0) {
                    clearInterval(refreshIntervaltime_shiptoupdate);
                }                


            var priceformat = window.checkoutConfig.basePriceFormat.pattern;
            if (priceformat.includes("%s")) {
                priceformat = priceformat.replace("%s", "");
            }
            $('.total-change-info').text(" ");

            var taxAmount = "$0.00";
            if(window.checkoutConfig.checkoutReviewData.orderDetails.taxTotal){
                taxAmount = window.checkoutConfig.checkoutReviewData.orderDetails.taxTotal;
            }
            if (taxAmount.includes("$")) {
                taxAmount = taxAmount.replace("$", "");
            }
            var taxAmt = "";
            taxAmt = priceformat + taxAmount;
            var taxHtml = '<tr class="totals shipping excl ddierpupdate"><th class="mark" scope="row"><span class="label">Tax</span></th><td class="amount"><span class="price" data-th="Shipping">' + taxAmt + '</span></td></tr>';
            $('.opc-block-summary .table-totals .grand.totals').before(taxHtml);
            var amount = "$0.00";
            if( window.checkoutConfig.checkoutReviewData.orderDetails.orderTotal){
                amount = window.checkoutConfig.checkoutReviewData.orderDetails.orderTotal;
                }
            if (amount.includes("$")) {
                amount = amount.replace("$", "");
            }
            var Totalamount = "";
            Totalamount = priceformat + amount;
            $('.opc-block-summary .table-totals .grand.totals .amount .price').text(Totalamount);
                var merchandiseTotal ="$0.00";
                if(window.checkoutConfig.checkoutReviewData.orderDetails.merchandiseTotal){
                    merchandiseTotal = window.checkoutConfig.checkoutReviewData.orderDetails.merchandiseTotal;
                }
             $('.opc-block-summary .table-totals .totals.sub .amount .price').text(merchandiseTotal);

            console.log("price update");

            var shipto = getCookie("ship-to");
            if (shipto == "changed") {
                $('.opc-block-summary .title').append("<br/><span class='total-change-info' >The price for item(s) in your cart has changed based on shipping destination.</span>");
            }

            function getCookie(cookieName) {
                var name = cookieName + "=";
                var allCookieArray = document.cookie.split(';');
                for (var i = 0; i < allCookieArray.length; i++) {
                    var temp = allCookieArray[i].trim();
                    if (temp.indexOf(name) == 0)
                        return temp.substring(name.length, temp.length);
                }
                return "";
            }
        }
         var refreshIntervaltime_taxlable= setInterval(taxlableremove, 1000);
            function taxlableremove() {
                if ($(".ddierpupdate").length > 1) {
                       $(".ddierpupdate:not(:first)").remove();
                   // clearInterval(refreshIntervaltime_taxlable);

                }
            }


        },
        navigateToReviewStep: function () {
            $('body').loader('show');
              var refreshIntervaltime_shiptoupdate= setInterval(shiptoupdateprice, 1000);
            function shiptoupdateprice() {
              if ($(".ddierpupdate").length > 0) {
                    clearInterval(refreshIntervaltime_shiptoupdate);

                } 
                 var priceformat = window.checkoutConfig.basePriceFormat.pattern;
            if (priceformat.includes("%s")) {
                priceformat = priceformat.replace("%s", "");
            }
            $('.total-change-info').text(" ");

                var taxAmount = "$0.00";
                if(window.checkoutConfig.checkoutReviewData.orderDetails.taxTotal){
                    taxAmount = window.checkoutConfig.checkoutReviewData.orderDetails.taxTotal;
                }
            if (taxAmount.includes("$")) {
                taxAmount = taxAmount.replace("$", "");
            }
            var taxAmt = "";
            taxAmt = priceformat + taxAmount;
            console.log(taxAmt);
            var taxHtml = '<tr class="totals shipping excl ddierpupdate"><th class="mark" scope="row"><span class="label">Tax</span></th><td class="amount"><span class="price" data-th="Shipping">' + taxAmt + '</span></td></tr>';
            $('.opc-block-summary .table-totals .grand.totals').before(taxHtml);
            console.log(taxHtml);
                $(".totals shipping excl:not(:first)").remove();
                var amount = "$0.00";
                if( window.checkoutConfig.checkoutReviewData.orderDetails.orderTotal){
                    amount = window.checkoutConfig.checkoutReviewData.orderDetails.orderTotal;
                }
            if (amount.includes("$")) {
                amount = amount.replace("$", "");
            }
            var Totalamount = "";
            Totalamount = priceformat + amount;
            console.log(Totalamount);
            $('.opc-block-summary .table-totals .grand.totals .amount .price').text(Totalamount);
            var merchandiseTotal ="$0.00";
            if(window.checkoutConfig.checkoutReviewData.orderDetails.merchandiseTotal){
                    merchandiseTotal = window.checkoutConfig.checkoutReviewData.orderDetails.merchandiseTotal;
                }
             $('.opc-block-summary .table-totals .totals.sub .amount .price').text(merchandiseTotal);

            console.log("price update");
            $('.total-change-info').text(" ");
            var shipto = getCookie("ship-to");
            if (shipto == "changed") {
                $('.opc-block-summary .title').append("<br/><span class='total-change-info' >The price for item(s) in your cart has changed based on shipping destination.</span>");
            }
           $('body').loader('hide');
            function getCookie(cookieName) {
                var name = cookieName + "=";
                var allCookieArray = document.cookie.split(';');
                for (var i = 0; i < allCookieArray.length; i++) {
                    var temp = allCookieArray[i].trim();
                    if (temp.indexOf(name) == 0)
                        return temp.substring(name.length, temp.length);
                }
                return "";
            }

            }

             var refreshIntervaltime_taxlable= setInterval(taxlableremove, 1000);
            function taxlableremove() {
                if ($(".ddierpupdate").length > 1) {
                       $(".ddierpupdate:not(:first)").remove();
                    //clearInterval(refreshIntervaltime_taxlable);
                }
            }


            var serviceurl1 = urlBuilder.build('dckapcheckout/index/transportkey');
            var quote_id = quote.getQuoteId();
            var taxAmount = "$0.00";
            if(window.checkoutConfig.checkoutReviewData.orderDetails.taxTotal){
                taxAmount = window.checkoutConfig.checkoutReviewData.orderDetails.taxTotal;
            }
            if (taxAmount.includes("$")) {
                taxAmount = taxAmount.replace("$", "");
            }
            var amount = "$0.00";
            if( window.checkoutConfig.checkoutReviewData.orderDetails.orderTotal){
                amount = window.checkoutConfig.checkoutReviewData.orderDetails.orderTotal;
            }
            if (amount.includes("$")) {
                amount = amount.replace("$", "");
            }
            console.log(quote_id);
            console.log(taxAmount);
            console.log(amount);

            $.ajax({
                url: serviceurl1,
                type: 'POST',
                data: "quote_id=" + quote_id + "&tax_amount=" + taxAmount + "&amount=" + amount,
                dataType: 'JSON',
                global: false,
                showLoader: true,
                success: function (data) {
                    console.log(data);
                    var iframeUrl = "https://transport.merchantware.net/v4/transportweb.aspx?transportKey=" + data.success.key.TransportKey;
                    var $iframe = $('#iframe_transaction');
                    $iframe.attr('src', iframeUrl);
                    return iframeUrl;
                }
            });
            // stepNavigator.next();
            $('form.before-review').hide();
            $('form.after-review').show();
            // self.navigateToPayment();


        },

        compareKeyValuePair: function (pair, param) {
            var key_value = pair.split('=');
            var decodedKey = decodeURIComponent(key_value[0]);
            var decodedValue = decodeURIComponent(key_value[1]);
            if (decodedKey == param) return decodedValue;
            return null;
        },

        getUrlParams: function (param) {
            var self = this;
            var search = window.location.search.substring(1);
            var quoteType = null;
            if (search.indexOf('&') > -1) {
                var params = search.split('&');
                for (var i = 0; i < params.length; i++) {
                    quoteType = self.compareKeyValuePair(params[i], param);
                    if (quoteType !== null) {
                        break;
                    }
                }
            } else {
                quoteType = self.compareKeyValuePair(search, param);
            }
            return quoteType;
        }
    };
});
