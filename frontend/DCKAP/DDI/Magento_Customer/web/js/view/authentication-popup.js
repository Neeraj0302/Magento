/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

define([
    'jquery',
    'ko',
    'Magento_Ui/js/form/form',
    'Magento_Customer/js/action/login',
    'Magento_Customer/js/customer-data',
    'Magento_Customer/js/model/authentication-popup',
    'mage/translate',
    'mage/url',
    'Magento_Ui/js/modal/alert',
    'mage/validation',
    'Magento_Ui/js/modal/modal'
], function ($, ko, Component, loginAction, customerData, authenticationPopup, $t, url, alert, validation, modal) {
    'use strict';

    return Component.extend({
        registerUrl: window.authenticationPopup.customerRegisterUrl,
        forgotPasswordUrl: window.authenticationPopup.customerForgotPasswordUrl,
        autocomplete: window.authenticationPopup.autocomplete,
        isB2c: window.authenticationPopup.is_b2c,
        modalWindow: null,
        isLoading: ko.observable(false),

        defaults: {
            template: 'Magento_Customer/authentication-popup'
        },

        /**
         * Init
         */
        initialize: function () {
            var self = this;

            this._super();
            url.setBaseUrl(window.authenticationPopup.baseUrl);
            loginAction.registerLoginCallback(function () {
                self.isLoading(false);
            });

        },

        checkIsB2c: function() {
            var self = this;
            if (self.isB2c === '0') {
                return false;
            }
            return true;
        },

        /** Init popup login window */
        setModalElement: function (element) {
            if (authenticationPopup.modalWindow == null) {
                authenticationPopup.createPopUp(element);
            }
        },

        /** Is login form enabled for current customer */
        isActive: function () {
            var customer = customerData.get('customer');

            return customer() == false; //eslint-disable-line eqeqeq
        },

        /** Show login popup window */
        showModal: function () {
            if (this.modalWindow) {
                $(this.modalWindow).modal('openModal');
            } else {
                alert({
                    content: $t('Guest checkout is disabled.')
                });
            }
        },

        /**
         * Provide login action
         *
         * @return {Boolean}
         */
        login: function (formUiElement, event) {
            var self = this;
            var loginData = {},
                formElement = $(event.currentTarget),
                formDataArray = formElement.serializeArray();

            event.stopPropagation();
            formDataArray.forEach(function (entry) {
                loginData[entry.name] = entry.value;
            });

            if (formElement.validation() &&
                formElement.validation('isValid')
            ) {

                var multiaccount = self.multiAccountLogin(loginData);

                if (multiaccount) {
                    this.isLoading(true);
                    loginAction(loginData);
                }
            }

            return false;
        },

        multiAccountLogin: function(loginData) {
            var self = this;
            var email = loginData.username;
            var password = loginData.password;
            var serviceurl = url.build('multiaccount/index/index');
            $.ajax({
                url: serviceurl,
                type: 'POST',
                data: "email=" + email + "&password=" + password,
                dataType: 'JSON',
                global: false,
                showLoader: true,
                success: function (res) {
                    if(res.data){
                        // $(authenticationPopup.modalWindow).modal('closeModal');
                        $(document).find('.popup-authentication .action-close').trigger('click');
                        $('.multi-account-login-ajax tbody').html(res.data);
                        var multiAccountPopup = {
                            type: 'popup',
                            responsive: true,
                            innerScroll: true,
                            buttons: false,
                            title: "Select Company Account",
                            modalClass: "popup-center",
                            clickableOverlay: true,
                            heightStyle: "content",
                            content: ""
                        };
                        modal(multiAccountPopup, $('.multi-account-login-ajax'));
                        $('.multi-account-login-ajax').trigger('openModal').on('modalclosed', function () {
                            window.location.href = url.build('customer/account/login/');
                        });
                    } else {
                        var errMsg = '<div role="alert" class="message message-error error"><div data-ui-id="checkout-cart-validationmessages-message-error">'+res.msg+'</div></div>';
                        $(document).find(".modal-popup.popup-authentication .block-customer-login .messages").html(errMsg);
                    }
                }
            });
            return false;
        }
    });
});
